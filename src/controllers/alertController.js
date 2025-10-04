const AlertaModel = require('../models/alertModel');

const AlertaController = {
  // Obtener todas las alertas
  async getAll(req, res) {
    try {
      const alertas = await AlertaModel.findAll();
      res.json(alertas);
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
  }
};

module.exports = AlertaController;
