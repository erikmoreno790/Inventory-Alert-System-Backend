const express = require('express');
const router = express.Router();
const repuestoController = require('../controllers/repuestoController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas requieren autenticación
router.use(authenticate);

router.get('/movimientos', repuestoController.getAllMovements); // Obtener todos los movimientos de inventario
router.get('/categoria', authorize("admin", "user"), repuestoController.getCantidadRepuestosPorCategoria);
//router.get('/movimientos/:id', repuestoController.getMovementsByRepuestoId); // Obtener movimientos de inventario por ID de repuesto



router.get('/', repuestoController.getAll);
router.get('/:id', repuestoController.getById);
router.post('/', repuestoController.create);
router.put('/:id', repuestoController.update);
router.delete('/:id', repuestoController.remove);

// Consultas adicionales



module.exports = router;