const pool = require('../config/db');
const logger = require('../config/logger');

const MovimientoModel = {
    /**
     * Crear un nuevo movimiento (Entrada o Salida)
     * @param {Object} data - Datos del movimiento
     * @returns {Object} - Movimiento creado
     */
    async create(data) {
        const {
            repuesto_id,
            tipo, // 'Entrada' o 'Salida'
            motivo, // compra, devolucion, ajuste, venta, uso, creacion, otro
            cantidad,
            fecha = new Date(),
            proveedor = null,
            factura = null,
            destino = null,
            observacion = null,
            id_usuario = null,
            cotizacion_id = null,
            cliente = null,
            vehiculo = null,
            placa = null
        } = data;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Insertar movimiento
            const insertQuery = `
        INSERT INTO movimientos_inventario 
          (repuesto_id, tipo, motivo, cantidad, fecha, proveedor, factura, destino, observacion, id_usuario, cotizacion_id, cliente, vehiculo, placa)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `;

            const values = [
                repuesto_id,
                tipo,
                motivo,
                cantidad,
                fecha,
                proveedor,
                factura,
                destino,
                observacion,
                id_usuario,
                cotizacion_id,
                cliente,
                vehiculo,
                placa
            ];

            const { rows } = await client.query(insertQuery, values);
            const movimiento = rows[0];

            // Actualizar stock del repuesto
            if (tipo === 'Entrada') {
                await client.query(
                    'UPDATE repuestos SET stock = stock + $1 WHERE repuesto_id = $2;',
                    [cantidad, repuesto_id]
                );
            } else if (tipo === 'Salida') {
                const updateResult = await client.query(
                    'UPDATE repuestos SET stock = stock - $1 WHERE repuesto_id = $2 AND stock >= $1 RETURNING stock;',
                    [cantidad, repuesto_id]
                );

                if (updateResult.rows.length === 0) {
                    throw new Error('Stock insuficiente para realizar la salida');
                }
            }

            await client.query('COMMIT');
            return movimiento;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Obtener todos los movimientos con filtros y paginación
     */
    async findAll(filters = {}) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (filters.repuesto_id) {
            whereConditions.push(`m.repuesto_id = $${paramIndex}`);
            queryParams.push(filters.repuesto_id);
            paramIndex++;
        }

        if (filters.tipo) {
            whereConditions.push(`m.tipo = $${paramIndex}`);
            queryParams.push(filters.tipo);
            paramIndex++;
        }

        if (filters.motivo) {
            whereConditions.push(`LOWER(m.motivo) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.motivo.toLowerCase()}%`);
            paramIndex++;
        }

        if (filters.categoria) {
            whereConditions.push(`LOWER(r.categoria) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.categoria.toLowerCase()}%`);
            paramIndex++;
        }

        if (filters.producto) {
            whereConditions.push(`LOWER(r.nombre) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.producto.toLowerCase()}%`);
            paramIndex++;
        }

        if (filters.referencia) {
            whereConditions.push(`LOWER(r.referencia) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.referencia.toLowerCase()}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
      SELECT 
        m.movimiento_id,
        m.repuesto_id,
        r.nombre AS producto,
        r.referencia,
        r.categoria,
        m.tipo,
        m.motivo,
        m.cantidad,
        m.fecha,
        m.proveedor,
        m.factura,
        m.destino,
        m.observacion,
        m.id_usuario,
        u.nombre AS nombre_usuario
      FROM movimientos_inventario m
      LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
      LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
      ${whereClause}
      ORDER BY m.fecha DESC;
    `;

        const { rows } = await pool.query(query, queryParams);
        return rows;
    },

    /**
     * Obtener un movimiento por ID
     */
    async findById(id) {
        const query = `
      SELECT 
        m.*,
        r.nombre AS repuesto_nombre,
        r.referencia,
        r.categoria,
        u.nombre AS nombre_usuario
      FROM movimientos_inventario m
      LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
      LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
      WHERE m.movimiento_id = $1;
    `;
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Actualizar un movimiento
     * IMPORTANTE: Al actualizar cantidad, recalcular el stock
     */
    async update(id, data) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Obtener movimiento actual
            const movimientoActual = await this.findById(id);
            if (!movimientoActual) {
                throw new Error('Movimiento no encontrado');
            }

            const { cantidad, fecha, proveedor, factura, destino, observacion, motivo } = data;

            // Calcular diferencia de stock
            const diferencia = cantidad - movimientoActual.cantidad;

            // Actualizar movimiento
            const updateQuery = `
        UPDATE movimientos_inventario 
        SET cantidad = $1, fecha = $2, proveedor = $3, factura = $4, 
            destino = $5, observacion = $6, motivo = $7, updated_at = NOW()
        WHERE movimiento_id = $8
        RETURNING *;
      `;

            const values = [
                cantidad,
                fecha || movimientoActual.fecha,
                proveedor !== undefined ? proveedor : movimientoActual.proveedor,
                factura !== undefined ? factura : movimientoActual.factura,
                destino !== undefined ? destino : movimientoActual.destino,
                observacion !== undefined ? observacion : movimientoActual.observacion,
                motivo || movimientoActual.motivo,
                id
            ];

            const { rows } = await client.query(updateQuery, values);

            // Ajustar stock si cambió la cantidad
            if (diferencia !== 0) {
                if (movimientoActual.tipo === 'Entrada') {
                    await client.query(
                        'UPDATE repuestos SET stock = stock + $1 WHERE repuesto_id = $2;',
                        [diferencia, movimientoActual.repuesto_id]
                    );
                } else {
                    await client.query(
                        'UPDATE repuestos SET stock = stock - $1 WHERE repuesto_id = $2;',
                        [diferencia, movimientoActual.repuesto_id]
                    );
                }
            }

            await client.query('COMMIT');
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Eliminar un movimiento y ajustar stock
     */
    async delete(id) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const movimiento = await this.findById(id);
            if (!movimiento) {
                throw new Error('Movimiento no encontrado');
            }

            // Revertir el cambio en stock
            if (movimiento.tipo === 'Entrada') {
                await client.query(
                    'UPDATE repuestos SET stock = stock - $1 WHERE repuesto_id = $2;',
                    [movimiento.cantidad, movimiento.repuesto_id]
                );
            } else {
                await client.query(
                    'UPDATE repuestos SET stock = stock + $1 WHERE repuesto_id = $2;',
                    [movimiento.cantidad, movimiento.repuesto_id]
                );
            }

            // Eliminar movimiento
            await client.query('DELETE FROM movimientos_inventario WHERE movimiento_id = $1;', [id]);

            await client.query('COMMIT');
            return { message: 'Movimiento eliminado correctamente' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Obtener movimientos por cotización
     * @param {number} cotizacionId - ID de la cotización
     * @returns {Array} - Lista de movimientos
     */
    async findByCotizacionId(cotizacionId) {
        const query = `
            SELECT 
                m.*,
                r.nombre AS repuesto_nombre,
                r.referencia,
                r.categoria,
                u.nombre AS nombre_usuario
            FROM movimientos_inventario m
            LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
            LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
            WHERE m.cotizacion_id = $1
            ORDER BY m.fecha DESC
        `;
        const { rows } = await pool.query(query, [cotizacionId]);
        return rows;
    },

    /**
     * Obtener movimientos por cliente
     * @param {number} clienteId - ID del cliente
     * @returns {Array} - Lista de movimientos
     */
    async findByClienteId(clienteId) {
        const query = `
            SELECT 
                m.*,
                r.nombre AS repuesto_nombre,
                r.referencia,
                r.categoria,
                u.nombre AS nombre_usuario
            FROM movimientos_inventario m
            LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
            LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
            WHERE m.cliente_id = $1
            ORDER BY m.fecha DESC
        `;
        const { rows } = await pool.query(query, [clienteId]);
        return rows;
    },

    /**
     * Obtener movimientos por vehículo
     * @param {number} vehiculoId - ID del vehículo
     * @returns {Array} - Lista de movimientos
     */
    async findByVehiculoId(vehiculoId) {
        const query = `
            SELECT 
                m.*,
                r.nombre AS repuesto_nombre,
                r.referencia,
                r.categoria,
                u.nombre AS nombre_usuario
            FROM movimientos_inventario m
            LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
            LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
            WHERE m.vehiculo_id = $1
            ORDER BY m.fecha DESC
        `;
        const { rows } = await pool.query(query, [vehiculoId]);
        return rows;
    },

    /**
     * Obtener estadísticas de movimientos
     * @param {Object} filters - Filtros opcionales (fechaInicio, fechaFin, tipo)
     * @returns {Object} - Estadísticas de movimientos
     */
    async getEstadisticas(filters = {}) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (filters.fechaInicio) {
            whereConditions.push(`m.fecha >= $${paramIndex}`);
            queryParams.push(filters.fechaInicio);
            paramIndex++;
        }

        if (filters.fechaFin) {
            whereConditions.push(`m.fecha <= $${paramIndex}`);
            queryParams.push(filters.fechaFin);
            paramIndex++;
        }

        if (filters.tipo) {
            whereConditions.push(`m.tipo = $${paramIndex}`);
            queryParams.push(filters.tipo);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
            SELECT 
                COUNT(*) as total_movimientos,
                COUNT(*) FILTER (WHERE m.tipo = 'Entrada') as total_entradas,
                COUNT(*) FILTER (WHERE m.tipo = 'Salida') as total_salidas,
                SUM(m.cantidad) FILTER (WHERE m.tipo = 'Entrada') as cantidad_entradas,
                SUM(m.cantidad) FILTER (WHERE m.tipo = 'Salida') as cantidad_salidas,
                COUNT(DISTINCT m.repuesto_id) as repuestos_afectados
            FROM movimientos_inventario m
            ${whereClause}
        `;

        const { rows } = await pool.query(query, queryParams);
        return rows[0];
    },

    /**
     * Obtener movimientos por rango de fechas
     * @param {string} fechaInicio - Fecha de inicio
     * @param {string} fechaFin - Fecha de fin
     * @returns {Array} - Lista de movimientos
     */
    async findByDateRange(fechaInicio, fechaFin) {
        const query = `
            SELECT 
                m.*,
                r.nombre AS repuesto_nombre,
                r.referencia,
                r.categoria,
                u.nombre AS nombre_usuario
            FROM movimientos_inventario m
            LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
            LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
            WHERE m.fecha BETWEEN $1 AND $2
            ORDER BY m.fecha DESC
        `;
        const { rows } = await pool.query(query, [fechaInicio, fechaFin]);
        return rows;
    }
};

module.exports = MovimientoModel;
