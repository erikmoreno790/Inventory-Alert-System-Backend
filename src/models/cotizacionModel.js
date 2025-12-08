const pool = require('../config/db');

/**
 * Modelo para gestión de cotizaciones
 * Compatible con las páginas del frontend: QuotationPage, EditQuotationPage, QuotationsHistoryPage
 */
const CotizacionModel = {
    /**
     * Obtener todas las cotizaciones con paginación y filtros
     * @param {number} page - Número de página
     * @param {number} limit - Límite de resultados por página
     * @param {object} filters - Filtros opcionales (nombre_cliente, placa, estatus, fecha)
     * @returns {object} - { data: [...], pagination: {...} }
     */
    async findAll(page = 1, limit = 50, filters = {}) {
        const offset = (page - 1) * limit;

        // Construir condiciones WHERE dinámicamente
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (filters.nombre_cliente) {
            whereConditions.push(`LOWER(nombre_cliente) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.nombre_cliente.toLowerCase()}%`);
            paramIndex++;
        }

        if (filters.placa) {
            whereConditions.push(`LOWER(placa) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.placa.toLowerCase()}%`);
            paramIndex++;
        }

        if (filters.estatus) {
            whereConditions.push(`LOWER(estatus) = $${paramIndex}`);
            queryParams.push(filters.estatus.toLowerCase());
            paramIndex++;
        }

        if (filters.fecha) {
            whereConditions.push(`fecha::text LIKE $${paramIndex}`);
            queryParams.push(`${filters.fecha}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Contar total con filtros
        const countQuery = `SELECT COUNT(*) FROM cotizaciones ${whereClause}`;
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);

        // Obtener cotizaciones paginadas con filtros
        const dataQuery = `
            SELECT * FROM cotizaciones 
            ${whereClause} 
            ORDER BY id_cotizacion DESC 
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const result = await pool.query(dataQuery, [...queryParams, limit, offset]);

        return {
            data: result.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Obtener una cotización por ID con sus items e imágenes
     * @param {number} id - ID de la cotización
     * @returns {object} - Cotización con items e imágenes
     */
    async findById(id) {
        // Buscar cotización
        const cotizacionRes = await pool.query(
            'SELECT * FROM cotizaciones WHERE id_cotizacion = $1',
            [id]
        );

        if (cotizacionRes.rows.length === 0) {
            return null;
        }

        const cotizacion = cotizacionRes.rows[0];

        // Buscar items asociados
        const itemsRes = await pool.query(
            'SELECT * FROM cotizacion_items WHERE id_cotizacion = $1',
            [id]
        );

        // Buscar imágenes asociadas
        const imagenesRes = await pool.query(
            'SELECT imagen_url FROM cotizacion_imagenes WHERE id_cotizacion = $1',
            [id]
        );

        // Armar respuesta
        cotizacion.items = itemsRes.rows;
        cotizacion.imagenes = imagenesRes.rows.map(img => img.imagen_url);

        return cotizacion;
    },

    /**
     * Crear una nueva cotización
     * @param {object} data - Datos de la cotización
     * @returns {object} - Cotización creada con su ID
     */
    async create(data) {
        const {
            fecha,
            nombre_cliente,
            nit_cc,
            telefono,
            vehiculo,
            placa,
            kilometraje,
            nombre_mecanico,
            segundo_mecanico,
            observaciones,
            estatus,
            porcentaje_descuento,
            descuento,
            subtotal,
            total
        } = data;

        const result = await pool.query(
            `INSERT INTO cotizaciones 
            (fecha, nombre_cliente, nit_cc, telefono, vehiculo, placa, kilometraje, 
             nombre_mecanico, segundo_mecanico, observaciones, estatus, 
             porcentaje_descuento, descuento, subtotal, total)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                fecha || new Date().toISOString().split('T')[0],
                nombre_cliente,
                nit_cc || null,
                telefono || null,
                vehiculo || null,
                placa,
                kilometraje ? Number(kilometraje) : null,
                nombre_mecanico || null,
                segundo_mecanico || null,
                observaciones || '',
                estatus || 'Pendiente',
                porcentaje_descuento || 0,
                descuento || 0,
                subtotal || 0,
                total || 0
            ]
        );

        return result.rows[0];
    },

    /**
     * Actualizar una cotización existente
     * @param {number} id - ID de la cotización
     * @param {object} data - Datos a actualizar
     * @returns {object} - Cotización actualizada
     */
    async update(id, data) {
        const {
            fecha,
            nombre_cliente,
            nit_cc,
            telefono,
            vehiculo,
            placa,
            kilometraje,
            nombre_mecanico,
            segundo_mecanico,
            observaciones,
            estatus,
            porcentaje_descuento,
            descuento,
            subtotal,
            total
        } = data;

        const result = await pool.query(
            `UPDATE cotizaciones SET
                fecha=$1, nombre_cliente=$2, nit_cc=$3, telefono=$4, vehiculo=$5, 
                placa=$6, kilometraje=$7, nombre_mecanico=$8, segundo_mecanico=$9, 
                observaciones=$10, estatus=$11, porcentaje_descuento=$12, 
                descuento=$13, subtotal=$14, total=$15
            WHERE id_cotizacion=$16
            RETURNING *`,
            [
                fecha,
                nombre_cliente,
                nit_cc || null,
                telefono || null,
                vehiculo || null,
                placa,
                kilometraje ? Number(kilometraje) : null,
                nombre_mecanico || null,
                segundo_mecanico || null,
                observaciones || '',
                estatus || 'Pendiente',
                porcentaje_descuento || 0,
                descuento || 0,
                subtotal || 0,
                total || 0,
                id
            ]
        );

        return result.rows[0];
    },

    /**
     * Eliminar una cotización
     * @param {number} id - ID de la cotización
     * @returns {object} - Cotización eliminada
     */
    async delete(id) {
        const result = await pool.query(
            'DELETE FROM cotizaciones WHERE id_cotizacion = $1 RETURNING *',
            [id]
        );

        return result.rows[0];
    },

    /**
     * Contar cotizaciones por estatus
     * @param {string} estatus - Estatus a contar
     * @returns {number} - Cantidad de cotizaciones
     */
    async countByEstatus(estatus) {
        const result = await pool.query(
            'SELECT COUNT(*) FROM cotizaciones WHERE LOWER(estatus) = LOWER($1)',
            [estatus]
        );

        return parseInt(result.rows[0].count);
    },

    /**
     * Obtener distribución de cotizaciones por mecánico
     * @returns {array} - Array con distribución
     */
    async getDistribucionPorMecanico() {
        const result = await pool.query(
            `SELECT 
                nombre_mecanico, 
                COUNT(*) as total_ordenes,
                SUM(CASE WHEN LOWER(estatus) = 'aprobada' THEN 1 ELSE 0 END) as ordenes_aprobadas
            FROM cotizaciones 
            WHERE nombre_mecanico IS NOT NULL
            GROUP BY nombre_mecanico
            ORDER BY total_ordenes DESC`
        );

        return result.rows;
    },

    /**
     * Obtener cotizaciones agrupadas por semana
     * @returns {array} - Array con cotizaciones por semana
     */
    async getCotizacionesPorSemana() {
        const result = await pool.query(
            `SELECT 
                DATE_TRUNC('week', fecha) as semana,
                COUNT(*) as total_cotizaciones,
                SUM(total) as valor_total
            FROM cotizaciones 
            WHERE fecha >= CURRENT_DATE - INTERVAL '12 weeks'
            GROUP BY semana
            ORDER BY semana DESC`
        );

        return result.rows;
    }
};

module.exports = CotizacionModel;
