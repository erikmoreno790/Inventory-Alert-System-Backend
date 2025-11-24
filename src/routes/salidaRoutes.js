const express = require('express');
const router = express.Router();
const salidaController = require('../controllers/salidaController');



// CRUD básico
router.post('/', (req, res, next) => {
  console.log("📨 Datos recibidos en POST /salidas:");
  console.log(req.body);
  next(); // Continúa al controller
}, salidaController.create);
router.get('/', salidaController.getAll);
router.get('/:id', salidaController.getById);
router.delete('/:id', salidaController.delete);

module.exports = router;
