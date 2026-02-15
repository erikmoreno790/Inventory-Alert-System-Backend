const pool = require('../config/db');

const AlertaModel = {
  // Crear alerta
  async create({ repuesto_id, mensaje, tipo, prioridad }) {
    const result = await pool.query(
      `INSERT INTO alertas (repuesto_id, mensaje, tipo, prioridad) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [repuesto_id, mensaje, tipo, prioridad]
    );
    return result.rows[0];
  },

  // Obtener todas las alertas con paginación y filtros
  async findAll(page = 1, limit = 50, filters = {}) {
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE dinámicamente
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (filters.prioridad) {
      whereConditions.push(`a.prioridad = $${paramIndex}`);
      queryParams.push(filters.prioridad);
      paramIndex++;
    }

    if (filters.leida !== undefined) {
      whereConditions.push(`a.leida = $${paramIndex}`);
      queryParams.push(filters.leida);
      paramIndex++;
    }

    if (filters.tipo) {
      whereConditions.push(`a.tipo = $${paramIndex}`);
      queryParams.push(filters.tipo);
      paramIndex++;
    }

    if (filters.repuesto) {
      whereConditions.push(`LOWER(r.nombre) LIKE $${paramIndex}`);
      queryParams.push(`%${filters.repuesto.toLowerCase()}%`);
      paramIndex++;
    }

    if (filters.categoria) {
      whereConditions.push(`r.categoria = $${paramIndex}`);
      queryParams.push(filters.categoria);
      paramIndex++;
    }

    if (filters.fechaInicio) {
      whereConditions.push(`a.fecha >= $${paramIndex}`);
      queryParams.push(filters.fechaInicio);
      paramIndex++;
    }

    if (filters.fechaFin) {
      whereConditions.push(`a.fecha <= $${paramIndex}`);
      queryParams.push(filters.fechaFin);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Contar total de alertas con filtros
    const countQuery = `
      SELECT COUNT(*) 
      FROM alertas a
      LEFT JOIN repuestos r ON r.repuesto_id = a.repuesto_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Obtener alertas paginadas con filtros
    const dataParams = [...queryParams, limit, offset];
    const dataQuery = `
      SELECT a.*, r.nombre AS repuesto_nombre, r.stock AS stock_actual, 
             r.categoria, r.referencia
      FROM alertas a
      LEFT JOIN repuestos r ON r.repuesto_id = a.repuesto_id
      ${whereClause}
      ORDER BY 
        CASE a.prioridad
          WHEN 'urgente' THEN 1
          WHEN 'alta' THEN 2
          WHEN 'moderada' THEN 3
          WHEN 'baja' THEN 4
          ELSE 5
        END,
        a.fecha DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await pool.query(dataQuery, dataParams);

    return {
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Obtener una alerta por ID
  async findById(id) {
    const result = await pool.query(
      `SELECT a.*, r.nombre AS repuesto_nombre, r.stock AS stock_actual,
              r.categoria, r.referencia
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

  /**
   * Determinar prioridad basada en el stock
   * - urgente: stock = 0
   * - alta: stock = 1
   * - moderada: stock >= 2 y < 5
   * - baja: stock >= 5
   */
  _determinarPrioridad(stock) {
    if (stock === 0) return 'urgente';
    if (stock === 1) return 'alta';
    if (stock >= 2 && stock < 5) return 'moderada';
    return 'baja';
  },

  /**
   * Generar mensaje apropiado según la prioridad
   */
  _generarMensaje(repuesto, prioridad) {
    const stock = Number(repuesto.stock);

    switch (prioridad) {
      case 'urgente':
        return `⚠️ URGENTE: "${repuesto.nombre}" sin stock disponible (0 unidades)`;
      case 'alta':
        return `🔴 ALTA: "${repuesto.nombre}" tiene solo 1 unidad en stock`;
      case 'moderada':
        return `🟡 MODERADA: "${repuesto.nombre}" tiene stock bajo (${stock} unidades)`;
      case 'baja':
        return `🟢 BAJA: "${repuesto.nombre}" tiene stock limitado (${stock} unidades)`;
      default:
        return `"${repuesto.nombre}" - Stock: ${stock} unidades`;
    }
  },

  /**
   * Verificar stock y generar/actualizar alerta
   */
  async checkStockAndAlert(repuesto_id) {
    const result = await pool.query(
      `SELECT * FROM repuestos WHERE repuesto_id = $1 AND activo = TRUE`,
      [repuesto_id]
    );
    const repuesto = result.rows[0];

    if (!repuesto) return null;

    const stock = Number(repuesto.stock);
    const prioridad = this._determinarPrioridad(stock);

    // Si stock >= 5, eliminar alertas existentes (stock normalizado)
    if (stock >= 5) {
      await pool.query(
        `DELETE FROM alertas WHERE repuesto_id = $1 AND leida = FALSE`,
        [repuesto_id]
      );
      return { action: 'deleted', stock };
    }

    // Verificar si ya existe alerta activa para este repuesto
    const alertaExistente = await pool.query(
      `SELECT * FROM alertas 
       WHERE repuesto_id = $1 AND leida = FALSE
       ORDER BY fecha DESC LIMIT 1`,
      [repuesto_id]
    );

    const mensaje = this._generarMensaje(repuesto, prioridad);

    if (alertaExistente.rows.length > 0) {
      // Actualizar alerta existente si la prioridad cambió
      const alertaActual = alertaExistente.rows[0];
      if (alertaActual.prioridad !== prioridad) {
        await pool.query(
          `UPDATE alertas 
           SET prioridad = $1, mensaje = $2, fecha = NOW()
           WHERE alerta_id = $3`,
          [prioridad, mensaje, alertaActual.alerta_id]
        );
        return { action: 'updated', prioridad, stock };
      }
      return { action: 'exists', prioridad, stock };
    } else {
      // Crear nueva alerta
      await this.create({
        repuesto_id: repuesto.repuesto_id,
        mensaje,
        tipo: 'stock_bajo',
        prioridad
      });
      return { action: 'created', prioridad, stock };
    }
  },

  /**
   * Generar alertas para todos los repuestos con stock < 5
   */
  async generarAlertasStockBajo() {
    const result = await pool.query(
      `SELECT * FROM repuestos WHERE stock < 5 AND activo = TRUE`
    );

    const repuestoIds = result.rows.map(r => r.repuesto_id);

    // Batch-fetch existing active alerts for all low-stock repuestos
    let alertasMap = {};
    if (repuestoIds.length > 0) {
      const alertasRes = await pool.query(
        `SELECT DISTINCT ON (repuesto_id) * FROM alertas 
         WHERE repuesto_id = ANY($1) AND leida = FALSE
         ORDER BY repuesto_id, fecha DESC`,
        [repuestoIds]
      );
      for (const a of alertasRes.rows) {
        alertasMap[a.repuesto_id] = a;
      }
    }

    const resultados = {
      urgente: 0,
      alta: 0,
      moderada: 0,
      eliminadas: 0,
      total: 0
    };

    for (const repuesto of result.rows) {
      const stock = Number(repuesto.stock);
      const prioridad = this._determinarPrioridad(stock);

      // stock >= 5 shouldn't appear (WHERE clause), but be safe
      if (stock >= 5) {
        if (alertasMap[repuesto.repuesto_id]) {
          await pool.query(
            `DELETE FROM alertas WHERE repuesto_id = $1 AND leida = FALSE`,
            [repuesto.repuesto_id]
          );
          resultados.eliminadas++;
        }
        resultados.total++;
        continue;
      }

      const mensaje = this._generarMensaje(repuesto, prioridad);
      const alertaExistente = alertasMap[repuesto.repuesto_id];

      if (alertaExistente) {
        if (alertaExistente.prioridad !== prioridad) {
          await pool.query(
            `UPDATE alertas SET prioridad = $1, mensaje = $2, fecha = NOW() WHERE alerta_id = $3`,
            [prioridad, mensaje, alertaExistente.alerta_id]
          );
          resultados[prioridad]++;
        }
      } else {
        await this.create({
          repuesto_id: repuesto.repuesto_id,
          mensaje,
          tipo: 'stock_bajo',
          prioridad
        });
        resultados[prioridad]++;
      }
      resultados.total++;
    }

    return resultados;
  },

  /**
   * Obtener estadísticas de alertas por prioridad
   */
  async getEstadisticas() {
    const result = await pool.query(
      `SELECT 
         prioridad,
         COUNT(*) as cantidad,
         COUNT(CASE WHEN leida = FALSE THEN 1 END) as no_leidas
       FROM alertas
       GROUP BY prioridad
       ORDER BY 
         CASE prioridad
           WHEN 'urgente' THEN 1
           WHEN 'alta' THEN 2
           WHEN 'moderada' THEN 3
           WHEN 'baja' THEN 4
           ELSE 5
         END`
    );
    return result.rows;
  }
};

module.exports = AlertaModel;
