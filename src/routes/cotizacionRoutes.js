const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const cotizacionInventarioController = require('../controllers/cotizacionInventarioController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const multer = require("multer");
const path = require("path");

// Configuración de multer con límites de seguridad
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    // Sanitizar nombre de archivo
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + "-" + safeFilename);
  },
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG y WebP.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por archivo
    files: 5 // Máximo 5 archivos
  }
});

// Todas requieren autenticación
router.use(authenticate);

// 🔹 Rutas específicas PRIMERO (antes de /:id para evitar conflictos)
router.get('/approved/count', authorize("admin", "user"), cotizacionController.countApproved);
router.post('/validar-stock', authorize("admin", "user"), cotizacionInventarioController.validarStock);

// 🔹 Rutas de inventario con ID
router.post('/:id/aprobar', authorize("admin", "user"), cotizacionInventarioController.aprobarCotizacion);
router.get('/:id/movimientos', authorize("admin", "user"), cotizacionInventarioController.verMovimientos);
// Generación de PDF con Puppeteer
router.get('/:id/pdf', authorize("admin", "user"), cotizacionController.generatePdf);

// 🔹 Rutas CRUD principales
router.post('/', authorize("admin", "user"), upload.array("imagenes", 5), cotizacionController.create);
router.get('/', authorize("admin", "user"), cotizacionController.getAll);
router.get('/:id', authorize("admin", "user"), cotizacionController.getById);
router.put('/:id', authorize("admin", "user"), cotizacionController.update);
router.delete('/:id', authorize("admin"), cotizacionController.delete);


module.exports = router;
