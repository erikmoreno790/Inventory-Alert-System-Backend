const express = require('express');
const router = express.Router();
const repuestoController = require('../controllers/repuestoController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateCreateRepuesto, validateUpdateRepuesto, validateRepuestoId } = require('../middleware/validators');

// Todas requieren autenticación
router.use(authenticate);

router.get('/barcode/:code', authorize("admin", "user"), repuestoController.getByBarcode); // Obtener un repuesto por código de barras
router.get('/movimientos', authorize("admin", "user"), repuestoController.getAllMovements); // Obtener todos los movimientos de inventario
router.get('/movimientos/:id/:tipo', authorize("admin", "user"), repuestoController.getMovementById);
router.get('/movimientos/:id', authorize("admin", "user"), repuestoController.getMovementsByRepuestoId); // Obtener movimientos de inventario por ID de repuesto
router.post('/movimientos', authorize("admin", "user"), repuestoController.createMovement); // Crear un nuevo movimiento de inventario
router.get('/categoria', authorize("admin", "user"), repuestoController.getCantidadRepuestosPorCategoria);
router.get('/categorias/lista', authorize("admin", "user"), repuestoController.getAllCategorias); // Obtener todas las categorías de repuestos
router.get('/marcas/lista', authorize("admin", "user"), repuestoController.getAllMarcas); // Obtener todas las marcas de repuestos
router.get('/ultimos-agregados', authorize("admin", "user"), repuestoController.getUltimosRepuestosAgregados); // Obtener los últimos repuestos agregados
router.get('/total-cantidad', authorize("admin", "user"), repuestoController.getTotalCantidadRepuestos); // Obtener la cantidad total de repuestos en inventario

router.get('/', authorize("admin", "user"), repuestoController.getAll);
router.get('/:id', authorize("admin", "user"), validateRepuestoId, repuestoController.getById);
router.post('/', authorize("admin"), validateCreateRepuesto, repuestoController.create);
router.put('/:id', authorize("admin"), validateUpdateRepuesto, repuestoController.update);
router.delete('/:id', authorize("admin"), validateRepuestoId, repuestoController.remove);


module.exports = router;