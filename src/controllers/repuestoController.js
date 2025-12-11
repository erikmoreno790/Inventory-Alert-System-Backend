const Repuesto = require('../models/repuestoModel');
const MovimientoModel = require('../models/movimientoModel');
const logger = require('../config/logger');

const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Validar que page y limit sean números positivos
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Parámetros inválidos. Page debe ser >= 1 y limit entre 1 y 100'
      });
    }

    // Obtener filtros opcionales
    const filters = {
      categoria: req.query.categoria,
      nombre: req.query.nombre,
      referencia: req.query.referencia,
      marca: req.query.marca
    };

    const result = await Repuesto.getAllRepuestos(page, limit, filters);
    res.json(result);
  } catch (err) {
    logger.logError('Error al obtener repuestos', err);
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

const getByBarcode = async (req, res) => {
  try {
    const repuesto = await Repuesto.getRepuestoByBarcode(req.params.code);
    if (!repuesto) return res.status(404).json({ message: 'Repuesto no encontrado' });
    res.json(repuesto);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el repuesto por código de barras', details: err.message });
  }
};

const create = async (req, res) => {
  try {
    const userId = req.user?.id_usuario;
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

    // Extraer datos del repuesto y de la entrada inicial
    const { cantidad_inicial, tipo_entrada, ...repuestoData } = req.body;

    // 1. Crear el repuesto (con stock inicial en 0)
    const nuevoRepuesto = await Repuesto.createRepuesto(repuestoData, userId);

    // 2. Registrar entrada inicial si cantidad_inicial > 0
    if (cantidad_inicial && parseInt(cantidad_inicial) > 0) {
      await MovimientoModel.create({
        repuesto_id: nuevoRepuesto.repuesto_id,
        tipo: 'Entrada',
        motivo: tipo_entrada || 'creacion',
        cantidad: parseInt(cantidad_inicial),
        fecha: new Date(),
        observacion: 'Entrada inicial al crear el repuesto',
        id_usuario: userId
      });
    }

    // 3. Recargar el repuesto para obtener el stock actualizado
    const repuestoActualizado = await Repuesto.getRepuestoById(nuevoRepuesto.repuesto_id);

    res.status(201).json(repuestoActualizado);
  } catch (err) {
    logger.logError('Error al crear repuesto', err);
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

    // Extraer nueva_cantidad del body si existe
    const { nueva_cantidad, ...repuestoData } = req.body;

    // 1. Obtener el repuesto actual para comparar stock
    const repuestoActual = await Repuesto.getRepuestoById(req.params.id);
    if (!repuestoActual) return res.status(404).json({ message: 'Repuesto no encontrado' });

    // 2. Actualizar datos del repuesto (sin tocar el stock)
    const actualizado = await Repuesto.updateRepuesto(req.params.id, repuestoData, userId);

    // 3. Si se proporcionó nueva_cantidad, registrar movimiento de ajuste
    if (nueva_cantidad !== undefined && nueva_cantidad !== null) {
      const cantidadNueva = parseInt(nueva_cantidad);
      const cantidadActual = parseInt(repuestoActual.stock);

      if (cantidadNueva !== cantidadActual) {
        const diferencia = cantidadNueva - cantidadActual;
        const tipo = diferencia > 0 ? 'Entrada' : 'Salida';
        const cantidadMovimiento = Math.abs(diferencia);

        await MovimientoModel.create({
          repuesto_id: req.params.id,
          tipo: tipo,
          motivo: 'ajuste',
          cantidad: cantidadMovimiento,
          fecha: new Date(),
          observacion: `Ajuste posterior de cantidad. Stock anterior: ${cantidadActual}, Stock nuevo: ${cantidadNueva}`,
          id_usuario: userId
        });
      }
    }

    // 4. Recargar el repuesto para obtener el stock actualizado
    const repuestoFinal = await Repuesto.getRepuestoById(req.params.id);

    res.json(repuestoFinal);
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

const getAllMovements = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Validar que page y limit sean números positivos
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Parámetros inválidos. Page debe ser >= 1 y limit entre 1 y 100'
      });
    }

    // Extraer filtros de la query
    const filters = {};
    if (req.query.producto) filters.producto = req.query.producto;
    if (req.query.tipo) filters.tipo = req.query.tipo;
    if (req.query.motivo) filters.motivo = req.query.motivo;
    if (req.query.categoria) filters.categoria = req.query.categoria;
    if (req.query.fechaInicio) filters.fechaInicio = req.query.fechaInicio;
    if (req.query.fechaFin) filters.fechaFin = req.query.fechaFin;

    const result = await Repuesto.getAllMovements(page, limit, filters);
    res.json(result);
  } catch (err) {
    logger.logError('Error al obtener movimientos', err);
    res.status(500).json({ error: 'Error al obtener movimientos', details: err.message });
  }
};

const getMovementById = async (req, res) => {
  try {
    console.log(req.params);
    const id = req.params.id;
    const tipo = req.params.tipo;
    const movement = await Repuesto.getMovementById(id, tipo)
    res.json(movement)
  } catch (err) {
    res.status(500).json({
      error: 'Error al obtener el movimiento',
      details: err.message
    });
  }
}

const getMovementsByRepuestoId = async (req, res) => {
  try {
    const id = req.params.id
    const movements = await Repuesto.getMovementsByRepuestoId(id);
    res.json(movements)
  } catch (err) {
    res.status(500).json({
      error: 'Error al obtener los movimientos del repuesto',
      details: err.message
    })
  }
};

const getCantidadRepuestosPorCategoria = async (req, res) => {
  try {
    const result = await Repuesto.getCantidadRepuestosPorCategoria();
    res.json(result);
  } catch (err) {
    logger.logError('Error al obtener cantidad de repuestos por categoría', err);
    res.status(500).json({ error: 'Error al obtener cantidad de repuestos por categoría', details: err.message });
  }
};

const getAllCategorias = async (req, res) => {
  try {
    const categorias = await Repuesto.getAllCategorias();
    res.json(categorias);
  } catch (err) {
    logger.logError('Error al obtener categorías', err);
    res.status(500).json({ error: 'Error al obtener categorías', details: err.message });
  }
};

const getAllMarcas = async (req, res) => {
  try {
    const marcas = await Repuesto.getAllMarcas();
    res.json(marcas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener marcas', details: err.message });
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

const createMovement = async (req, res) => {
  try {
    const userId = req.user?.id_usuario;
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

    const movementData = {
      ...req.body,
      id_usuario: userId
    };

    const newMovement = await MovimientoModel.create(movementData);
    res.status(201).json(newMovement);
  } catch (err) {
    logger.logError('Error al crear movimiento', err);
    res.status(500).json({
      error: 'Error al crear movimiento',
      details: err.message
    });
  }
};


module.exports = {
  getAll,
  getById,
  getByBarcode,
  create,
  update,
  remove,
  getAllMovements,
  getMovementById,
  getMovementsByRepuestoId,
  getCantidadRepuestosPorCategoria,
  getAllCategorias,
  getAllMarcas,
  getUltimosRepuestosAgregados,
  getTotalCantidadRepuestos,
  createMovement
};
