const pool = require('../config/db');

const ReporteModel = {
    // =====================================================================
    // REPORTE DE VENTAS (Cotizaciones)
    // =====================================================================

    /**
     * Resumen general de ventas en un rango de fechas
     */
    async getResumenVentas(fechaInicio, fechaFin, estatus = null) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (fechaInicio) {
            whereConditions.push(`c.fecha >= $${paramIndex}`);
            queryParams.push(fechaInicio);
            paramIndex++;
        }
        if (fechaFin) {
            whereConditions.push(`c.fecha <= $${paramIndex}`);
            queryParams.push(fechaFin);
            paramIndex++;
        }
        if (estatus) {
            whereConditions.push(`LOWER(c.estatus) = LOWER($${paramIndex})`);
            queryParams.push(estatus);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
            SELECT 
                COUNT(*) AS total_cotizaciones,
                COUNT(*) FILTER (WHERE LOWER(c.estatus) = 'aprobada') AS aprobadas,
                COUNT(*) FILTER (WHERE LOWER(c.estatus) = 'pendiente') AS pendientes,
                COUNT(*) FILTER (WHERE LOWER(c.estatus) = 'rechazada') AS rechazadas,
                COALESCE(SUM(c.total) FILTER (WHERE LOWER(c.estatus) = 'aprobada'), 0) AS total_facturado,
                COALESCE(AVG(c.total) FILTER (WHERE LOWER(c.estatus) = 'aprobada'), 0) AS ticket_promedio,
                COALESCE(SUM(c.total), 0) AS valor_total_todas,
                COALESCE(SUM(c.descuento) FILTER (WHERE LOWER(c.estatus) = 'aprobada'), 0) AS total_descuentos
            FROM cotizaciones c
            ${whereClause}
        `;

        const { rows } = await pool.query(query, queryParams);
        return rows[0];
    },

    /**
     * Top items más vendidos (de cotizaciones aprobadas)
     */
    async getTopItemsVendidos(fechaInicio, fechaFin, limit = 20) {
        const query = `
            SELECT 
                ci.descripcion,
                SUM(ci.cantidad) AS total_cantidad,
                SUM(ci.total) AS total_valor,
                COUNT(DISTINCT ci.id_cotizacion) AS en_cotizaciones,
                ROUND(AVG(ci.precio_unitario)::numeric, 0) AS precio_promedio
            FROM cotizacion_items ci
            JOIN cotizaciones c ON ci.id_cotizacion = c.id_cotizacion
            WHERE LOWER(c.estatus) = 'aprobada'
                AND ($1::date IS NULL OR c.fecha >= $1)
                AND ($2::date IS NULL OR c.fecha <= $2)
            GROUP BY ci.descripcion
            ORDER BY total_cantidad DESC
            LIMIT $3
        `;
        const { rows } = await pool.query(query, [fechaInicio || null, fechaFin || null, limit]);
        return rows;
    },

    /**
     * Ventas por mes (últimos 12 meses o rango dado)
     */
    async getVentasPorMes(fechaInicio, fechaFin) {
        const query = `
            SELECT 
                TO_CHAR(c.fecha, 'YYYY-MM') AS mes,
                TO_CHAR(c.fecha, 'Mon YYYY') AS mes_label,
                COUNT(*) AS total_cotizaciones,
                COUNT(*) FILTER (WHERE LOWER(c.estatus) = 'aprobada') AS aprobadas,
                COALESCE(SUM(c.total) FILTER (WHERE LOWER(c.estatus) = 'aprobada'), 0) AS total_facturado
            FROM cotizaciones c
            WHERE ($1::date IS NULL OR c.fecha >= $1)
              AND ($2::date IS NULL OR c.fecha <= $2)
            GROUP BY mes, mes_label
            ORDER BY mes DESC
            LIMIT 12
        `;
        const { rows } = await pool.query(query, [fechaInicio || null, fechaFin || null]);
        return rows;
    },

    // =====================================================================
    // REPORTE DE INVENTARIO
    // =====================================================================

    /**
     * Resumen general de inventario
     */
    async getResumenInventario(categoria = null) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (categoria) {
            whereConditions.push(`r.categoria = $${paramIndex}`);
            queryParams.push(categoria);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
            SELECT 
                COUNT(*) AS total_items,
                COALESCE(SUM(r.stock), 0) AS total_unidades,
                COALESCE(SUM(r.stock * r.precio_unitario_venta), 0) AS valor_total_venta,
                COALESCE(SUM(r.stock * r.precio_unitario_costo), 0) AS valor_total_costo,
                COUNT(*) FILTER (WHERE r.stock = 0) AS items_sin_stock,
                COUNT(*) FILTER (WHERE r.stock > 0 AND r.stock < 5) AS items_stock_bajo,
                COUNT(*) FILTER (WHERE r.stock >= 5) AS items_stock_ok
            FROM repuestos r
            ${whereClause}
        `;

        const { rows } = await pool.query(query, queryParams);
        return rows[0];
    },

    /**
     * Distribución de inventario por categoría
     */
    async getInventarioPorCategoria() {
        const query = `
            SELECT 
                COALESCE(r.categoria, 'Sin categoría') AS categoria,
                COUNT(*) AS total_items,
                COALESCE(SUM(r.stock), 0) AS total_unidades,
                COALESCE(SUM(r.stock * r.precio_unitario_venta), 0) AS valor_venta,
                COALESCE(SUM(r.stock * r.precio_unitario_costo), 0) AS valor_costo,
                COUNT(*) FILTER (WHERE r.stock = 0) AS sin_stock,
                COUNT(*) FILTER (WHERE r.stock > 0 AND r.stock < 5) AS stock_bajo
            FROM repuestos r
            GROUP BY r.categoria
            ORDER BY valor_venta DESC
        `;
        const { rows } = await pool.query(query);
        return rows;
    },

    /**
     * Items con stock crítico (0 o < 5)
     */
    async getItemsCriticos(stockMax = 5) {
        const query = `
            SELECT 
                r.repuesto_id,
                r.nombre,
                r.referencia,
                r.marca,
                r.categoria,
                r.stock,
                r.precio_unitario_venta,
                r.precio_unitario_costo,
                (r.stock * r.precio_unitario_venta) AS valor_en_stock
            FROM repuestos r
            WHERE r.stock < $1
            ORDER BY r.stock ASC, r.nombre ASC
            LIMIT 100
        `;
        const { rows } = await pool.query(query, [stockMax]);
        return rows;
    },

    // =====================================================================
    // REPORTE DE MECÁNICOS
    // =====================================================================

    /**
     * Rendimiento por mecánico con valores
     */
    async getRendimientoMecanicos(fechaInicio, fechaFin) {
        const query = `
            SELECT 
                c.nombre_mecanico AS mecanico,
                COUNT(*) AS total_ordenes,
                COUNT(*) FILTER (WHERE LOWER(c.estatus) = 'aprobada') AS ordenes_aprobadas,
                COUNT(*) FILTER (WHERE LOWER(c.estatus) = 'rechazada') AS ordenes_rechazadas,
                COUNT(*) FILTER (WHERE LOWER(c.estatus) = 'pendiente') AS ordenes_pendientes,
                COALESCE(SUM(c.total) FILTER (WHERE LOWER(c.estatus) = 'aprobada'), 0) AS valor_aprobado,
                COALESCE(SUM(c.total), 0) AS valor_total,
                ROUND(
                    (COUNT(*) FILTER (WHERE LOWER(c.estatus) = 'aprobada')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 1
                ) AS tasa_aprobacion
            FROM cotizaciones c
            WHERE c.nombre_mecanico IS NOT NULL
                AND c.nombre_mecanico != ''
                AND ($1::date IS NULL OR c.fecha >= $1)
                AND ($2::date IS NULL OR c.fecha <= $2)
            GROUP BY c.nombre_mecanico
            ORDER BY valor_aprobado DESC
        `;
        const { rows } = await pool.query(query, [fechaInicio || null, fechaFin || null]);
        return rows;
    },

    // =====================================================================
    // REPORTE DE CLIENTES
    // =====================================================================

    /**
     * Top clientes por valor facturado
     */
    async getTopClientes(fechaInicio, fechaFin, limit = 20) {
        const query = `
            SELECT 
                c.nombre_cliente,
                c.nit_cc,
                c.placa,
                COUNT(*) AS total_cotizaciones,
                COUNT(*) FILTER (WHERE LOWER(c.estatus) = 'aprobada') AS cotizaciones_aprobadas,
                COALESCE(SUM(c.total) FILTER (WHERE LOWER(c.estatus) = 'aprobada'), 0) AS total_facturado,
                MAX(c.fecha) AS ultima_visita
            FROM cotizaciones c
            WHERE ($1::date IS NULL OR c.fecha >= $1)
              AND ($2::date IS NULL OR c.fecha <= $2)
            GROUP BY c.nombre_cliente, c.nit_cc, c.placa
            ORDER BY total_facturado DESC
            LIMIT $3
        `;
        const { rows } = await pool.query(query, [fechaInicio || null, fechaFin || null, limit]);
        return rows;
    },

    /**
     * Resumen de clientes
     */
    async getResumenClientes(fechaInicio, fechaFin) {
        const query = `
            SELECT 
                COUNT(DISTINCT c.nombre_cliente) AS total_clientes_unicos,
                COUNT(*) AS total_cotizaciones,
                COALESCE(SUM(c.total) FILTER (WHERE LOWER(c.estatus) = 'aprobada'), 0) AS total_facturado,
                COALESCE(AVG(c.total) FILTER (WHERE LOWER(c.estatus) = 'aprobada'), 0) AS ticket_promedio
            FROM cotizaciones c
            WHERE ($1::date IS NULL OR c.fecha >= $1)
              AND ($2::date IS NULL OR c.fecha <= $2)
        `;
        const { rows } = await pool.query(query, [fechaInicio || null, fechaFin || null]);
        return rows[0];
    },

    // =====================================================================
    // REPORTE DE MOVIMIENTOS
    // =====================================================================

    /**
     * Estadísticas de movimientos con desglose
     */
    async getResumenMovimientos(fechaInicio, fechaFin, tipo = null, motivo = null, categoria = null) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (fechaInicio) {
            whereConditions.push(`m.fecha >= $${paramIndex}`);
            queryParams.push(fechaInicio);
            paramIndex++;
        }
        if (fechaFin) {
            whereConditions.push(`m.fecha <= $${paramIndex}`);
            queryParams.push(fechaFin);
            paramIndex++;
        }
        if (tipo) {
            whereConditions.push(`m.tipo = $${paramIndex}`);
            queryParams.push(tipo);
            paramIndex++;
        }
        if (motivo) {
            whereConditions.push(`m.motivo = $${paramIndex}`);
            queryParams.push(motivo);
            paramIndex++;
        }
        if (categoria) {
            whereConditions.push(`r.categoria = $${paramIndex}`);
            queryParams.push(categoria);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
            SELECT 
                COUNT(*) AS total_movimientos,
                COUNT(*) FILTER (WHERE m.tipo = 'Entrada') AS total_entradas,
                COUNT(*) FILTER (WHERE m.tipo = 'Salida') AS total_salidas,
                COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'Entrada'), 0) AS cantidad_entradas,
                COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'Salida'), 0) AS cantidad_salidas,
                COUNT(DISTINCT m.repuesto_id) AS repuestos_afectados
            FROM movimientos_inventario m
            LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
            ${whereClause}
        `;

        const { rows } = await pool.query(query, queryParams);
        return rows[0];
    },

    /**
     * Movimientos agrupados por categoría
     */
    async getMovimientosPorCategoria(fechaInicio, fechaFin) {
        const query = `
            SELECT 
                COALESCE(r.categoria, 'Sin categoría') AS categoria,
                COUNT(*) AS total_movimientos,
                COUNT(*) FILTER (WHERE m.tipo = 'Entrada') AS entradas,
                COUNT(*) FILTER (WHERE m.tipo = 'Salida') AS salidas,
                COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'Entrada'), 0) AS cantidad_entradas,
                COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'Salida'), 0) AS cantidad_salidas
            FROM movimientos_inventario m
            LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
            WHERE ($1::date IS NULL OR m.fecha >= $1)
              AND ($2::date IS NULL OR m.fecha <= $2)
            GROUP BY r.categoria
            ORDER BY total_movimientos DESC
        `;
        const { rows } = await pool.query(query, [fechaInicio || null, fechaFin || null]);
        return rows;
    },

    /**
     * Movimientos agrupados por motivo
     */
    async getMovimientosPorMotivo(fechaInicio, fechaFin) {
        const query = `
            SELECT 
                COALESCE(m.motivo, 'Sin motivo') AS motivo,
                m.tipo,
                COUNT(*) AS total_movimientos,
                COALESCE(SUM(m.cantidad), 0) AS total_cantidad
            FROM movimientos_inventario m
            WHERE ($1::date IS NULL OR m.fecha >= $1)
              AND ($2::date IS NULL OR m.fecha <= $2)
            GROUP BY m.motivo, m.tipo
            ORDER BY total_movimientos DESC
        `;
        const { rows } = await pool.query(query, [fechaInicio || null, fechaFin || null]);
        return rows;
    }
};

module.exports = ReporteModel;
