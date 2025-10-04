const pool = require('../config/db');

const CotizacionItem = {
    async getByCotizacionId(idCotizacion) {
        const { rows } = await pool.query(
            `SELECT ci.*
             FROM cotizacion_items ci
             WHERE ci.id_cotizacion = $1`,
            [idCotizacion]
        );
        return rows;
    },

    async create(data) {
        const { id_cotizacion, descripcion, cantidad, precio_unitario, total } = data;
        const { rows } = await pool.query(
            `INSERT INTO cotizacion_items (id_cotizacion, descripcion, cantidad, precio_unitario, total)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id_cotizacion, descripcion, cantidad, precio_unitario, total]
        );
        return rows[0];
    },

    async update(id, data) {
        const { id_cotizacion, descripcion, cantidad, precio_unitario, total } = data;
        const { rows } = await pool.query(
            `UPDATE cotizacion_items 
             SET id_cotizacion=$1, descripcion=$2, cantidad=$3, precio_unitario=$4, total=$5
             WHERE id_cotizacion_item=$6 RETURNING *`,
            [id_cotizacion, descripcion, cantidad, precio_unitario, total, id]
        );
        return rows[0];
    },

    async delete(id) {
        await pool.query('DELETE FROM cotizacion_items WHERE id_cotizacion_item=$1', [id]);
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
    }
};

module.exports = CotizacionItem;
