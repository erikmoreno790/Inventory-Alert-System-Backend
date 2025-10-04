const pool = require('../config/db');

// Obtener todos los repuestos
const getAllRepuestos = async () => {
  const result = await pool.query('SELECT * FROM repuestos ORDER BY repuesto_id');
  return result.rows;
};

// Obtener un repuesto por ID
const getRepuestoById = async (id) => {
  const result = await pool.query('SELECT * FROM repuestos WHERE repuesto_id = $1', [id]);
  return result.rows[0];
};

// Crear un nuevo repuesto
const createRepuesto = async (data) => {
  const {
    nombre,
    descripcion,
    categoria,
    marca,
    compatibilidad,
    proveedor,
    stock,
    stock_minimo,
    precio_unitario,
    unidad_medida,
    estado
  } = data;

  const result = await pool.query(
    `INSERT INTO repuestos 
      (nombre, descripcion, categoria, marca, compatibilidad, proveedor, stock, stock_minimo, precio_unitario, unidad_medida, estado) 
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) 
     RETURNING *`,
    [nombre, descripcion, categoria, marca, compatibilidad, proveedor, stock, stock_minimo, precio_unitario, unidad_medida, estado]
  );
  return result.rows[0];
};

// Actualizar repuesto
const updateRepuesto = async (id, data) => {
  const {
    nombre,
    descripcion,
    categoria,
    marca,
    compatibilidad,
    proveedor,
    stock,
    stock_minimo,
    precio_unitario,
    unidad_medida,
    estado
  } = data;

  const result = await pool.query(
    `UPDATE repuestos 
     SET nombre=$1, descripcion=$2, categoria=$3, marca=$4, compatibilidad=$5, proveedor=$6, 
         stock=$7, stock_minimo=$8, precio_unitario=$9, unidad_medida=$10, estado=$11
     WHERE repuesto_id=$12
     RETURNING *`,
    [nombre, descripcion, categoria, marca, compatibilidad, proveedor, stock, stock_minimo, precio_unitario, unidad_medida, estado, id]
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

// Eliminar repuesto
const deleteRepuesto = async (id) => {
  const result = await pool.query('DELETE FROM repuestos WHERE repuesto_id = $1 RETURNING *', [id]);
  return result.rows[0];
};

const getBelowStockMin = async () => {
  const result = await pool.query('SELECT * FROM Repuestos WHERE stock < stock_minimo');
  return result.rows;
};

const getByCategoria = async (categoria) => {
  const result = await pool.query('SELECT * FROM Repuestos WHERE categoria = $1', [categoria]);
  return result.rows;
};

const getByProveedor = async (proveedor) => {
  const result = await pool.query('SELECT * FROM Repuestos WHERE proveedor = $1', [proveedor]);
  return result.rows;
};

const getDisponibles = async () => {
  const result = await pool.query("SELECT * FROM Repuestos WHERE estado = 'disponible' AND stock > 0");
  return result.rows;
};

const getTopMinStock = async (limit = 5) => {
  const result = await pool.query('SELECT * FROM Repuestos ORDER BY stock ASC LIMIT $1', [limit]);
  return result.rows;
};

const getValorInventario = async () => {
  const result = await pool.query('SELECT SUM(stock * precio_unitario) AS valor_inventario FROM Repuestos');
  return result.rows[0];
};

const getCantidadPorCategoria = async () => {
  const result = await pool.query('SELECT categoria, COUNT(*) AS cantidad_repuestos FROM Repuestos GROUP BY categoria');
  return result.rows;
};

module.exports = {
  getAllRepuestos,
  getRepuestoById,
  createRepuesto,
  updateRepuesto,
  deleteRepuesto,
  getAllRepuestos,
  getRepuestoById,
  createRepuesto,
  updateRepuesto,
  deleteRepuesto,
  getBelowStockMin,
  getByCategoria,
  getByProveedor,
  getDisponibles,
  getTopMinStock,
  getValorInventario,
  getCantidadPorCategoria,
  getAllMovements

};
