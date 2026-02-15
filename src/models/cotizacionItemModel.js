const pool = require('../config/db');

const CotizacionItem = {
    async getByCotizacionId(idCotizacion, queryRunner = null) {
        const db = queryRunner || pool;
        const { rows } = await db.query(
            `SELECT ci.*
             FROM cotizacion_items ci
             WHERE ci.id_cotizacion = $1`,
            [idCotizacion]
        );
        return rows;
    },

    async create(data, queryRunner = null) {
        const db = queryRunner || pool;
        const {
            id_cotizacion,
            descripcion,
            cantidad,
            precio_unitario,
            total,
            repuesto_id = null,
            referencia = null,
            stock_afectado = false
        } = data;
        const { rows } = await db.query(
            `INSERT INTO cotizacion_items 
             (id_cotizacion, descripcion, cantidad, precio_unitario, total, repuesto_id, referencia, stock_afectado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [id_cotizacion, descripcion, cantidad, precio_unitario, total, repuesto_id, referencia, stock_afectado]
        );
        return rows[0];
    },

    async update(id, data, queryRunner = null) {
        const db = queryRunner || pool;
        const {
            id_cotizacion,
            descripcion,
            cantidad,
            precio_unitario,
            total,
            repuesto_id,
            referencia,
            stock_afectado
        } = data;
        const { rows } = await db.query(
            `UPDATE cotizacion_items 
             SET id_cotizacion=$1, descripcion=$2, cantidad=$3, precio_unitario=$4, total=$5,
                 repuesto_id=$6, referencia=$7, stock_afectado=$8
             WHERE id_cotizacion_item=$9 RETURNING *`,
            [id_cotizacion, descripcion, cantidad, precio_unitario, total, repuesto_id, referencia, stock_afectado, id]
        );
        return rows[0];
    },

    async delete(id, queryRunner = null) {
        const db = queryRunner || pool;
        await db.query('DELETE FROM cotizacion_items WHERE id_cotizacion_item=$1', [id]);
        return { message: 'Item eliminado' };
    },

    async getApprovedItemsReportByDate(fechaInicio, fechaFin) {
        const { rows } = await pool.query(
            `SELECT ci.descripcion,
                    SUM(ci.cantidad) AS total_cantidad,
                    SUM(ci.total) AS total_valor
             FROM cotizacion_items ci
             JOIN cotizaciones c ON ci.id_cotizacion = c.id_cotizacion
             WHERE c.estatus = 'Aprobada'
               AND c.fecha BETWEEN $1 AND $2
             GROUP BY ci.descripcion
             ORDER BY total_cantidad DESC`,
            [fechaInicio, fechaFin]
        );
        return rows;
    },

    async getByRepuestoId(repuestoId) {
        const { rows } = await pool.query(
            `SELECT ci.*, c.estatus, c.fecha, c.nombre_cliente
             FROM cotizacion_items ci
             JOIN cotizaciones c ON ci.id_cotizacion = c.id_cotizacion
             WHERE ci.repuesto_id = $1
             ORDER BY c.fecha DESC
             LIMIT 100`,
            [repuestoId]
        );
        return rows;
    },

    async marcarStockAfectado(idItem, afectado = true) {
        const { rows } = await pool.query(
            `UPDATE cotizacion_items 
             SET stock_afectado = $1 
             WHERE id_cotizacion_item = $2 
             RETURNING *`,
            [afectado, idItem]
        );
        return rows[0];
    },

    async getItemsSinAfectar(idCotizacion) {
        const { rows } = await pool.query(
            `SELECT * FROM cotizacion_items 
             WHERE id_cotizacion = $1 AND stock_afectado = false`,
            [idCotizacion]
        );
        return rows;
    },

    async findById(id) {
        const { rows } = await pool.query(
            `SELECT ci.*, r.nombre AS repuesto_nombre, r.stock AS stock_disponible
             FROM cotizacion_items ci
             LEFT JOIN repuestos r ON ci.repuesto_id = r.repuesto_id
             WHERE ci.id_cotizacion_item = $1`,
            [id]
        );
        return rows[0];
    }
};

module.exports = CotizacionItem;
