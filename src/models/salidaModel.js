const pool = require('../config/db');
const AlertaModel = require('./alertModel');

const SalidaModel = {
  async create({ repuesto_id, cantidad, destino, observacion, fecha, tipo_salida, factura = null }) {
    const query = `
      INSERT INTO salida_repuestos 
      (repuesto_id, cantidad, destino, observacion, fecha, tipo_salida, factura)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [repuesto_id, cantidad, destino || null, observacion || null, fecha, tipo_salida, factura];
    const { rows } = await pool.query(query, values);
    const salida = rows[0];

    // Actualizar stock
    await pool.query(
      'UPDATE repuestos SET stock = stock - $1 WHERE repuesto_id = $2 AND stock >= $1;',
      [cantidad, repuesto_id]
    );

    // Opcional: disparar alerta si el stock baja del mínimo
    await AlertaModel.checkStockBajo(repuesto_id);

    return salida;
  },

  async findAll() {
    const query = `
      SELECT 
        s.salida_id,
        s.repuesto_id,
        r.nombre AS repuesto,
        r.referencia,
        s.cantidad,
        s.destino,
        s.observacion,
        s.factura,
        s.fecha,
        s.tipo_salida,
        u.id_usuario,
        u.nombre AS nombre_usuario
      FROM salida_repuestos s
      LEFT JOIN repuestos r ON s.repuesto_id = r.repuesto_id
      LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario
      ORDER BY s.fecha DESC;
    `;

    const { rows } = await pool.query(query);
    return rows;
  },

  async findById(id) {
    const query = `
      SELECT
        s.*,
        r.nombre AS repuesto_nombre,
        r.referencia,
        u.nombre AS nombre_usuario
      FROM salida_repuestos s
      LEFT JOIN repuestos r ON s.repuesto_id = r.repuesto_id
      LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario
      WHERE s.salida_id = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  },

  async update(id, data) {
    const { repuesto_id, cantidad, destino, observacion, fecha, tipo_salida, factura } = data;

    // Primero obtenemos la salida actual para calcular diferencia de stock
    const salidaActual = await this.findById(id);
    if (!salidaActual) throw new Error("Salida no encontrada");

    const query = `
      UPDATE salida_repuestos
      SET repuesto_id = $1,
          cantidad = $2,
          destino = $3,
          observacion = $4,
          fecha = $5,
          tipo_salida = $6,
          factura = $7
      WHERE salida_id = $8
      RETURNING *;
    `;

    const values = [repuesto_id, cantidad, destino || null, observacion || null, fecha, tipo_salida, factura || null, id];
    const { rows } = await pool.query(query, values);
    const salida = rows[0];

    // Ajustar stock según diferencia
    const diferencia = cantidad - salidaActual.cantidad;
    if (diferencia !== 0) {
      if (repuesto_id !== salidaActual.repuesto_id) {
        // Si cambió de repuesto, restaurar el viejo y descontar del nuevo
        await pool.query('UPDATE repuestos SET stock = stock + $1 WHERE repuesto_id = $2', [salidaActual.cantidad, salidaActual.repuesto_id]);
        await pool.query('UPDATE repuestos SET stock = stock - $1 WHERE repuesto_id = $2', [cantidad, repuesto_id]);
      } else {
        await pool.query('UPDATE repuestos SET stock = stock - $1 WHERE repuesto_id = $2', [diferencia, repuesto_id]);
      }
    }

    await AlertaModel.checkStockBajo(repuesto_id);
    return salida;
  },

  async remove(id) {
    const salida = await this.findById(id);
    if (!salida) throw new Error("Salida no encontrada");

    await pool.query('DELETE FROM salida_repuestos WHERE salida_id = $1', [id]);

    // Restaurar stock
    await pool.query(
      'UPDATE repuestos SET stock = stock + $1 WHERE repuesto_id = $2',
      [salida.cantidad, salida.repuesto_id]
    );

    return salida;
  },

  // MÉTODO CORREGIDO Y MEJORADO
  async findRepuestoByBarcode(barcode) {
    if (!barcode || barcode.trim() === '') {
      return null;
    }

    const query = `
      SELECT 
        repuesto_id,
        nombre,
        referencia,
        stock,
        codigo_barras,
        precio_venta
      FROM repuestos
      WHERE codigo_barras = $1
        AND activo = true  -- opcional: solo repuestos activos
      LIMIT 1;
    `;

    try {
      const { rows } = await pool.query(query, [barcode.trim()]);
      return rows[0] || null;  // Devuelve el repuesto o null si no existe
    } catch (error) {
      console.error("Error buscando repuesto por código de barras:", error);
      throw error;
    }
  }
};

module.exports = SalidaModel;