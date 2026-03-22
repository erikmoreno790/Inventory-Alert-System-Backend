const pool = require('../config/db');
const MovimientoModel = require('../models/movimientoModel');
const logger = require('../config/logger');

const CotizacionInventarioService = {
    /**
     * Validar disponibilidad de stock para items de cotización
     * @param {Array} items - Items de la cotización
     * @returns {Object} - { valid: boolean, errors: [] }
     */
    async validarDisponibilidad(items) {
        const errors = [];

        // Collect all unique references in a single batch query
        const referencias = [...new Set(items.filter(i => i.referencia).map(i => i.referencia))];
        if (referencias.length === 0) return { valid: true, errors: [] };

        let repuestosMap = {};
        try {
            const { rows } = await pool.query(
                `SELECT repuesto_id, nombre, categoria, stock, referencia 
                 FROM repuestos 
                 WHERE referencia = ANY($1)`,
                [referencias]
            );
            for (const r of rows) {
                repuestosMap[r.referencia] = r;
            }
        } catch (error) {
            logger.logError('Error batch validando disponibilidad', error);
            return { valid: false, errors: [{ error: 'Error al consultar inventario' }] };
        }

        for (const item of items) {
            if (!item.referencia) continue;
            const repuesto = repuestosMap[item.referencia];
            if (!repuesto) continue; // Not a controlled part

            if (repuesto.stock < item.cantidad) {
                errors.push({
                    item: item.descripcion,
                    referencia: item.referencia,
                    solicitado: item.cantidad,
                    disponible: repuesto.stock,
                    faltante: item.cantidad - repuesto.stock
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Vincular items de cotización con repuestos del inventario
     * @param {Array} items - Items de la cotización
     * @returns {Array} - Items con repuesto_id agregado
     */
    async vincularRepuestos(items) {
        // Batch query all references at once
        const referencias = [...new Set(items.filter(i => i.referencia).map(i => i.referencia))];
        let repuestosMap = {};

        if (referencias.length > 0) {
            try {
                const { rows } = await pool.query(
                    `SELECT repuesto_id, categoria, referencia 
                     FROM repuestos 
                     WHERE referencia = ANY($1)`,
                    [referencias]
                );
                for (const r of rows) {
                    repuestosMap[r.referencia] = r;
                }
            } catch (error) {
                logger.logError('Error batch vinculando repuestos', error);
            }
        }

        return items.map(item => {
            const itemVinculado = { ...item };
            if (item.referencia && repuestosMap[item.referencia]) {
                // Solo asignar repuesto_id si el item no tiene uno del frontend
                if (!itemVinculado.repuesto_id) {
                    itemVinculado.repuesto_id = repuestosMap[item.referencia].repuesto_id;
                }
                itemVinculado.categoria = repuestosMap[item.referencia].categoria;
            }
            return itemVinculado;
        });
    },

    /**
     * Procesar salida de inventario al aprobar cotización
     * @param {Number} idCotizacion - ID de la cotización aprobada
     * @param {Number} idUsuario - ID del usuario que aprueba
     */
    async procesarSalidaInventario(idCotizacion, idUsuario = null, externalClient = null) {
        const ownClient = !externalClient;
        const client = externalClient || await pool.connect();

        try {
            if (ownClient) await client.query('BEGIN');

            // Obtener datos de la cotización
            const cotizacionRes = await client.query(
                `SELECT fecha, nombre_cliente, vehiculo, placa, estatus, inventario_procesado
                 FROM cotizaciones 
                 WHERE id_cotizacion = $1`,
                [idCotizacion]
            );

            if (cotizacionRes.rows.length === 0) {
                throw new Error('Cotización no encontrada');
            }

            const cotizacion = cotizacionRes.rows[0];

            // Validar que está aprobada
            if (cotizacion.estatus !== 'Aprobada') {
                throw new Error('Solo se puede procesar inventario de cotizaciones aprobadas');
            }

            // Validar que no se haya procesado antes
            if (cotizacion.inventario_procesado) {
                logger.logInfo(`Cotización ${idCotizacion} ya tiene inventario procesado`);
                return {
                    procesado: false,
                    mensaje: 'El inventario ya fue procesado anteriormente'
                };
            }

            // Obtener items vinculados a repuestos
            const itemsRes = await client.query(
                `SELECT id_cotizacion_item, repuesto_id, descripcion, cantidad, referencia
                 FROM cotizacion_items 
                 WHERE id_cotizacion = $1 AND repuesto_id IS NOT NULL AND stock_afectado = FALSE`,
                [idCotizacion]
            );

            const movimientosCreados = [];

            // Crear salida para cada item
            for (const item of itemsRes.rows) {
                try {
                    // Crear movimiento de salida (reusar la transacción)
                    const movimiento = await MovimientoModel.create({
                        repuesto_id: item.repuesto_id,
                        tipo: 'Salida',
                        motivo: 'venta',
                        cantidad: item.cantidad,
                        fecha: cotizacion.fecha,
                        destino: `${cotizacion.nombre_cliente} - ${cotizacion.placa}`,
                        observacion: `Venta - Cotización #${idCotizacion}`,
                        id_usuario: idUsuario,
                        cotizacion_id: idCotizacion,
                        cliente: cotizacion.nombre_cliente,
                        vehiculo: cotizacion.vehiculo,
                        placa: cotizacion.placa
                    }, client);

                    // Marcar item como procesado
                    await client.query(
                        `UPDATE cotizacion_items 
                         SET stock_afectado = TRUE 
                         WHERE id_cotizacion_item = $1`,
                        [item.id_cotizacion_item]
                    );

                    movimientosCreados.push({
                        item: item.descripcion,
                        cantidad: item.cantidad,
                        movimiento_id: movimiento.movimiento_id
                    });

                } catch (error) {
                    logger.logError(`Error creando salida para item ${item.id_cotizacion_item}`, error);
                    throw error;
                }
            }

            // Marcar cotización como procesada
            await client.query(
                `UPDATE cotizaciones 
                 SET inventario_procesado = TRUE 
                 WHERE id_cotizacion = $1`,
                [idCotizacion]
            );

            if (ownClient) await client.query('COMMIT');

            return {
                procesado: true,
                movimientos: movimientosCreados,
                mensaje: `Se procesaron ${movimientosCreados.length} salidas de inventario`
            };

        } catch (error) {
            if (ownClient) await client.query('ROLLBACK');
            logger.logError(`Error procesando inventario de cotización ${idCotizacion}`, error);
            throw error;
        } finally {
            if (ownClient) client.release();
        }
    },

    /**
     * Revertir salida de inventario (si se rechaza una cotización aprobada)
     * @param {Number} idCotizacion - ID de la cotización
     */
    async revertirSalidaInventario(idCotizacion, externalClient = null) {
        const ownClient = !externalClient;
        const client = externalClient || await pool.connect();

        try {
            if (ownClient) await client.query('BEGIN');

            // Buscar movimientos relacionados con esta cotización
            const movimientosRes = await client.query(
                `SELECT m.movimiento_id 
                 FROM movimientos_inventario m
                 WHERE m.cotizacion_id = $1 AND m.tipo = 'Salida'`,
                [idCotizacion]
            );

            // Eliminar cada movimiento (reusar la transacción)
            for (const mov of movimientosRes.rows) {
                await MovimientoModel.delete(mov.movimiento_id, client);
            }

            // Resetear flags
            await client.query(
                `UPDATE cotizacion_items 
                 SET stock_afectado = FALSE 
                 WHERE id_cotizacion = $1`,
                [idCotizacion]
            );

            await client.query(
                `UPDATE cotizaciones 
                 SET inventario_procesado = FALSE 
                 WHERE id_cotizacion = $1`,
                [idCotizacion]
            );

            if (ownClient) await client.query('COMMIT');

            return {
                revertido: true,
                mensaje: `Se revirtieron ${movimientosRes.rows.length} movimientos`
            };

        } catch (error) {
            if (ownClient) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (ownClient) client.release();
        }
    }
};

module.exports = CotizacionInventarioService;
