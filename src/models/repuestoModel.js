const pool = require('../config/db');

// Obtener todos los repuestos
const getAllRepuestos = async () => {
  const result = await pool.query('SELECT * FROM repuestos ORDER BY repuesto_id');
  return result.rows;
};

//Obtener

// Obtener un repuesto por ID
const getRepuestoById = async (id) => {
  const result = await pool.query('SELECT * FROM repuestos WHERE repuesto_id = $1', [id]);
  return result.rows[0];
};

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
      stock_minimo,
      precio_unitario_costo,
      precio_unitario_venta,
      unidad_medida,
      estado,
      userId
    ]
  );

  return result.rows[0];
};

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

const deleteRepuesto = async (id, userId) => {
  const result = await pool.query(
    `UPDATE repuestos
     SET estado = 'eliminado',
         eliminado_por = $1,
         fecha_eliminacion = NOW()
     WHERE repuesto_id = $2
     RETURNING *`,
    [userId, id]
  );

  return result.rows[0];
};


// Obtener todos los movimientos (entradas y salidas)
const getAllMovements = async () => {
  const query = `
      SELECT e.entrada_id AS movimiento_id,
       e.repuesto_id,
       r.nombre AS repuesto,
       e.cantidad,
       e.proveedor AS contraparte,
       e.factura,
       e.observacion,
       e.fecha,
       e.tipo_entrada::text AS subtipo,
       'Entrada' AS tipo_movimiento
FROM entrada_repuestos e
LEFT JOIN repuestos r ON e.repuesto_id = r.repuesto_id

UNION ALL

SELECT s.salida_id AS movimiento_id,
       s.repuesto_id,
       r.nombre AS repuesto,
       s.cantidad,
       s.destino AS contraparte,
       NULL AS factura,
       s.observacion,
       s.fecha,
       s.tipo_salida::text AS subtipo,
       'Salida' AS tipo_movimiento
FROM salida_repuestos s
LEFT JOIN repuestos r ON s.repuesto_id = r.repuesto_id

ORDER BY fecha DESC;

    `;
  const { rows } = await pool.query(query);
  return rows;
};




/*const getByCategoria = async (categoria) => {
  const result = await pool.query('SELECT * FROM Repuestos WHERE categoria = $1', [categoria]);
  return result.rows;
};*/


// Total repuestos agrupados por categoria
/*const getAllRepuestosPorCategoria = async () => {
  const result = await pool.query('SELECT categoria, COUNT(*) AS total FROM Repuestos GROUP BY categoria');
  return result.rows;
}*/

//Cantidad total de repuestos agrupados por categoria
const getCantidadRepuestosPorCategoria = async () => {
  const result = await pool.query('SELECT categoria, SUM(stock) AS cantidad_total FROM repuestos GROUP BY categoria');
  return result.rows;
}


module.exports = {
  getRepuestoById,
  createRepuesto,
  updateRepuesto,
  deleteRepuesto,
  getAllRepuestos,
  getAllMovements,
  getCantidadRepuestosPorCategoria
};
