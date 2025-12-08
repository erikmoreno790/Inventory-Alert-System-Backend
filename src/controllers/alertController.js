const AlertaModel = require('../models/alertModel');

const AlertaController = {
  // Obtener todas las alertas con paginación y filtros
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      // Validar parámetros
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          error: 'Parámetros inválidos. Page debe ser >= 1 y limit entre 1 y 100'
        });
      }

      // Extraer filtros
      const filters = {};
      if (req.query.prioridad) filters.prioridad = req.query.prioridad;
      if (req.query.leida !== undefined) filters.leida = req.query.leida === 'true';
      if (req.query.tipo) filters.tipo = req.query.tipo;
      if (req.query.fechaInicio) filters.fechaInicio = req.query.fechaInicio;
      if (req.query.fechaFin) filters.fechaFin = req.query.fechaFin;
      if (req.query.repuesto) filters.repuesto = req.query.repuesto;

      const result = await AlertaModel.findAll(page, limit, filters);
      res.json(result);
    } catch (error) {
      console.error('Error al obtener alertas:', error);
      res.status(500).json({ error: 'Error al obtener alertas' });
    }
  },

  // Obtener una alerta específica
  async getById(req, res) {
    try {
      const alerta = await AlertaModel.findById(req.params.id);
      if (!alerta) {
        return res.status(404).json({ error: 'Alerta no encontrada' });
      }
      res.json(alerta);
    } catch (error) {
      console.error('Error al obtener alerta:', error);
      res.status(500).json({ error: 'Error al obtener alerta' });
    }
  },

  // Marcar como leída
  async markAsRead(req, res) {
    try {
      const alerta = await AlertaModel.markAsRead(req.params.id);
      if (!alerta) {
        return res.status(404).json({ error: 'Alerta no encontrada' });
      }
      res.json(alerta);
    } catch (error) {
      console.error('Error al marcar alerta como leída:', error);
      res.status(500).json({ error: 'Error al marcar alerta' });
    }
  },

  // Eliminar alerta
  async delete(req, res) {
    try {
      const alerta = await AlertaModel.delete(req.params.id);
      if (!alerta) {
        return res.status(404).json({ error: 'Alerta no encontrada' });
      }
      res.json({ mensaje: 'Alerta eliminada', alerta });
    } catch (error) {
      console.error('Error al eliminar alerta:', error);
      res.status(500).json({ error: 'Error al eliminar alerta' });
    }
  },

  // Generar alertas manualmente para todos los repuestos
  async generarAlertas(req, res) {
    try {
      const resultados = await AlertaModel.generarAlertasStockBajo();
      res.json({
        mensaje: 'Proceso de generación de alertas completado',
        resultados
      });
    } catch (error) {
      console.error('Error al generar alertas:', error);
      res.status(500).json({ error: 'Error al generar alertas' });
    }
  },

  // Obtener estadísticas de alertas
  async getEstadisticas(req, res) {
    try {
      const estadisticas = await AlertaModel.getEstadisticas();
      res.json(estadisticas);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  }
};

module.exports = AlertaController;
