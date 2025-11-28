const express = require('express');
const router = express.Router();
const entradaController = require('../controllers/entradaController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas requieren autenticación
router.use(authenticate);

// CRUD básico
router.post('/', authorize("admin"), entradaController.create);
router.get('/', authorize("admin", "user"), entradaController.getAll);
router.get('/:id', authorize("admin", "user"), entradaController.getById);
router.delete('/:id', authorize("admin"), entradaController.delete);

module.exports = router;