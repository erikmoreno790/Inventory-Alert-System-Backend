const express = require('express');
const router = express.Router();
const salidaController = require('../controllers/salidaController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas requieren autenticación
router.use(authenticate);

// CRUD básico
router.post('/', authorize("admin"), salidaController.create);
router.get('/', authorize("admin", "user"), salidaController.getAll);
router.get('/:id', authorize("admin", "user"), salidaController.getById);
router.delete('/:id', authorize("admin"), salidaController.delete);

module.exports = router;
