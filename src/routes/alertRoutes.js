const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
// Todas requieren autenticación
router.use(authenticate);
// Acceso según roles

router.get('/products/:id', authorize('admin', 'inventario'), alertController.getAll);
router.get('/', authorize('admin', 'inventario'), alertController.getById);
router.put('/:id/read', authorize('admin', 'inventario'), alertController.markAsRead);
router.delete('/:id', authorize('admin', 'inventario'), alertController.delete);

module.exports = router;
