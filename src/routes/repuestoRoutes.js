const express = require('express');
const router = express.Router();
const repuestoController = require('../controllers/repuestoController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas requieren autenticación
router.use(authenticate);

router.get('/barcode/:code', repuestoController.getByBarcode); // Obtener un repuesto por código de barras
router.get('/movimientos', repuestoController.getAllMovements); // Obtener todos los movimientos de inventario
router.get('/movimientos/:id/:tipo', repuestoController.getMovementById);
router.get('/movimientos/:id', repuestoController.getMovementsByRepuestoId); // Obtener movimientos de inventario por ID de repuesto
router.get('/categoria', authorize("admin", "user"), repuestoController.getCantidadRepuestosPorCategoria);
router.get('/categorias/lista', repuestoController.getAllCategorias); // Obtener todas las categorías de repuestos
router.get('/ultimos-agregados', repuestoController.getUltimosRepuestosAgregados); // Obtener los últimos repuestos agregados
router.get('/total-cantidad', repuestoController.getTotalCantidadRepuestos); // Obtener la cantidad total de repuestos en inventario

router.get('/', repuestoController.getAll);
router.get('/:id', repuestoController.getById);
router.post('/', repuestoController.create);
router.put('/:id', repuestoController.update);
router.delete('/:id', repuestoController.remove);


module.exports = router;