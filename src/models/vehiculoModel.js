const pool = require('../config/db');

/**
 * Modelo para la tabla vehiculos
 */
const VehiculoModel = {
    /**
     * Crear un nuevo vehículo
     * @param {Object} data - Datos del vehículo
     * @returns {Object} - Vehículo creado
     */
    async create(data) {
        const {
            cliente_id,
            placa,
            marca_modelo = null
        } = data;

        const query = `
      INSERT INTO vehiculos (cliente_id, placa, marca_modelo)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

        const values = [cliente_id, placa, marca_modelo];
        const { rows } = await pool.query(query, values);
        return rows[0];
    },

    /**
     * Obtener todos los vehículos
     * @param {Object} filters - Filtros opcionales
     * @returns {Array} - Lista de vehículos
     */
    async findAll(filters = {}) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (filters.cliente_id) {
            whereConditions.push(`v.cliente_id = $${paramIndex}`);
            queryParams.push(filters.cliente_id);
            paramIndex++;
        }

        if (filters.placa) {
            whereConditions.push(`LOWER(v.placa) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.placa.toLowerCase()}%`);
            paramIndex++;
        }

        if (filters.marca_modelo) {
            whereConditions.push(`LOWER(v.marca_modelo) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.marca_modelo.toLowerCase()}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
      SELECT v.*, c.nombre as nombre_cliente, c.documento, c.telefono
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      ${whereClause}
      ORDER BY v.placa ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const page = filters.page || 1;
        const limit = filters.limit || 100;
        const offset = (page - 1) * limit;
        const { rows } = await pool.query(query, [...queryParams, limit, offset]);
        return rows;
    },

    /**
     * Obtener un vehículo por ID
     * @param {number} id - ID del vehículo
     * @returns {Object|null} - Vehículo encontrado o null
     */
    async findById(id) {
        const query = `
      SELECT v.*, c.nombre as nombre_cliente, c.documento, c.telefono, c.email
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      WHERE v.vehiculo_id = $1
    `;
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Obtener un vehículo por placa
     * @param {string} placa - Placa del vehículo
     * @returns {Object|null} - Vehículo encontrado o null
     */
    async findByPlaca(placa) {
        const query = `
      SELECT v.*, c.nombre as nombre_cliente, c.documento, c.telefono, c.email
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      WHERE LOWER(v.placa) = LOWER($1)
    `;
        const { rows } = await pool.query(query, [placa]);
        return rows[0] || null;
    },

    /**
     * Obtener todos los vehículos de un cliente
     * @param {number} clienteId - ID del cliente
     * @returns {Array} - Lista de vehículos
     */
    async findByClienteId(clienteId) {
        const query = `
      SELECT v.*, c.nombre as nombre_cliente
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      WHERE v.cliente_id = $1
      ORDER BY v.placa ASC
      LIMIT 100
    `;
        const { rows } = await pool.query(query, [clienteId]);
        return rows;
    },

    /**
     * Buscar vehículos por marca/modelo
     * @param {string} marcaModelo - Marca o modelo del vehículo
     * @returns {Array} - Lista de vehículos
     */
    async searchByMarcaModelo(marcaModelo) {
        const query = `
      SELECT v.*, c.nombre as nombre_cliente
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      WHERE LOWER(v.marca_modelo) LIKE $1
      ORDER BY v.placa ASC
      LIMIT 50
    `;
        const { rows } = await pool.query(query, [`%${marcaModelo.toLowerCase()}%`]);
        return rows;
    },

    /**
     * Actualizar un vehículo
     * @param {number} id - ID del vehículo
     * @param {Object} data - Datos a actualizar
     * @returns {Object|null} - Vehículo actualizado o null
     */
    async update(id, data) {
        const {
            cliente_id,
            placa,
            marca_modelo
        } = data;

        const query = `
      UPDATE vehiculos SET
        cliente_id = COALESCE($1, cliente_id),
        placa = COALESCE($2, placa),
        marca_modelo = COALESCE($3, marca_modelo)
      WHERE vehiculo_id = $4
      RETURNING *
    `;

        const values = [cliente_id, placa, marca_modelo, id];
        const { rows } = await pool.query(query, values);
        return rows[0] || null;
    },

    /**
     * Eliminar un vehículo
     * @param {number} id - ID del vehículo
     * @returns {Object|null} - Vehículo eliminado
     */
    async delete(id) {
        const query = 'DELETE FROM vehiculos WHERE vehiculo_id = $1 RETURNING *';
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Obtener vehículo con historial de movimientos
     * @param {number} id - ID del vehículo
     * @returns {Object|null} - Vehículo con movimientos
     */
    async findByIdWithMovimientos(id) {
        const vehiculoQuery = `
      SELECT v.*, c.nombre as nombre_cliente, c.documento, c.telefono
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      WHERE v.vehiculo_id = $1
    `;

        const movimientosQuery = `
      SELECT m.*, r.nombre as repuesto_nombre
      FROM movimientos_inventario m
      LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
      WHERE m.vehiculo_id = $1
      ORDER BY m.fecha DESC
      LIMIT 100
    `;

        const vehiculoResult = await pool.query(vehiculoQuery, [id]);
        if (vehiculoResult.rows.length === 0) {
            return null;
        }

        const movimientosResult = await pool.query(movimientosQuery, [id]);

        const vehiculo = vehiculoResult.rows[0];
        vehiculo.movimientos = movimientosResult.rows;

        return vehiculo;
    },

    /**
     * Verificar si existe una placa
     * @param {string} placa - Placa del vehículo
     * @returns {boolean} - True si existe, false si no
     */
    async existsByPlaca(placa) {
        const query = 'SELECT COUNT(*) FROM vehiculos WHERE LOWER(placa) = LOWER($1)';
        const { rows } = await pool.query(query, [placa]);
        return parseInt(rows[0].count, 10) > 0;
    },

    /**
     * Contar vehículos por cliente
     * @param {number} clienteId - ID del cliente
     * @returns {number} - Cantidad de vehículos
     */
    async countByClienteId(clienteId) {
        const query = 'SELECT COUNT(*) FROM vehiculos WHERE cliente_id = $1';
        const { rows } = await pool.query(query, [clienteId]);
        return parseInt(rows[0].count, 10);
    },

    /**
     * Contar total de vehículos
     * @returns {number} - Total de vehículos
     */
    async count() {
        const query = 'SELECT COUNT(*) FROM vehiculos';
        const { rows } = await pool.query(query);
        return parseInt(rows[0].count, 10);
    },

    /**
     * Obtener vehículos con cotizaciones
     * @param {number} id - ID del vehículo
     * @returns {Object|null} - Vehículo con cotizaciones
     */
    async findByIdWithCotizaciones(id) {
        const vehiculoQuery = `
      SELECT v.*, c.nombre as nombre_cliente
      FROM vehiculos v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      WHERE v.vehiculo_id = $1
    `;

        const vehiculoResult = await pool.query(vehiculoQuery, [id]);
        if (vehiculoResult.rows.length === 0) {
            return null;
        }

        const vehiculo = vehiculoResult.rows[0];

        // Buscar cotizaciones por placa del vehículo
        const cotizacionesQuery = `
      SELECT * FROM cotizaciones 
      WHERE LOWER(placa) = LOWER($1)
      ORDER BY fecha DESC
      LIMIT 100
    `;
        const cotizacionesResult = await pool.query(cotizacionesQuery, [vehiculo.placa]);
        vehiculo.cotizaciones = cotizacionesResult.rows;

        return vehiculo;
    }
};

module.exports = VehiculoModel;
