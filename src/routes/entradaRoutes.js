const express = require('express');
const router = express.Router();
const entradaController = require('../controllers/entradaController');

// CRUD básico
router.post('/', entradaController.create);
router.get('/', entradaController.getAll);
router.get('/:id', entradaController.getById);
router.delete('/:id', entradaController.delete);

module.exports = router;