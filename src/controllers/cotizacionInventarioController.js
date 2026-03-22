const pool = require('../config/db');
const CotizacionInventarioService = require('../services/cotizacionInventarioService');
const logger = require('../config/logger');

const CotizacionInventarioController = {
    /**
     * Aprobar cotización y procesar inventario
     */
    async aprobarCotizacion(req, res) {
        const { id } = req.params;
        const idUsuario = req.user?.id_usuario;

        try {
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Verificar que la cotización existe y está pendiente
                const cotizacionRes = await client.query(
                    'SELECT estatus, inventario_procesado FROM cotizaciones WHERE id_cotizacion = $1',
                    [id]
                );

                if (cotizacionRes.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: 'Cotización no encontrada' });
                }

                const cotizacion = cotizacionRes.rows[0];

                if (cotizacion.estatus === 'Aprobada') {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'La cotización ya está aprobada' });
                }

                if (cotizacion.estatus === 'Rechazada') {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'No se puede aprobar una cotización rechazada' });
                }

                // Actualizar estatus a Aprobada
                await client.query(
                    'UPDATE cotizaciones SET estatus = $1 WHERE id_cotizacion = $2',
                    ['Aprobada', id]
                );

                // Procesar inventario dentro de la misma transacción
                const resultado = await CotizacionInventarioService.procesarSalidaInventario(id, idUsuario, client);

                await client.query('COMMIT');

                res.json({
                    mensaje: 'Cotización aprobada exitosamente',
                    inventario: resultado
                });

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            logger.logError('Error aprobando cotización', error);
            res.status(500).json({
                error: 'Error al aprobar cotización',
                detalles: error.message
            });
        }
    },

    /**
     * Validar disponibilidad de stock para cotización
     */
    async validarStock(req, res) {
        try {
            const { items } = req.body;

            if (!items || !Array.isArray(items)) {
                return res.status(400).json({ error: 'Items inválidos' });
            }

            const validacion = await CotizacionInventarioService.validarDisponibilidad(items);

            res.json(validacion);

        } catch (error) {
            logger.logError('Error validando stock', error);
            res.status(500).json({
                error: 'Error al validar stock',
                detalles: error.message
            });
        }
    },

    /**
     * Ver movimientos relacionados con una cotización
     */
    async verMovimientos(req, res) {
        const { id } = req.params;

        try {
            const { rows } = await pool.query(
                `SELECT m.*, r.nombre as repuesto_nombre, r.referencia
                 FROM movimientos_inventario m
                 LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
                 WHERE m.cotizacion_id = $1
                 ORDER BY m.fecha DESC`,
                [id]
            );

            res.json(rows);

        } catch (error) {
            logger.logError('Error obteniendo movimientos de cotización', error);
            res.status(500).json({
                error: 'Error al obtener movimientos',
                detalles: error.message
            });
        }
    }
};

module.exports = CotizacionInventarioController;
