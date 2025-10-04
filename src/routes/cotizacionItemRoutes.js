const express = require('express');
const router = express.Router();
const cotizacionItemController = require('../controllers/CotizacionItemController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas requieren autenticación
router.use(authenticate);

router.get('/reporte-aprobadas', authorize("admin", "user"), cotizacionItemController.getApprovedItemsReportByDate);
router.get('/:id', authorize("admin", "user"), cotizacionItemController.getByCotizacionId);
router.post('/', authorize("admin", "user"), cotizacionItemController.create);
router.put('/:id', authorize("admin", "user"), cotizacionItemController.update);
router.delete('/:id', authorize("admin", "user"), cotizacionItemController.delete);


module.exports = router;
