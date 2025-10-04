const SalidaModel = require('../models/salidaModel');

const salidaController = {
  async create(req, res) {
    try {
      const salida = await SalidaModel.create(req.body);
      res.status(201).json(salida);
    } catch (err) {
      console.error("Error creando salida:", err);
      res.status(500).json({ error: "Error al registrar la salida" });
    }
  },

  async getAll(req, res) {
    try {
      const salidas = await SalidaModel.findAll();
      res.json(salidas);
      console.log(salidas); // ✅ ahora sí imprime lo recibido
    } catch (err) {
      res.status(500).json({ error: "Error al obtener salidas" });
    }
  },

  async getById(req, res) {
    try {
      const salida = await SalidaModel.findById(req.params.id);
      if (!salida) return res.status(404).json({ error: "Salida no encontrada" });
      res.json(salida);
    } catch (err) {
      res.status(500).json({ error: "Error al obtener la salida" });
    }
  },

  async update(req, res) {
    try {
      const salida = await SalidaModel.update(req.params.id, req.body);
      if (!salida) return res.status(404).json({ error: "Salida no encontrada" });
      res.json(salida);
    } catch (err) {
      res.status(500).json({ error: "Error al actualizar la salida" });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await SalidaModel.remove(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Salida no encontrada" });
      res.json({ message: "Salida eliminada y stock revertido", deleted });
    } catch (err) {
      res.status(500).json({ error: "Error al eliminar salida" });
    }
  }
};

module.exports = salidaController;
