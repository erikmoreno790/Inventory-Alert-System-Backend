const pool = require('../config/db');

const AlertaModel = {
  // Crear alerta
  async create({ repuesto_id, mensaje, tipo }) {
    const result = await pool.query(
      `INSERT INTO alertas (repuesto_id, mensaje, tipo) 
       VALUES ($1, $2, $3) RETURNING *`,
      [repuesto_id, mensaje, tipo]
    );
    return result.rows[0];
  },

 // Obtener todas las alertas
async findAll() {
  const result = await pool.query(
    `SELECT a.*, r.nombre AS repuesto_nombre
     FROM alertas a
     LEFT JOIN repuestos r ON r.repuesto_id = a.repuesto_id
     ORDER BY a.fecha DESC`
  );
  return result.rows;
},

// Obtener una alerta por ID
async findById(id) {
  const result = await pool.query(
    `SELECT a.*, r.nombre AS repuesto_nombre
     FROM alertas a
     LEFT JOIN repuestos r ON r.repuesto_id = a.repuesto_id
     WHERE a.alerta_id = $1`,
    [id]
  );
  return result.rows[0];
},

  // Marcar como leída
  async markAsRead(id) {
    const result = await pool.query(
      `UPDATE alertas SET leida = TRUE WHERE alerta_id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  // Eliminar alerta
  async delete(id) {
    const result = await pool.query(
      `DELETE FROM alertas WHERE alerta_id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async checkStockAndAlert(repuesto_id) {
    const result = await pool.query(
      `SELECT * FROM repuestos WHERE repuesto_id = $1`,
      [repuesto_id]
    );
    const repuesto = result.rows[0];

    if (repuesto && repuesto.stock < repuesto.stock_minimo) {
      // Verificar si ya existe alerta activa para este repuesto
      const existe = await pool.query(
        `SELECT * FROM alertas 
         WHERE repuesto_id = $1 AND tipo = 'stock_bajo' AND leida = FALSE`,
        [repuesto_id]
      );

      if (existe.rows.length === 0) {
        await this.create({
          repuesto_id: repuesto.repuesto_id,
          mensaje: `El repuesto "${repuesto.nombre}" tiene stock bajo (${repuesto.stock}/${repuesto.stock_minimo})`,
          tipo: 'stock_bajo'
        });
      }
    }
  },

  // Generar alertas para todos los repuestos
  async generarAlertasStockBajo() {
    const result = await pool.query(
      `SELECT * FROM repuestos WHERE stock < stock_minimo`
    );

    let count = 0;
    for (const repuesto of result.rows) {
      await this.checkStockAndAlert(repuesto.repuesto_id);
      count++;
    }

    return count; // cantidad revisada
  }
};

module.exports = AlertaModel;
