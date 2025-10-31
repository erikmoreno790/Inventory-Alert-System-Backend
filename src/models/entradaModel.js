const pool = require('../config/db');

const entradaModel = {
  // Crear una nueva entrada asociada al usuario que la crea
  async create({ repuesto_id, cantidad, proveedor, factura, observacion, fecha, tipo_entrada }) {
    const query = `
    INSERT INTO entrada_repuestos 
      (repuesto_id, cantidad, proveedor, factura, observacion, fecha, tipo_entrada)
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

    const values = [
      repuesto_id,
      cantidad,
      proveedor,
      factura,
      observacion,
      fecha,
      tipo_entrada,
    ];

    // Ejecutar inserción
    const { rows } = await pool.query(query, values);
    const entrada = rows[0];

    // Actualizar stock correctamente
    await pool.query(
      'UPDATE repuestos SET stock = stock + $1 WHERE repuesto_id = $2;',
      [cantidad, repuesto_id]
    );

    return entrada;
  },

  // Listar todas las entrada_repuestos con nombre del repuesto
  async findAll() {
    const query = `
    SELECT 
      e.entrada_id,
      e.repuesto_id,
      r.nombre AS repuesto,
      e.cantidad,
      e.proveedor,
      e.factura,
      e.observacion,
      e.fecha,
      e.tipo_entrada,
      u.id_usuario,
      u.nombre AS nombre_usuario
    FROM entrada_repuestos e
    LEFT JOIN repuestos r ON e.repuesto_id = r.repuesto_id
    LEFT JOIN usuarios u ON e.id_usuario = u.id_usuario
    ORDER BY e.fecha DESC;
  `;

    const { rows } = await pool.query(query);
    return rows;
  },


  // Obtener una entrada por ID con nombre del repuesto
  async findById(id) {
    const query = `
      SELECT e.entrada_id, e.repuesto_id, r.nombre AS repuesto, e.cantidad, 
             e.proveedor, e.factura, e.observacion, e.fecha, e.tipo_entrada
      FROM entrada_repuestos e
      LEFT JOIN repuestos r ON e.repuesto_id = r.repuesto_id
      WHERE e.entrada_id = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // Actualizar una entrada
  async update(id, { repuesto_id, cantidad, proveedor, factura, observacion, fecha, tipo_entrada }) {
    const query = `
      UPDATE entrada_repuestos
      SET repuesto_id = $1,
          cantidad = $2,
          proveedor = $3,
          factura = $4,
          observacion = $5,
          fecha = $6,
          tipo_entrada = $7
      WHERE entrada_id = $8
      RETURNING *;
    `;

    // Actualizar stock del repuesto (asumiendo que la cantidad puede cambiar)
    const entradaActual = await this.findById(id);
    if (entradaActual) {
      const diferencia = cantidad - entradaActual.cantidad;
      await pool.query(
        'UPDATE repuestos SET stock = stock + $1 WHERE repuesto_id = $2;',
        [diferencia, repuesto_id]
      );
    }

    const values = [repuesto_id, cantidad, proveedor, factura, observacion, fecha, tipo_entrada, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Eliminar una entrada
  async delete(id) {
    const query = 'DELETE FROM entrada_repuestos WHERE entrada_id = $1 RETURNING *;';
    const { rows } = await pool.query(query, [id]);
    entrada = rows[0];

    // Restaurar stock del repuesto
    if (entrada) {
      await pool.query(
        'UPDATE repuestos SET stock = stock - $1 WHERE repuesto_id = $2;',
        [entrada.cantidad, entrada.repuesto_id]
      );
    };
    return entrada;
  },
};

module.exports = entradaModel;
