const pool = require('../config/db');
const AlertaModel = require('./alertModel');

const SalidaModel = {
  async create({ repuesto_id, cantidad, destino, observacion, fecha, tipo_salida }) {
    const query = `
      INSERT INTO salida_repuestos (repuesto_id, cantidad, destino, observacion, fecha, tipo_salida)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [repuesto_id, cantidad, destino, observacion, fecha, tipo_salida];
    const { rows } = await pool.query(query, values);
    const salida = rows[0];

    // Verificar stock y generar alerta si es necesario
    await AlertaModel.checkStockAndAlert(salida.repuesto_id);

    return salida;
  },

  async findAll() {
    const query = `
      SELECT s.salida_id, s.repuesto_id, r.nombre AS repuesto, s.cantidad,
             s.destino, s.observacion, s.fecha, s.tipo_salida
      FROM salida_repuestos s
      LEFT JOIN repuestos r ON s.repuesto_id = r.repuesto_id
      ORDER BY s.fecha DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  // Obtener una salida por ID con nombre del repuesto
  async findById(id) {
    const query = `
      SELECT s.salida_id, s.repuesto_id, r.nombre AS repuesto, s.cantidad,
             s.destino, s.observacion, s.fecha, s.tipo_salida
      FROM salida_repuestos s
      LEFT JOIN repuestos r ON s.repuesto_id = r.repuesto_id
      WHERE s.salida_id = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

// Actualizar una salida
  async update(id, { repuesto_id, cantidad, destino, observacion, fecha, tipo_salida }) {
    const query = `
      UPDATE salida_repuestos
      SET repuesto_id = $1,
          cantidad = $2,
          destino = $3,
          observacion = $4,
          fecha = $5,
          tipo_salida = $6
      WHERE salida_id = $7
      RETURNING *;
    `;
    const values = [repuesto_id, cantidad, destino, observacion, fecha, tipo_salida, id];
    const { rows } = await pool.query(query, values);
    const salida = rows[0];

    if (salida) {
      // Verificar stock y generar alerta si es necesario
      await AlertaModel.checkStockAndAlert(salida.repuesto_id);
    }

    return salida;
  },

  // Eliminar una salida
  async remove(id) {
    const query = 'DELETE FROM salida_repuestos WHERE salida_id = $1 RETURNING *;';
    const { rows } = await pool.query(query, [id]);
    const salida = rows[0];

    if (salida) {
      // Verificar stock y generar alerta si es necesario
      await AlertaModel.checkStockAndAlert(salida.repuesto_id);
    }

    return salida;
  },
};

module.exports = SalidaModel;
