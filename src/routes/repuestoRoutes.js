const express = require('express');
const router = express.Router();
const repuestoController = require('../controllers/repuestoController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas requieren autenticación
//router.use(authenticate);

router.get('/movimientos', repuestoController.getAllMovements); // Obtener todos los movimientos de inventario
//router.get('/movimientos/:id', repuestoController.getMovementsByRepuestoId); // Obtener movimientos de inventario por ID de repuesto



router.get('/', repuestoController.getAll);
router.get('/:id', repuestoController.getById);
router.post('/', repuestoController.create);
router.put('/:id', repuestoController.update);
router.delete('/:id', repuestoController.remove);

// Consultas adicionales
router.get('/stock/minimo', authorize("admin", "user"), repuestoController.getBelowStockMin); // Ruta para repuestos por debajo del stock mínimo
router.get('/categoria/:categoria', authorize("admin", "user"), repuestoController.getByCategoria); // Ruta para repuestos por categoría
router.get('/proveedor/:proveedor', authorize("admin", "user"), repuestoController.getByProveedor);
router.get('/disponibles', authorize("admin", "user"), repuestoController.getDisponibles);
router.get('/top/minstock', authorize("admin", "user"), repuestoController.getTopMinStock);
router.get('/valor/inventario', authorize("admin", "user"), repuestoController.getValorInventario);
router.get('/cantidad/categoria', authorize("admin", "user"), repuestoController.getCantidadPorCategoria);

module.exports = router;