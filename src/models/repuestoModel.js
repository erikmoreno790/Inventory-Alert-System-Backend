const pool = require('../config/db');

// Obtener todos los repuestos
const getAllRepuestos = async () => {
  const result = await pool.query(`
    SELECT 
      repuesto_id, nombre, referencia, marca, proveedor, categoria, 
      stock, precio_unitario_costo, precio_unitario_venta,
      creado_por, fecha_actualizacion, codigo_barras 
    FROM repuestos 
    ORDER BY repuesto_id
  `);
  return result.rows;
};

// Obtener un repuesto por ID
const getRepuestoById = async (id) => {
  const query = `
    SELECT 
      repuesto_id, nombre, referencia, marca, proveedor, categoria, 
      stock, precio_unitario_costo, precio_unitario_venta,
      creado_por, fecha_actualizacion, codigo_barras,
      compatibilidad, stock_minimo, unidad_medida, estado
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
      creado_por, fecha_actualizacion, codigo_barras,
      compatibilidad, stock_minimo, unidad_medida, estado
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
    compatibilidad,
    proveedor,
    stock,
    stock_minimo,
    precio_unitario_costo,
    precio_unitario_venta,
    unidad_medida,
    estado,
    codigo_barras          // <-- NUEVO
  } = data;

  const result = await pool.query(
    `INSERT INTO repuestos 
      (nombre, referencia, categoria, marca, compatibilidad, proveedor, stock, stock_minimo, 
       precio_unitario_costo, precio_unitario_venta, unidad_medida, estado, creado_por, codigo_barras)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      nombre,
      referencia,
      categoria,
      marca,
      compatibilidad,
      proveedor,
      stock,
      stock_minimo || 0,
      precio_unitario_costo || 0,
      precio_unitario_venta,
      unidad_medida,
      estado,
      userId,
      codigo_barras || null        // <-- permite valor vacío o null
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
    compatibilidad,
    proveedor,
    stock,
    stock_minimo,
    precio_unitario_costo,
    precio_unitario_venta,
    unidad_medida,
    estado,
    codigo_barras          // <-- NUEVO
  } = data;

  const result = await pool.query(
    `UPDATE repuestos 
     SET nombre=$1, referencia=$2, categoria=$3, marca=$4, compatibilidad=$5, proveedor=$6, 
         stock=$7, stock_minimo=$8, precio_unitario_costo=$9, precio_unitario_venta=$10,
         unidad_medida=$11, estado=$12, codigo_barras=$13,
         actualizado_por=$14, fecha_actualizacion=NOW()
     WHERE repuesto_id=$15
     RETURNING *`,
    [
      nombre,
      referencia,
      categoria,
      marca,
      compatibilidad,
      proveedor,
      stock,
      stock_minimo,
      precio_unitario_costo,
      precio_unitario_venta,
      unidad_medida,
      estado,
      codigo_barras || null,   // <-- permite actualizar a null/vacío
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

// ------------------- MOVIMIENTOS (sin cambios, no usan código de barras) -------------------
const getAllMovements = async () => { /* ... mismo código que tenías ... */ };
const getMovementById = async (id, tipo) => { /* ... mismo código ... */ };
const getMovementsByRepuestoId = async (id) => { /* ... mismo código ... */ };

// ------------------- ESTADÍSTICAS (agregamos codigo_barras solo donde sea útil) -------------------
const getCantidadRepuestosPorCategoria = async () => {
  const result = await pool.query('SELECT categoria, SUM(stock) AS cantidad_total FROM repuestos GROUP BY categoria');
  return result.rows;
};

const getAllCategorias = async () => {
  const result = await pool.query('SELECT DISTINCT categoria FROM repuestos ORDER BY categoria');
  return result.rows.map(row => row.categoria);
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
  getUltimosRepuestosAgregados
};