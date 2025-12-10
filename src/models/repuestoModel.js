const pool = require('../config/db');

// Obtener todos los repuestos con paginación y filtros
const getAllRepuestos = async (page = 1, limit = 50, filters = {}) => {
  const offset = (page - 1) * limit;

  // Construir query dinámicamente con filtros
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  if (filters.categoria) {
    whereConditions.push(`LOWER(categoria) LIKE $${paramIndex}`);
    queryParams.push(`%${filters.categoria.toLowerCase()}%`);
    paramIndex++;
  }

  if (filters.nombre) {
    whereConditions.push(`LOWER(nombre) LIKE $${paramIndex}`);
    queryParams.push(`%${filters.nombre.toLowerCase()}%`);
    paramIndex++;
  }

  if (filters.referencia) {
    whereConditions.push(`LOWER(referencia) LIKE $${paramIndex}`);
    queryParams.push(`%${filters.referencia.toLowerCase()}%`);
    paramIndex++;
  }

  if (filters.marca) {
    whereConditions.push(`LOWER(marca) = $${paramIndex}`);
    queryParams.push(filters.marca.toLowerCase());
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Obtener total de registros con filtros
  const countQuery = `SELECT COUNT(*) FROM repuestos ${whereClause}`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count);

  // Obtener registros paginados con filtros
  const dataQuery = `
    SELECT 
      repuesto_id, nombre, referencia, marca, proveedor, categoria, 
      stock, precio_unitario_costo, precio_unitario_venta,
      creado_por, fecha_actualizacion, codigo_barras
    FROM repuestos 
    ${whereClause}
    ORDER BY repuesto_id
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
};

// Obtener un repuesto por ID
const getRepuestoById = async (id) => {
  const query = `
    SELECT 
      repuesto_id, nombre, referencia, marca, proveedor, categoria, 
      stock, precio_unitario_costo, precio_unitario_venta,
      creado_por, fecha_actualizacion, codigo_barras
    FROM repuestos
    WHERE repuesto_id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getRepuestoByBarcode = async (code) => {
  const query = `
    SELECT
      repuesto_id, nombre, referencia, marca, proveedor, categoria,
      stock, precio_unitario_costo, precio_unitario_venta,
      creado_por, fecha_actualizacion, codigo_barras
    FROM repuestos
    WHERE codigo_barras = $1
  `;
  const result = await pool.query(query, [code]);
  return result.rows[0];
};

// Crear un repuesto
const createRepuesto = async (data, userId) => {
  const {
    nombre,
    referencia,
    categoria,
    marca,
    proveedor,
    precio_unitario_costo,
    precio_unitario_venta,
    codigo_barras
  } = data;

  const result = await pool.query(
    `INSERT INTO repuestos 
      (nombre, referencia, categoria, marca, proveedor, stock, 
       precio_unitario_costo, precio_unitario_venta, creado_por, codigo_barras)
     VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9)
     RETURNING *`,
    [
      nombre,
      referencia,
      categoria,
      marca,
      proveedor,
      precio_unitario_costo || 0,
      precio_unitario_venta,
      userId,
      codigo_barras || null
    ]
  );

  return result.rows[0];
};

// Actualizar un repuesto
const updateRepuesto = async (id, data, userId) => {
  const {
    nombre,
    referencia,
    categoria,
    marca,
    proveedor,
    precio_unitario_costo,
    precio_unitario_venta,
    codigo_barras
  } = data;

  // Si codigo_barras está vacío o es null, usar NULL en la BD
  const codigoBarrasValue = codigo_barras && codigo_barras.trim() !== '' ? codigo_barras : null;

  const result = await pool.query(
    `UPDATE repuestos 
     SET nombre=$1, referencia=$2, categoria=$3, marca=$4, proveedor=$5,
         precio_unitario_costo=$6, precio_unitario_venta=$7, codigo_barras=$8,
         actualizado_por=$9, fecha_actualizacion=NOW()
     WHERE repuesto_id=$10
     RETURNING *`,
    [
      nombre,
      referencia,
      categoria,
      marca,
      proveedor,
      precio_unitario_costo,
      precio_unitario_venta,
      codigoBarrasValue,
      userId,
      id
    ]
  );

  return result.rows[0];
};

// Borrar un repuesto (sin cambios)
const deleteRepuesto = async (id) => {
  const result = await pool.query(`
    DELETE FROM repuestos 
    WHERE repuesto_id = $1 
    RETURNING *`, [id]);
  return result.rows[0];
};

const getAllMovements = async (page = 1, limit = 50, filters = {}) => {
  const offset = (page - 1) * limit;

  // Construir condiciones WHERE dinámicamente
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  if (filters.producto) {
    whereConditions.push(`LOWER(r.nombre) LIKE $${paramIndex}`);
    queryParams.push(`%${filters.producto.toLowerCase()}%`);
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
    whereConditions.push(`r.categoria = $${paramIndex}`);
    queryParams.push(filters.categoria);
    paramIndex++;
  }

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

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Contar total de movimientos con filtros
  const countQuery = `
    SELECT COUNT(*) 
    FROM movimientos_inventario m
    LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count);

  // Obtener movimientos paginados con filtros
  const dataParams = [...queryParams, limit, offset];
  const query = `
    SELECT 
      m.movimiento_id,
      m.repuesto_id,
      r.nombre AS repuesto,
      r.categoria,
      r.referencia,
      m.cantidad,
      COALESCE(m.proveedor, m.destino) AS contraparte,
      m.factura,
      m.observacion,
      m.fecha,
      m.motivo AS subtipo,
      m.id_usuario,
      u.nombre AS usuario,
      m.tipo AS tipo_movimiento
    FROM movimientos_inventario m
    LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
    LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
    ${whereClause}
    ORDER BY m.fecha DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const { rows } = await pool.query(query, dataParams);

  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getMovementById = async (id, tipo) => {
  const query = `
    SELECT 
      m.movimiento_id,
      m.repuesto_id,
      r.nombre AS repuesto,
      r.categoria,
      r.referencia,
      m.cantidad,
      COALESCE(m.proveedor, m.destino) AS contraparte,
      m.factura,
      m.observacion,
      m.fecha,
      m.motivo AS subtipo,
      m.id_usuario,
      u.nombre AS usuario,
      m.tipo AS tipo_movimiento,
      m.cotizacion_id,
      COALESCE(m.cliente, c.nombre_cliente) AS cliente,
      COALESCE(m.vehiculo, c.vehiculo) AS vehiculo,
      COALESCE(m.placa, c.placa) AS placa
    FROM movimientos_inventario m
    LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
    LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
    LEFT JOIN cotizaciones c ON m.cotizacion_id = c.id_cotizacion
    WHERE m.movimiento_id = $1 AND m.tipo = $2;
  `;

  const { rows } = await pool.query(query, [id, tipo]);
  return rows;
};

//Obtener los movimiento de un repuesto 
const getMovementsByRepuestoId = async (id) => {
  const query = `
    SELECT 
      m.movimiento_id,
      m.repuesto_id,
      r.nombre AS repuesto,
      r.categoria,
      r.referencia,
      m.cantidad,
      COALESCE(m.proveedor, m.destino) AS contraparte,
      m.factura,
      m.observacion,
      m.fecha,
      m.motivo AS subtipo,
      m.id_usuario,
      u.nombre AS usuario,
      m.tipo AS tipo_movimiento
    FROM movimientos_inventario m
    LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
    LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
    WHERE m.repuesto_id = $1
    ORDER BY m.fecha DESC;
  `;

  const { rows } = await pool.query(query, [id]);
  return rows;
};

// ------------------- ESTADÍSTICAS (agregamos codigo_barras solo donde sea útil) -------------------
const getCantidadRepuestosPorCategoria = async () => {
  const result = await pool.query('SELECT categoria, SUM(stock) AS cantidad_total FROM repuestos GROUP BY categoria');
  return result.rows;
};

const getAllCategorias = async () => {
  const result = await pool.query('SELECT DISTINCT categoria FROM repuestos WHERE categoria IS NOT NULL ORDER BY categoria');
  return result.rows.map(row => row.categoria);
};

const getAllMarcas = async () => {
  const result = await pool.query('SELECT DISTINCT marca FROM repuestos WHERE marca IS NOT NULL ORDER BY marca');
  return result.rows.map(row => row.marca);
};

const getTotalCantidadRepuestos = async () => {
  const result = await pool.query('SELECT SUM(stock) AS total_cantidad FROM repuestos');
  return parseInt(result.rows[0].total_cantidad || 0, 10);
};

const getUltimosRepuestosAgregados = async (limit = 5) => {
  const result = await pool.query(
    `SELECT repuesto_id, nombre, fecha_actualizacion, codigo_barras
      FROM repuestos
      ORDER BY fecha_actualizacion DESC
      LIMIT $1`,
    [limit]
  );
  return result.rows;
};

module.exports = {
  getAllRepuestos,
  getRepuestoById,
  getRepuestoByBarcode,
  createRepuesto,
  updateRepuesto,
  deleteRepuesto,
  getAllMovements,
  getMovementById,
  getMovementsByRepuestoId,
  getTotalCantidadRepuestos,
  getCantidadRepuestosPorCategoria,
  getAllCategorias,
  getAllMarcas,
  getUltimosRepuestosAgregados
};