const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación + rol admin o user
router.use(authenticate);

// Data endpoints
router.get('/ventas', authorize('admin', 'user'), reporteController.getVentas);
router.get('/inventario', authorize('admin', 'user'), reporteController.getInventario);
router.get('/mecanicos', authorize('admin', 'user'), reporteController.getMecanicos);
router.get('/clientes', authorize('admin', 'user'), reporteController.getClientes);
router.get('/movimientos', authorize('admin', 'user'), reporteController.getMovimientos);

// PDF download endpoints
router.get('/:tipo/pdf', authorize('admin', 'user'), reporteController.downloadPDF);

module.exports = router;
