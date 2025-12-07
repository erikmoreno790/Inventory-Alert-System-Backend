const pool = require('../config/db');
const MovimientoModel = require('../models/movimientoModel');
const logger = require('../config/logger');

// Categorías que afectan inventario
const CATEGORIAS_INVENTARIO = ['Amortiguador', 'Disco', 'Campana'];

const CotizacionInventarioService = {
    /**
     * Validar disponibilidad de stock para items de cotización
     * @param {Array} items - Items de la cotización
     * @returns {Object} - { valid: boolean, errors: [] }
     */
    async validarDisponibilidad(items) {
        const errors = [];

        for (const item of items) {
            // Solo validar si tiene referencia (vinculado a repuesto)
            if (!item.referencia) continue;

            try {
                // Buscar repuesto por referencia
                const { rows } = await pool.query(
                    `SELECT repuesto_id, nombre, categoria, stock 
                     FROM repuestos 
                     WHERE referencia = $1 AND categoria = ANY($2)`,
                    [item.referencia, CATEGORIAS_INVENTARIO]
                );

                if (rows.length === 0) {
                    // No es un repuesto controlado o no existe
                    continue;
                }

                const repuesto = rows[0];

                // Validar stock suficiente
                if (repuesto.stock < item.cantidad) {
                    errors.push({
                        item: item.descripcion,
                        referencia: item.referencia,
                        solicitado: item.cantidad,
                        disponible: repuesto.stock,
                        faltante: item.cantidad - repuesto.stock
                    });
                }
            } catch (error) {
                logger.logError(`Error validando disponibilidad para ${item.referencia}`, error);
                errors.push({
                    item: item.descripcion,
                    referencia: item.referencia,
                    error: 'Error al consultar inventario'
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
        const itemsVinculados = [];

        for (const item of items) {
            const itemVinculado = { ...item };

            // Solo vincular si tiene referencia
            if (item.referencia) {
                try {
                    const { rows } = await pool.query(
                        `SELECT repuesto_id, categoria 
                         FROM repuestos 
                         WHERE referencia = $1 AND categoria = ANY($2)`,
                        [item.referencia, CATEGORIAS_INVENTARIO]
                    );

                    if (rows.length > 0) {
                        itemVinculado.repuesto_id = rows[0].repuesto_id;
                        itemVinculado.categoria = rows[0].categoria;
                    }
                } catch (error) {
                    logger.logError(`Error vinculando repuesto ${item.referencia}`, error);
                }
            }

            itemsVinculados.push(itemVinculado);
        }

        return itemsVinculados;
    },

    /**
     * Procesar salida de inventario al aprobar cotización
     * @param {Number} idCotizacion - ID de la cotización aprobada
     * @param {Number} idUsuario - ID del usuario que aprueba
     */
    async procesarSalidaInventario(idCotizacion, idUsuario = null) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

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
                    // Crear movimiento de salida
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
                    });

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

            await client.query('COMMIT');

            return {
                procesado: true,
                movimientos: movimientosCreados,
                mensaje: `Se procesaron ${movimientosCreados.length} salidas de inventario`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.logError(`Error procesando inventario de cotización ${idCotizacion}`, error);
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Revertir salida de inventario (si se rechaza una cotización aprobada)
     * @param {Number} idCotizacion - ID de la cotización
     */
    async revertirSalidaInventario(idCotizacion) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Buscar movimientos relacionados con esta cotización
            const movimientosRes = await client.query(
                `SELECT m.movimiento_id 
                 FROM movimientos_inventario m
                 WHERE m.cotizacion_id = $1 AND m.tipo = 'Salida'`,
                [idCotizacion]
            );

            // Eliminar cada movimiento (esto revertirá el stock automáticamente)
            for (const mov of movimientosRes.rows) {
                await MovimientoModel.delete(mov.movimiento_id);
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

            await client.query('COMMIT');

            return {
                revertido: true,
                mensaje: `Se revirtieron ${movimientosRes.rows.length} movimientos`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = CotizacionInventarioService;
