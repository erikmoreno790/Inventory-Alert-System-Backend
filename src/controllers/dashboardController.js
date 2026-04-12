const pool = require('../config/db');
const logger = require('../config/logger');

/**
 * GET /api/dashboard/summary
 * Endpoint consolidado que devuelve todos los datos del dashboard en una sola petición.
 */
const getSummary = async (req, res) => {
  try {
    const [
      cotizacionesResult,
      totalRepuestosResult,
      estadisticasResult,
      ultimosRepuestosResult,
      movimientosResult,
    ] = await Promise.all([
      // Total cotizaciones aprobadas
      pool.query(
        `SELECT COUNT(*) AS count FROM cotizaciones WHERE estatus = 'Aprobada'`
      ),
      // Total stock
      pool.query(
        `SELECT SUM(stock) AS total_cantidad FROM repuestos`
      ),
      // Estadísticas de alertas por prioridad
      pool.query(
        `SELECT prioridad, COUNT(*) AS cantidad,
                COUNT(CASE WHEN leida = FALSE THEN 1 END) AS no_leidas
         FROM alertas
         GROUP BY prioridad
         ORDER BY CASE prioridad
           WHEN 'urgente' THEN 1
           WHEN 'alta' THEN 2
           WHEN 'moderada' THEN 3
           WHEN 'baja' THEN 4
           ELSE 5
         END`
      ),
      // Últimos 5 repuestos agregados
      pool.query(
        `SELECT repuesto_id, nombre, categoria, stock, referencia, fecha_actualizacion, codigo_barras
         FROM repuestos
         ORDER BY fecha_actualizacion DESC
         LIMIT 5`
      ),
      // Últimos 5 movimientos
      pool.query(
        `SELECT
           m.movimiento_id,
           m.repuesto_id,
           r.nombre AS repuesto,
           r.categoria,
           r.referencia,
           m.cantidad,
           m.fecha,
           m.motivo AS subtipo,
           m.tipo AS tipo_movimiento
         FROM movimientos_inventario m
         LEFT JOIN repuestos r ON m.repuesto_id = r.repuesto_id
         ORDER BY m.fecha DESC
         LIMIT 5`
      ),
    ]);

    const totalCotizaciones = parseInt(cotizacionesResult.rows[0].count || 0, 10);
    const totalRepuestos = parseInt(totalRepuestosResult.rows[0].total_cantidad || 0, 10);
    const estadisticas = estadisticasResult.rows;
    const ultimosRepuestos = ultimosRepuestosResult.rows;
    const ultimosMovimientos = movimientosResult.rows;

    const stockBajo = estadisticas.find((s) => s.prioridad === 'urgente')?.no_leidas || 0;
    const totalAlertasNoLeidas = estadisticas.reduce(
      (sum, s) => sum + parseInt(s.no_leidas || 0, 10),
      0
    );

    res.json({
      totalCotizaciones,
      totalRepuestos,
      stockBajo,
      totalAlertasNoLeidas,
      estadisticas,
      ultimosRepuestos,
      ultimosMovimientos,
    });
  } catch (error) {
    logger.logError('Error al obtener resumen del dashboard', error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard', details: error.message });
  }
};

module.exports = { getSummary };
