const Repuesto = require('../models/repuestoModel');

const getAll = async (req, res) => {
  try {
    const repuestos = await Repuesto.getAllRepuestos();
    res.json(repuestos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener repuestos', details: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const repuesto = await Repuesto.getRepuestoById(req.params.id);
    if (!repuesto) return res.status(404).json({ message: 'Repuesto no encontrado' });
    res.json(repuesto);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el repuesto', details: err.message });
  }
};

const create = async (req, res) => {
  try {
    const userId = req.user?.id_usuario; // ID del usuario autenticado
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

    const nuevo = await Repuesto.createRepuesto(req.body, userId);
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(500).json({
      error: 'Error al crear repuesto',
      details: err.message
    });
  }
};

const update = async (req, res) => {
  try {
    const userId = req.user?.id_usuario;
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

    const actualizado = await Repuesto.updateRepuesto(req.params.id, req.body, userId);
    if (!actualizado) return res.status(404).json({ message: 'Repuesto no encontrado' });

    res.json(actualizado);
  } catch (err) {
    res.status(500).json({
      error: 'Error al actualizar repuesto',
      details: err.message
    });
  }
};

const remove = async (req, res) => {
  try {
    const userId = req.user?.id_usuario;
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

    const eliminado = await Repuesto.deleteRepuesto(req.params.id, userId);
    if (!eliminado) return res.status(404).json({ message: 'Repuesto no encontrado' });

    res.json({ message: 'Repuesto eliminado correctamente', eliminado });
  } catch (err) {
    res.status(500).json({
      error: 'Error al eliminar repuesto',
      details: err.message
    });
  }
};


const getBelowStockMin = async (req, res) => {
  try {
    const result = await Repuesto.getBelowStockMin();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener repuestos bajo stock mínimo', details: err.message });
  }
};

const getByCategoria = async (req, res) => {
  try {
    const result = await Repuesto.getByCategoria(req.params.categoria);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener repuestos por categoría', details: err.message });
  }
};

const getByProveedor = async (req, res) => {
  try {
    const result = await Repuesto.getByProveedor(req.params.proveedor);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener repuestos por proveedor', details: err.message });
  }
};

const getDisponibles = async (req, res) => {
  try {
    const result = await Repuesto.getDisponibles();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener repuestos disponibles', details: err.message });
  }
};

const getTopMinStock = async (req, res) => {
  try {
    const limit = req.query.limit || 5;
    const result = await Repuesto.getTopMinStock(limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener repuestos con menor stock', details: err.message });
  }
};

const getValorInventario = async (req, res) => {
  try {
    const result = await Repuesto.getValorInventario();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al calcular valor de inventario', details: err.message });
  }
};

const getCantidadPorCategoria = async (req, res) => {
  try {
    const result = await Repuesto.getCantidadPorCategoria();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cantidad de repuestos por categoría', details: err.message });
  }
};

const getAllMovements = async (req, res) => {
  try {
    const movements = await Repuesto.getAllMovements();
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener movimientos', details: err.message });
  }
};

const getCantidadRepuestosPorCategoria = async (req, res) => {
  try {
    console.log("Llegó a controller");
    const result = await Repuesto.getCantidadRepuestosPorCategoria();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cantidad de repuestos por categoría', details: err.message });
  }
};

const getAllCategorias = async (req, res) => {
  try {
    const categorias = await Repuesto.getAllCategorias();
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías', details: err.message });
  }
};
const getUltimosRepuestosAgregados = async (req, res) => {
  try {
    const limit = req.query.limit || 5;
    const repuestos = await Repuesto.getUltimosRepuestosAgregados(limit);
    res.json(repuestos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener últimos repuestos agregados', details: err.message });
  }
};

const getTotalCantidadRepuestos = async (req, res) => {
  try {
    const total = await Repuesto.getTotalCantidadRepuestos();
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener la cantidad total de repuestos', details: err.message });
  }
};


module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getAll,
  getById,
  getBelowStockMin, getByCategoria, getByProveedor,
  getDisponibles, getTopMinStock, getValorInventario, getCantidadPorCategoria,
  getAllMovements,
  getCantidadRepuestosPorCategoria,
  getAllCategorias,
  getUltimosRepuestosAgregados,
  getTotalCantidadRepuestos
};
