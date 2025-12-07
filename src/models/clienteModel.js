const pool = require('../config/db');

/**
 * Modelo para la tabla clientes
 */
const ClienteModel = {
    /**
     * Crear un nuevo cliente
     * @param {Object} data - Datos del cliente
     * @returns {Object} - Cliente creado
     */
    async create(data) {
        const {
            nombre,
            documento = null,
            telefono = null,
            email = null,
            direccion = null
        } = data;

        const query = `
      INSERT INTO clientes (nombre, documento, telefono, email, direccion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

        const values = [nombre, documento, telefono, email, direccion];
        const { rows } = await pool.query(query, values);
        return rows[0];
    },

    /**
     * Obtener todos los clientes
     * @param {Object} filters - Filtros opcionales
     * @returns {Array} - Lista de clientes
     */
    async findAll(filters = {}) {
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (filters.nombre) {
            whereConditions.push(`LOWER(nombre) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.nombre.toLowerCase()}%`);
            paramIndex++;
        }

        if (filters.documento) {
            whereConditions.push(`documento = $${paramIndex}`);
            queryParams.push(filters.documento);
            paramIndex++;
        }

        if (filters.email) {
            whereConditions.push(`LOWER(email) LIKE $${paramIndex}`);
            queryParams.push(`%${filters.email.toLowerCase()}%`);
            paramIndex++;
        }

        if (filters.telefono) {
            whereConditions.push(`telefono LIKE $${paramIndex}`);
            queryParams.push(`%${filters.telefono}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
      SELECT * FROM clientes 
      ${whereClause}
      ORDER BY nombre ASC
    `;

        const { rows } = await pool.query(query, queryParams);
        return rows;
    },

    /**
     * Obtener un cliente por ID
     * @param {number} id - ID del cliente
     * @returns {Object|null} - Cliente encontrado o null
     */
    async findById(id) {
        const query = 'SELECT * FROM clientes WHERE cliente_id = $1';
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Obtener un cliente por documento
     * @param {string} documento - Documento del cliente
     * @returns {Object|null} - Cliente encontrado o null
     */
    async findByDocumento(documento) {
        const query = 'SELECT * FROM clientes WHERE documento = $1';
        const { rows } = await pool.query(query, [documento]);
        return rows[0] || null;
    },

    /**
     * Obtener un cliente por email
     * @param {string} email - Email del cliente
     * @returns {Object|null} - Cliente encontrado o null
     */
    async findByEmail(email) {
        const query = 'SELECT * FROM clientes WHERE LOWER(email) = LOWER($1)';
        const { rows } = await pool.query(query, [email]);
        return rows[0] || null;
    },

    /**
     * Buscar clientes por nombre (búsqueda parcial)
     * @param {string} nombre - Nombre o parte del nombre
     * @returns {Array} - Lista de clientes
     */
    async searchByNombre(nombre) {
        const query = `
      SELECT * FROM clientes 
      WHERE LOWER(nombre) LIKE $1 
      ORDER BY nombre ASC
    `;
        const { rows } = await pool.query(query, [`%${nombre.toLowerCase()}%`]);
        return rows;
    },

    /**
     * Actualizar un cliente
     * @param {number} id - ID del cliente
     * @param {Object} data - Datos a actualizar
     * @returns {Object|null} - Cliente actualizado o null
     */
    async update(id, data) {
        const {
            nombre,
            documento,
            telefono,
            email,
            direccion
        } = data;

        const query = `
      UPDATE clientes SET
        nombre = COALESCE($1, nombre),
        documento = COALESCE($2, documento),
        telefono = COALESCE($3, telefono),
        email = COALESCE($4, email),
        direccion = COALESCE($5, direccion),
        updated_at = CURRENT_TIMESTAMP
      WHERE cliente_id = $6
      RETURNING *
    `;

        const values = [nombre, documento, telefono, email, direccion, id];
        const { rows } = await pool.query(query, values);
        return rows[0] || null;
    },

    /**
     * Eliminar un cliente
     * @param {number} id - ID del cliente
     * @returns {Object|null} - Cliente eliminado
     */
    async delete(id) {
        const query = 'DELETE FROM clientes WHERE cliente_id = $1 RETURNING *';
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Obtener cliente con sus vehículos
     * @param {number} id - ID del cliente
     * @returns {Object|null} - Cliente con vehículos
     */
    async findByIdWithVehiculos(id) {
        const clienteQuery = 'SELECT * FROM clientes WHERE cliente_id = $1';
        const vehiculosQuery = 'SELECT * FROM vehiculos WHERE cliente_id = $1 ORDER BY placa ASC';

        const clienteResult = await pool.query(clienteQuery, [id]);
        if (clienteResult.rows.length === 0) {
            return null;
        }

        const vehiculosResult = await pool.query(vehiculosQuery, [id]);

        const cliente = clienteResult.rows[0];
        cliente.vehiculos = vehiculosResult.rows;

        return cliente;
    },

    /**
     * Obtener clientes con movimientos de inventario
     * @returns {Array} - Lista de clientes con movimientos
     */
    async findWithMovimientos() {
        const query = `
      SELECT DISTINCT c.*, COUNT(m.movimiento_id) as total_movimientos
      FROM clientes c
      LEFT JOIN movimientos_inventario m ON c.cliente_id = m.cliente_id
      GROUP BY c.cliente_id
      ORDER BY c.nombre ASC
    `;
        const { rows } = await pool.query(query);
        return rows;
    },

    /**
     * Contar total de clientes
     * @returns {number} - Total de clientes
     */
    async count() {
        const query = 'SELECT COUNT(*) FROM clientes';
        const { rows } = await pool.query(query);
        return parseInt(rows[0].count, 10);
    },

    /**
     * Verificar si un cliente existe por documento
     * @param {string} documento - Documento del cliente
     * @returns {boolean} - True si existe, false si no
     */
    async existsByDocumento(documento) {
        const query = 'SELECT COUNT(*) FROM clientes WHERE documento = $1';
        const { rows } = await pool.query(query, [documento]);
        return parseInt(rows[0].count, 10) > 0;
    },

    /**
     * Verificar si un cliente existe por email
     * @param {string} email - Email del cliente
     * @returns {boolean} - True si existe, false si no
     */
    async existsByEmail(email) {
        const query = 'SELECT COUNT(*) FROM clientes WHERE LOWER(email) = LOWER($1)';
        const { rows } = await pool.query(query, [email]);
        return parseInt(rows[0].count, 10) > 0;
    }
};

module.exports = ClienteModel;
