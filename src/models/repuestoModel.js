const pool = require('../config/db');

// Obtener todos los repuestos
const getAllRepuestos = async () => {
  const result = await pool.query('SELECT * FROM repuestos ORDER BY repuesto_id');
  return result.rows;
};

// Obtener un repuesto por ID
const getRepuestoById = async (id) => {
  const query = `
    SELECT 
      repuesto_id, 
      nombre, 
      referencia, 
      marca, 
      proveedor,
      categoria, 
      stock, 
      precio_unitario_costo, 
      precio_unitario_venta,
      creado_por,
      fecha_actualizacion
    FROM repuestos
    WHERE repuesto_id = $1
  `;
  const result = await pool.query(query, [id]);
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
    estado
  } = data;

  const result = await pool.query(
    `INSERT INTO repuestos 
      (nombre, referencia, categoria, marca, compatibilidad, proveedor, stock, stock_minimo, 
       precio_unitario_costo, precio_unitario_venta, unidad_medida, estado, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
      userId
    ]
  );

  return result.rows[0];
};

//Actualizar un repuesto
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
    estado
  } = data;

  const result = await pool.query(
    `UPDATE repuestos 
     SET nombre=$1, referencia=$2, categoria=$3, marca=$4, compatibilidad=$5, proveedor=$6, 
         stock=$7, stock_minimo=$8, precio_unitario_costo=$9, precio_unitario_venta=$10, unidad_medida=$11, estado=$12,
         actualizado_por=$13, fecha_actualizacion=NOW()
     WHERE repuesto_id=$14
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
      userId,
      id
    ]
  );

  return result.rows[0];
};

// Borrar un repuesto
const deleteRepuesto = async (id) => {
  const result = await pool.query(`
    DELETE FROM repuestos 
    WHERE repuesto_id =
     $1 RETURNING *`, [id]);
  return result.rows[0];
}

// Obtener todos los movimientos de los repuestos (entradas y salidas)
const getAllMovements = async () => {
  const query = `
    SELECT 
    e.entrada_id AS movimiento_id,
    e.repuesto_id,
    r.nombre AS repuesto,
    r.categoria,
    r.referencia,
    e.cantidad,
    e.proveedor AS contraparte,
    e.factura,
    e.observacion,
    e.fecha,
    e.tipo_entrada::text AS subtipo,
    e.id_usuario,
    u.nombre AS usuario,
    'Entrada' AS tipo_movimiento
FROM entrada_repuestos e
LEFT JOIN repuestos r ON e.repuesto_id = r.repuesto_id
LEFT JOIN usuarios u ON e.id_usuario = u.id_usuario

UNION ALL

SELECT 
    s.salida_id AS movimiento_id,
    s.repuesto_id,
    r.nombre AS repuesto,
    r.categoria,
    r.referencia,
    s.cantidad,
    s.destino AS contraparte,
    NULL AS factura,
    s.observacion,
    s.fecha,
    s.tipo_salida::text AS subtipo,
    s.id_usuario,
    u.nombre AS usuario,
    'Salida' AS tipo_movimiento
FROM salida_repuestos s
LEFT JOIN repuestos r ON s.repuesto_id = r.repuesto_id
LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario

ORDER BY fecha DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

const getMovementById = async (id, tipo) => {

  const query = `
      SELECT 
        e.entrada_id AS movimiento_id,
        e.repuesto_id,
        r.nombre AS repuesto,
        r.categoria,
        r.referencia,
        e.cantidad,
        e.proveedor AS contraparte,
        e.factura,
        e.observacion,
        e.fecha,
        e.tipo_entrada::text AS subtipo,
        e.id_usuario,
        u.nombre AS usuario,
        'Entrada' AS tipo_movimiento
      FROM entrada_repuestos e
      LEFT JOIN repuestos r ON e.repuesto_id = r.repuesto_id
      LEFT JOIN usuarios u ON e.id_usuario = u.id_usuario
      WHERE e.entrada_id = $1 AND $2 = 'Entrada'

      UNION ALL

      SELECT 
        s.salida_id AS movimiento_id,
        s.repuesto_id,
        r.nombre AS repuesto,
        r.categoria,
        r.referencia,
        s.cantidad,
        s.destino AS contraparte,
        NULL AS factura,
        s.observacion,
        s.fecha,
        s.tipo_salida::text AS subtipo,
        s.id_usuario,
        u.nombre AS usuario,
        'Salida' AS tipo_movimiento
      FROM salida_repuestos s
      LEFT JOIN repuestos r ON s.repuesto_id = r.repuesto_id
      LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario
      WHERE s.salida_id = $1 AND $2 = 'Salida'
    `;

  const { rows } = await pool.query(query, [id, tipo]);
  return rows;
};

//Obtener los movimiento de un repuesto 
const getMovementsByRepuestoId = async (id) => {
  const query = `
    SELECT 
      e.entrada_id AS movimiento_id,
      e.repuesto_id,
      r.nombre AS repuesto,
      r.categoria,
      r.referencia,
      e.cantidad,
      e.proveedor AS contraparte,
      e.factura,
      e.observacion,
      e.fecha,
      e.tipo_entrada::text AS subtipo,
      e.id_usuario,
      u.nombre AS usuario,
      'Entrada' AS tipo_movimiento
    FROM entrada_repuestos e
    LEFT JOIN repuestos r ON e.repuesto_id = r.repuesto_id
    LEFT JOIN usuarios u ON e.id_usuario = u.id_usuario
    WHERE e.repuesto_id = $1

    UNION ALL

    SELECT 
      s.salida_id AS movimiento_id,
      s.repuesto_id,
      r.nombre AS repuesto,
      r.categoria,
      r.referencia,
      s.cantidad,
      s.destino AS contraparte,
      NULL AS factura,
      s.observacion,
      s.fecha,
      s.tipo_salida::text AS subtipo,
      s.id_usuario,
      u.nombre AS usuario,
      'Salida' AS tipo_movimiento
    FROM salida_repuestos s
    LEFT JOIN repuestos r ON s.repuesto_id = r.repuesto_id
    LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario
    WHERE s.repuesto_id = $1

    ORDER BY fecha DESC;
  `;

  const { rows } = await pool.query(query, [id]);
  return rows;
};

//Cantidad total de repuestos agrupados por categoria
const getCantidadRepuestosPorCategoria = async () => {
  const result = await pool.query('SELECT categoria, SUM(stock) AS cantidad_total FROM repuestos GROUP BY categoria');
  return result.rows;
}

// Obtener todas las categorias únicas
const getAllCategorias = async () => {
  const result = await pool.query('SELECT DISTINCT categoria FROM repuestos ORDER BY categoria');
  return result.rows.map(row => row.categoria);
};

// Total cantidad de repuestos sin decimales
const getTotalCantidadRepuestos = async () => {
  const result = await pool.query('SELECT SUM(stock) AS total_cantidad FROM repuestos');
  return parseInt(result.rows[0].total_cantidad, 10);
};

// Ultimos repuestos agregados y su fecha 
const getUltimosRepuestosAgregados = async (limit = 5) => {
  const result = await pool.query(
    `SELECT repuesto_id, nombre, fecha_actualizacion
      FROM repuestos
      ORDER BY fecha_actualizacion DESC
      LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = {
  getAllRepuestos,
  getRepuestoById,
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
