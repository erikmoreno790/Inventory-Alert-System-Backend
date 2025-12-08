const express = require('express');
const router = express.Router();
const recordatorioController = require('../controllers/recordatorioController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todos los recordatorios (con filtros opcionales)
// Query params: ?cliente_id=...&vehiculo_id=...&tipo=...&enviado=...&estado=...&fecha_desde=...&fecha_hasta=...
router.get('/', authorize('admin', 'user'), recordatorioController.getAll);

// Obtener recordatorios pendientes de envío
// Query param: ?fecha_limite=YYYY-MM-DD
router.get('/pendientes', authorize('admin', 'user'), recordatorioController.getPendientes);

// Obtener estadísticas de recordatorios
router.get('/stats', authorize('admin'), recordatorioController.getEstadisticas);

// Obtener recordatorios de un cliente
router.get('/cliente/:cliente_id', authorize('admin', 'user'), recordatorioController.getByClienteId);

// Obtener recordatorios de un vehículo
router.get('/vehiculo/:vehiculo_id', authorize('admin', 'user'), recordatorioController.getByVehiculoId);

// Obtener un recordatorio por ID
router.get('/:id', authorize('admin', 'user'), recordatorioController.getById);

// Crear nuevo recordatorio
router.post('/', authorize('admin', 'user'), recordatorioController.create);

// Crear recordatorio automático desde última cotización
// Body: { vehiculo_id }
// Query param: ?dias=90 (opcional, default 90)
router.post('/auto-create', authorize('admin', 'user'), recordatorioController.createFromLastQuotation);

// Enviar SMS de un recordatorio específico
router.post('/:id/enviar', authorize('admin', 'user'), recordatorioController.enviarSMS);

// Enviar SMS masivo a recordatorios pendientes
// Body: { fecha_limite } (opcional)
router.post('/enviar-masivo', authorize('admin'), recordatorioController.enviarSMSMasivo);

// Cancelar un recordatorio
router.post('/:id/cancelar', authorize('admin', 'user'), recordatorioController.cancelar);

// Actualizar recordatorio
router.put('/:id', authorize('admin', 'user'), recordatorioController.update);

// Eliminar recordatorio
router.delete('/:id', authorize('admin'), recordatorioController.delete);

module.exports = router;
