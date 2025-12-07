const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todos los clientes (con filtros opcionales)
// Query params: ?nombre=...&documento=...&email=...&telefono=...
router.get('/', authorize('admin', 'user'), clienteController.getAll);

// Buscar clientes por nombre
// Query param: ?nombre=...
router.get('/search', authorize('admin', 'user'), clienteController.searchByNombre);

// Obtener estadísticas de clientes
router.get('/stats', authorize('admin'), clienteController.getStats);

// Obtener cliente por ID
router.get('/:id', authorize('admin', 'user'), clienteController.getById);

// Obtener cliente con sus vehículos
router.get('/:id/vehiculos', authorize('admin', 'user'), clienteController.getByIdWithVehiculos);

// Crear nuevo cliente
router.post('/', authorize('admin', 'user'), clienteController.create);

// Actualizar cliente
router.put('/:id', authorize('admin', 'user'), clienteController.update);

// Eliminar cliente
router.delete('/:id', authorize('admin'), clienteController.delete);

module.exports = router;
