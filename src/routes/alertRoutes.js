const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas requieren autenticación
router.use(authenticate);

// Rutas de alertas (acceso según roles)
router.get('/', authorize('admin', 'inventario'), alertController.getAll);
router.get('/estadisticas', authorize('admin', 'inventario'), alertController.getEstadisticas);
router.get('/:id', authorize('admin', 'inventario'), alertController.getById);
router.put('/:id/read', authorize('admin', 'inventario'), alertController.markAsRead);
router.delete('/:id', authorize('admin', 'inventario'), alertController.delete);
router.post('/generar', authorize('admin', 'inventario'), alertController.generarAlertas);

module.exports = router;
