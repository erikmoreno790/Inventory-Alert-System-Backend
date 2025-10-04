const express = require('express');
const router = express.Router();
const cotizacionModel = require('../models/CotizacionModel');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const multer = require("multer");
const path = require("path");

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Todas requieren autenticación
router.use(authenticate);

router.post('/', authorize("admin", "user"), upload.array("imagenes", 5), cotizacionModel.crearCotizacion); // Hasta 5 imágenes
router.get('/', authorize("admin", "user"), cotizacionModel.mostrarCotizaciones);
router.get('/:id', authorize("admin", "user"), cotizacionModel.verCotizacion);
router.put('/:id', authorize("admin", "user"), cotizacionModel.actualizarCotizacion);
router.delete('/:id', authorize("admin", "user"), cotizacionModel.eliminarCotizacion);
router.get('/approved/count', authorize("admin", "user"), cotizacionModel.contarCotizacionesAprobadas);


module.exports = router;
