const express = require('express');
const router = express.Router();
const repuestoController = require('../controllers/repuestoController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas requieren autenticación
router.use(authenticate);

router.get('/barcode/:code', authorize("admin", "user"), repuestoController.getByBarcode); // Obtener un repuesto por código de barras
router.get('/movimientos', authorize("admin", "user"), repuestoController.getAllMovements); // Obtener todos los movimientos de inventario
router.get('/movimientos/:id/:tipo', authorize("admin", "user"), repuestoController.getMovementById);
router.get('/movimientos/:id', authorize("admin", "user"), repuestoController.getMovementsByRepuestoId); // Obtener movimientos de inventario por ID de repuesto
router.get('/categoria', authorize("admin", "user"), repuestoController.getCantidadRepuestosPorCategoria);
router.get('/categorias/lista', repuestoController.getAllCategorias); // Obtener todas las categorías de repuestos
router.get('/ultimos-agregados', repuestoController.getUltimosRepuestosAgregados); // Obtener los últimos repuestos agregados
router.get('/total-cantidad', repuestoController.getTotalCantidadRepuestos); // Obtener la cantidad total de repuestos en inventario

router.get('/', authorize("admin", "user"), repuestoController.getAll);
router.get('/:id', authorize("admin", "user"), repuestoController.getById);
router.post('/', authorize("admin"), repuestoController.create);
router.put('/:id', authorize("admin"), repuestoController.update);
router.delete('/:id', authorize("admin"), repuestoController.remove);


module.exports = router;