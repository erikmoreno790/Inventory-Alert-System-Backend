const express = require('express');
const router = express.Router();
const vehiculoController = require('../controllers/vehiculoController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todos los vehículos (con filtros opcionales)
// Query params: ?cliente_id=...&placa=...&marca_modelo=...
router.get('/', authorize('admin', 'user'), vehiculoController.getAll);

// Obtener estadísticas de vehículos
router.get('/stats', authorize('admin'), vehiculoController.getStats);

// Buscar vehículo por placa
router.get('/placa/:placa', authorize('admin', 'user'), vehiculoController.getByPlaca);

// Obtener vehículos de un cliente
router.get('/cliente/:cliente_id', authorize('admin', 'user'), vehiculoController.getByClienteId);

// Obtener vehículo por ID
router.get('/:id', authorize('admin', 'user'), vehiculoController.getById);

// Obtener vehículo con historial de movimientos
router.get('/:id/movimientos', authorize('admin', 'user'), vehiculoController.getByIdWithMovimientos);

// Obtener vehículo con cotizaciones
router.get('/:id/cotizaciones', authorize('admin', 'user'), vehiculoController.getByIdWithCotizaciones);

// Crear nuevo vehículo
router.post('/', authorize('admin', 'user'), vehiculoController.create);

// Actualizar vehículo
router.put('/:id', authorize('admin', 'user'), vehiculoController.update);

// Eliminar vehículo
router.delete('/:id', authorize('admin'), vehiculoController.delete);

module.exports = router;
