const pool = require('../config/db');

/**
 * Modelo para recordatorios de mantenimiento
 */
const RecordatorioModel = {
    /**
     * Crear un nuevo recordatorio
     * @param {Object} data - Datos del recordatorio
     * @returns {Object} - Recordatorio creado
     */
    async create(data) {
        const {
            cliente_id,
            vehiculo_id,
            tipo = 'mantenimiento',
            fecha_programada,
            mensaje,
            telefono,
            enviado = false,
            fecha_envio = null,
            estado = 'pendiente',
            notas = null
        } = data;

        const query = `
      INSERT INTO recordatorios 
        (cliente_id, vehiculo_id, tipo, fecha_programada, mensaje, telefono, 
         enviado, fecha_envio, estado, notas)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

        const values = [
            cliente_id,
            vehiculo_id,
            tipo,
            fecha_programada,
            mensaje,
            telefono,
            enviado,
            fecha_envio,
            estado,
            notas
        ];

        const { rows } = await pool.query(query, values);
        return rows[0];
    },

    /**
     * Obtener todos los recordatorios con filtros
     * @param {Object} filters - Filtros opcionales
     * @returns {Array} - Lista de recordatorios
     */
    async findAll(filters = {}) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (filters.cliente_id) {
            whereConditions.push(`r.cliente_id = $${paramIndex}`);
            queryParams.push(filters.cliente_id);
            paramIndex++;
        }

        if (filters.vehiculo_id) {
            whereConditions.push(`r.vehiculo_id = $${paramIndex}`);
            queryParams.push(filters.vehiculo_id);
            paramIndex++;
        }

        if (filters.tipo) {
            whereConditions.push(`r.tipo = $${paramIndex}`);
            queryParams.push(filters.tipo);
            paramIndex++;
        }

        if (filters.enviado !== undefined) {
            whereConditions.push(`r.enviado = $${paramIndex}`);
            queryParams.push(filters.enviado);
            paramIndex++;
        }

        if (filters.estado) {
            whereConditions.push(`r.estado = $${paramIndex}`);
            queryParams.push(filters.estado);
            paramIndex++;
        }

        if (filters.fecha_desde) {
            whereConditions.push(`r.fecha_programada >= $${paramIndex}`);
            queryParams.push(filters.fecha_desde);
            paramIndex++;
        }

        if (filters.fecha_hasta) {
            whereConditions.push(`r.fecha_programada <= $${paramIndex}`);
            queryParams.push(filters.fecha_hasta);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
      SELECT 
        r.*,
        c.nombre as cliente_nombre,
        c.documento as cliente_documento,
        v.placa as vehiculo_placa,
        v.marca_modelo as vehiculo_marca
      FROM recordatorios r
      LEFT JOIN clientes c ON r.cliente_id = c.cliente_id
      LEFT JOIN vehiculos v ON r.vehiculo_id = v.vehiculo_id
      ${whereClause}
      ORDER BY r.fecha_programada DESC, r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const offset = (page - 1) * limit;
        const { rows } = await pool.query(query, [...queryParams, limit, offset]);
        return rows;
    },

    /**
     * Obtener un recordatorio por ID
     * @param {number} id - ID del recordatorio
     * @returns {Object|null} - Recordatorio encontrado o null
     */
    async findById(id) {
        const query = `
      SELECT 
        r.*,
        c.nombre as cliente_nombre,
        c.telefono as cliente_telefono,
        c.email as cliente_email,
        v.placa as vehiculo_placa,
        v.marca_modelo as vehiculo_marca
      FROM recordatorios r
      LEFT JOIN clientes c ON r.cliente_id = c.cliente_id
      LEFT JOIN vehiculos v ON r.vehiculo_id = v.vehiculo_id
      WHERE r.recordatorio_id = $1
    `;
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Obtener recordatorios pendientes de envío
     * @param {string} fechaLimite - Fecha límite para envío
     * @returns {Array} - Lista de recordatorios pendientes
     */
    async findPendientesEnvio(fechaLimite = null) {
        const fecha = fechaLimite || new Date().toISOString().split('T')[0];

        const query = `
      SELECT 
        r.*,
        c.nombre as cliente_nombre,
        c.telefono as cliente_telefono,
        v.placa as vehiculo_placa,
        v.marca_modelo as vehiculo_marca
      FROM recordatorios r
      INNER JOIN clientes c ON r.cliente_id = c.cliente_id
      INNER JOIN vehiculos v ON r.vehiculo_id = v.vehiculo_id
      WHERE r.enviado = false 
        AND r.estado = 'pendiente'
        AND r.fecha_programada <= $1
        AND c.telefono IS NOT NULL
      ORDER BY r.fecha_programada ASC
      LIMIT 200
    `;

        const { rows } = await pool.query(query, [fecha]);
        return rows;
    },

    /**
     * Marcar recordatorio como enviado
     * @param {number} id - ID del recordatorio
     * @param {boolean} exitoso - Si el envío fue exitoso
     * @returns {Object|null} - Recordatorio actualizado
     */
    async marcarEnviado(id, exitoso = true) {
        const estado = exitoso ? 'enviado' : 'error';

        const query = `
      UPDATE recordatorios 
      SET enviado = $1, 
          fecha_envio = NOW(), 
          estado = $2
      WHERE recordatorio_id = $3
      RETURNING *
    `;

        const { rows } = await pool.query(query, [exitoso, estado, id]);
        return rows[0] || null;
    },

    /**
     * Actualizar un recordatorio
     * @param {number} id - ID del recordatorio
     * @param {Object} data - Datos a actualizar
     * @returns {Object|null} - Recordatorio actualizado
     */
    async update(id, data) {
        const {
            fecha_programada,
            mensaje,
            telefono,
            estado,
            notas
        } = data;

        const query = `
      UPDATE recordatorios SET
        fecha_programada = COALESCE($1, fecha_programada),
        mensaje = COALESCE($2, mensaje),
        telefono = COALESCE($3, telefono),
        estado = COALESCE($4, estado),
        notas = COALESCE($5, notas),
        updated_at = NOW()
      WHERE recordatorio_id = $6
      RETURNING *
    `;

        const values = [fecha_programada, mensaje, telefono, estado, notas, id];
        const { rows } = await pool.query(query, values);
        return rows[0] || null;
    },

    /**
     * Cancelar un recordatorio
     * @param {number} id - ID del recordatorio
     * @returns {Object|null} - Recordatorio cancelado
     */
    async cancelar(id) {
        const query = `
      UPDATE recordatorios 
      SET estado = 'cancelado', updated_at = NOW()
      WHERE recordatorio_id = $1
      RETURNING *
    `;

        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Eliminar un recordatorio
     * @param {number} id - ID del recordatorio
     * @returns {Object|null} - Recordatorio eliminado
     */
    async delete(id) {
        const query = 'DELETE FROM recordatorios WHERE recordatorio_id = $1 RETURNING *';
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Obtener estadísticas de recordatorios
     * @returns {Object} - Estadísticas
     */
    async getEstadisticas() {
        const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE enviado = true) as enviados,
        COUNT(*) FILTER (WHERE enviado = false AND estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'cancelado') as cancelados,
        COUNT(*) FILTER (WHERE estado = 'error') as con_error
      FROM recordatorios
    `;

        const { rows } = await pool.query(query);
        return rows[0];
    },

    /**
     * Obtener recordatorios por cliente
     * @param {number} clienteId - ID del cliente
     * @returns {Array} - Lista de recordatorios
     */
    async findByClienteId(clienteId) {
        const query = `
      SELECT 
        r.*,
        v.placa as vehiculo_placa,
        v.marca_modelo as vehiculo_marca
      FROM recordatorios r
      LEFT JOIN vehiculos v ON r.vehiculo_id = v.vehiculo_id
      WHERE r.cliente_id = $1
      ORDER BY r.fecha_programada DESC
      LIMIT 100
    `;

        const { rows } = await pool.query(query, [clienteId]);
        return rows;
    },

    /**
     * Obtener recordatorios por vehículo
     * @param {number} vehiculoId - ID del vehículo
     * @returns {Array} - Lista de recordatorios
     */
    async findByVehiculoId(vehiculoId) {
        const query = `
      SELECT 
        r.*,
        c.nombre as cliente_nombre,
        c.telefono as cliente_telefono
      FROM recordatorios r
      LEFT JOIN clientes c ON r.cliente_id = c.cliente_id
      WHERE r.vehiculo_id = $1
      ORDER BY r.fecha_programada DESC
      LIMIT 100
    `;

        const { rows } = await pool.query(query, [vehiculoId]);
        return rows;
    },

    /**
     * Crear recordatorio automático basado en última cotización
     * @param {number} vehiculoId - ID del vehículo
     * @param {number} diasParaProximoMantenimiento - Días para el próximo mantenimiento
     * @returns {Object} - Recordatorio creado
     */
    async createFromLastQuotation(vehiculoId, diasParaProximoMantenimiento = 90) {
        // Obtener última cotización del vehículo
        const quotationQuery = `
      SELECT c.*, v.cliente_id, v.placa, v.marca_modelo, cl.nombre, cl.telefono
      FROM cotizaciones c
      INNER JOIN vehiculos v ON LOWER(c.placa) = LOWER(v.placa)
      INNER JOIN clientes cl ON v.cliente_id = cl.cliente_id
      WHERE v.vehiculo_id = $1 AND c.estatus = 'Aprobada'
      ORDER BY c.fecha DESC
      LIMIT 1
    `;

        const quotationResult = await pool.query(quotationQuery, [vehiculoId]);

        if (quotationResult.rows.length === 0) {
            throw new Error('No se encontró cotización aprobada para este vehículo');
        }

        const cotizacion = quotationResult.rows[0];

        // Calcular fecha del próximo mantenimiento
        const fechaUltimaVisita = new Date(cotizacion.fecha);
        const fechaProximoMantenimiento = new Date(fechaUltimaVisita);
        fechaProximoMantenimiento.setDate(fechaProximoMantenimiento.getDate() + diasParaProximoMantenimiento);

        // Crear mensaje
        const mensaje = `Hola ${cotizacion.nombre}! Es momento de traer tu vehículo ${cotizacion.placa} para su mantenimiento programado. Agenda tu cita hoy!`;

        // Crear recordatorio
        return await this.create({
            cliente_id: cotizacion.cliente_id,
            vehiculo_id: vehiculoId,
            tipo: 'mantenimiento',
            fecha_programada: fechaProximoMantenimiento.toISOString().split('T')[0],
            mensaje,
            telefono: cotizacion.telefono,
            estado: 'pendiente'
        });
    }
};

module.exports = RecordatorioModel;
