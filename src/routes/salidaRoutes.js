const express = require('express');
const router = express.Router();
const salidaController = require('../controllers/salidaController');

// CRUD básico
router.post('/', salidaController.create);
router.get('/', salidaController.getAll);
router.get('/:id', salidaController.getById);
router.delete('/:id', salidaController.delete);

module.exports = router;
