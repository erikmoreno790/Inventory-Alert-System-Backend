const EntradaModel = require('../models/entradaModel');

const entradaController = {
  async create(req, res) {
    try {
      const entrada = await EntradaModel.create(req.body);
      res.status(201).json(entrada);
    } catch (err) {
      console.error("Error creando entrada:", err);
      res.status(500).json({ error: "Error al registrar la entrada" });
    }
  },

  async getAll(req, res) {
  try {
    const entradas = await EntradaModel.findAll();
    res.json(entradas);
    console.log(entradas); // ✅ ahora sí imprime lo recibido
  } catch (err) {
    console.error("Error en getAll:", err); // ✅ log para debug
    res.status(500).json({ error: "Error al obtener entradas" });
  }
},

  async getById(req, res) {
    try {
      const entrada = await EntradaModel.findById(req.params.id);
      if (!entrada) return res.status(404).json({ error: "Entrada no encontrada" });
      res.json(entrada);
    } catch (err) {
      res.status(500).json({ error: "Error al obtener la entrada" });
    }
  },

  async update(req, res) {
    try {
      const updated = await EntradaModel.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Entrada no encontrada" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Error al actualizar la entrada" });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await EntradaModel.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Entrada no encontrada" });
      res.json({ message: "Entrada eliminada y stock revertido", deleted });
    } catch (err) {
      res.status(500).json({ error: "Error al eliminar entrada" });
    }
  }
};

module.exports = entradaController;
