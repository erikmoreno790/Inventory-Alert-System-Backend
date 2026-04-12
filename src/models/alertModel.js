const pool = require('../config/db');
const whatsappService = require('../services/whatsappService');
const logger = require('../config/logger');

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
             r.stock_minimo, r.categoria, r.referencia
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
              r.stock_minimo, r.categoria, r.referencia
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
   * Determinar prioridad basada en el stock y stock_minimo del producto
   * - urgente: stock = 0
   * - alta: stock > 0 y stock <= 25% del stock_minimo
   * - moderada: stock > 25% del stock_minimo y stock < stock_minimo
   * - baja: stock >= stock_minimo (se auto-elimina)
   */
  _determinarPrioridad(stock, stockMinimo = 5) {
    if (stock === 0) return 'urgente';
    const umbralAlta = Math.max(1, Math.floor(stockMinimo * 0.25));
    if (stock <= umbralAlta) return 'alta';
    if (stock < stockMinimo) return 'moderada';
    return 'baja';
  },

  /**
   * Generar mensaje apropiado según la prioridad
   */
  _generarMensaje(repuesto, prioridad) {
    const stock = Number(repuesto.stock);
    const stockMinimo = Number(repuesto.stock_minimo || 5);

    switch (prioridad) {
      case 'urgente':
        return `⚠️ URGENTE: "${repuesto.nombre}" sin stock disponible (0 unidades) [Mín: ${stockMinimo}]`;
      case 'alta':
        return `🔴 ALTA: "${repuesto.nombre}" stock crítico (${stock} de ${stockMinimo} unidades)`;
      case 'moderada':
        return `🟡 MODERADA: "${repuesto.nombre}" stock bajo (${stock} de ${stockMinimo} unidades)`;
      case 'baja':
        return `🟢 BAJA: "${repuesto.nombre}" stock limitado (${stock} unidades)`;
      default:
        return `"${repuesto.nombre}" - Stock: ${stock}/${stockMinimo} unidades`;
    }
  },

  /**
   * Verificar stock y generar/actualizar alerta
   * Usa stock_minimo del producto para determinar umbrales
   * Envía WhatsApp solo cuando se crea una nueva alerta
   */
  async checkStockAndAlert(repuesto_id) {
    const result = await pool.query(
      `SELECT * FROM repuestos WHERE repuesto_id = $1 AND activo = TRUE`,
      [repuesto_id]
    );
    const repuesto = result.rows[0];

    if (!repuesto) return null;

    const stock = Number(repuesto.stock);
    const stockMinimo = Number(repuesto.stock_minimo || 5);
    const prioridad = this._determinarPrioridad(stock, stockMinimo);

    // Si stock >= stock_minimo, eliminar alertas existentes (stock normalizado)
    if (stock >= stockMinimo) {
      await pool.query(
        `DELETE FROM alertas WHERE repuesto_id = $1 AND leida = FALSE`,
        [repuesto_id]
      );
      return { action: 'deleted', stock, stockMinimo };
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
        return { action: 'updated', prioridad, stock, stockMinimo };
      }
      return { action: 'exists', prioridad, stock, stockMinimo };
    } else {
      // Crear nueva alerta
      const nuevaAlerta = await this.create({
        repuesto_id: repuesto.repuesto_id,
        mensaje,
        tipo: 'stock_bajo',
        prioridad
      });

      // Enviar notificación WhatsApp (solo para alertas nuevas)
      try {
        const whatsappResult = await whatsappService.sendStockAlert(repuesto);
        if (whatsappResult.sent > 0) {
          await pool.query(
            `UPDATE alertas SET whatsapp_enviado = TRUE WHERE alerta_id = $1`,
            [nuevaAlerta.alerta_id]
          );
        }
      } catch (whatsappError) {
        logger.logError('Error al enviar WhatsApp de stock bajo', whatsappError, { repuesto_id });
        // No fallamos la alerta si falla el WhatsApp
      }

      return { action: 'created', prioridad, stock, stockMinimo };
    }
  },

  /**
   * Generar alertas para todos los repuestos con stock < stock_minimo
   */
  async generarAlertasStockBajo() {
    const result = await pool.query(
      `SELECT * FROM repuestos WHERE stock < stock_minimo AND activo = TRUE`
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
      const stockMinimo = Number(repuesto.stock_minimo || 5);
      const prioridad = this._determinarPrioridad(stock, stockMinimo);

      // stock >= stock_minimo shouldn't appear (WHERE clause), but be safe
      if (stock >= stockMinimo) {
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
