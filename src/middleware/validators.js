const { body, param, query, validationResult } = require('express-validator');

// Middleware para verificar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Errores de validación',
            errors: errors.array()
        });
    }
    next();
};

// ==================== VALIDACIONES PARA AUTENTICACIÓN ====================
const validateLogin = [
    body('email')
        .isEmail().withMessage('Email inválido')
        .trim(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida'),
    handleValidationErrors
];

const validateRegister = [
    body('name')
        .notEmpty().withMessage('El nombre es requerido')
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('email')
        .isEmail().withMessage('Email inválido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('role')
        .optional()
        .isIn(['admin', 'user']).withMessage('El rol debe ser admin o user'),
    handleValidationErrors
];

// ==================== VALIDACIONES PARA REPUESTOS ====================
const validateCreateRepuesto = [
    body('nombre')
        .notEmpty().withMessage('El nombre es requerido')
        .trim()
        .isLength({ max: 200 }).withMessage('El nombre no puede exceder 200 caracteres'),
    body('referencia')
        .optional()
        .trim(),
    body('categoria')
        .notEmpty().withMessage('La categoría es requerida')
        .trim(),
    body('marca')
        .optional()
        .trim(),
    body('proveedor')
        .optional()
        .trim(),
    body('stock_minimo')
        .optional()
        .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero positivo'),
    body('precio_unitario_costo')
        .optional()
        .isFloat({ min: 0 }).withMessage('El precio de costo debe ser un número positivo'),
    body('precio_unitario_venta')
        .optional()
        .isFloat({ min: 0 }).withMessage('El precio de venta debe ser un número positivo'),
    body('unidad_medida')
        .optional()
        .trim(),
    body('estado')
        .optional()
        .isIn(['activo', 'inactivo']).withMessage('El estado debe ser activo o inactivo'),
    body('codigo_barras')
        .optional()
        .trim(),
    body('cantidad_inicial')
        .optional()
        .isInt({ min: 0 }).withMessage('La cantidad inicial debe ser un número entero positivo'),
    body('tipo_entrada')
        .optional()
        .isIn(['compra', 'devolucion', 'ajuste', 'creacion', 'otro']).withMessage('Tipo de entrada inválido'),
    handleValidationErrors
];

const validateUpdateRepuesto = [
    param('id').isInt({ min: 1 }).withMessage('ID de repuesto inválido'),
    ...validateCreateRepuesto
];

const validateRepuestoId = [
    param('id').isInt({ min: 1 }).withMessage('ID de repuesto inválido'),
    handleValidationErrors
];

// ==================== VALIDACIONES PARA ENTRADAS ====================
const validateCreateEntrada = [
    body('repuesto_id')
        .isInt({ min: 1 }).withMessage('ID de repuesto inválido'),
    body('cantidad')
        .isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero positivo'),
    body('proveedor')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('El proveedor no puede exceder 200 caracteres'),
    body('factura')
        .optional()
        .trim(),
    body('observacion')
        .optional()
        .trim(),
    body('fecha')
        .isISO8601().withMessage('Fecha inválida (formato: YYYY-MM-DD)'),
    body('tipo_entrada')
        .isIn(['compra', 'devolucion', 'ajuste', 'otro']).withMessage('Tipo de entrada inválido'),
    handleValidationErrors
];

const validateUpdateEntrada = [
    param('id').isInt({ min: 1 }).withMessage('ID de entrada inválido'),
    ...validateCreateEntrada
];

// ==================== VALIDACIONES PARA SALIDAS ====================
const validateCreateSalida = [
    body('repuesto_id')
        .isInt({ min: 1 }).withMessage('ID de repuesto inválido'),
    body('cantidad')
        .isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero positivo'),
    body('destino')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('El destino no puede exceder 200 caracteres'),
    body('observacion')
        .optional()
        .trim(),
    body('fecha')
        .isISO8601().withMessage('Fecha inválida (formato: YYYY-MM-DD)'),
    body('tipo_salida')
        .isIn(['venta', 'uso_interno', 'devolucion', 'ajuste', 'otro']).withMessage('Tipo de salida inválido'),
    body('factura')
        .optional()
        .trim(),
    handleValidationErrors
];

const validateUpdateSalida = [
    param('id').isInt({ min: 1 }).withMessage('ID de salida inválido'),
    ...validateCreateSalida
];

// ==================== VALIDACIONES PARA COTIZACIONES ====================
const validateCreateCotizacion = [
    body('nombre_cliente')
        .notEmpty().withMessage('El nombre del cliente es requerido')
        .trim(),
    body('placa')
        .notEmpty().withMessage('La placa es requerida')
        .trim(),
    body('fecha')
        .optional()
        .isISO8601().withMessage('Fecha inválida'),
    body('nit_cc')
        .optional()
        .trim(),
    body('telefono')
        .optional()
        .trim(),
    body('vehiculo')
        .optional()
        .trim(),
    body('modelo')
        .optional()
        .trim(),
    body('kilometraje')
        .optional()
        .isInt({ min: 0 }).withMessage('El kilometraje debe ser un número positivo'),
    body('estatus')
        .optional()
        .isIn(['Pendiente', 'Aprobada', 'Rechazada', 'En proceso']).withMessage('Estatus inválido'),
    body('total')
        .optional()
        .isFloat({ min: 0 }).withMessage('El total debe ser un número positivo'),
    handleValidationErrors
];

const validateCotizacionId = [
    param('id').isInt({ min: 1 }).withMessage('ID de cotización inválido'),
    handleValidationErrors
];

// ==================== VALIDACIONES PARA ALERTAS ====================
const validateCreateAlerta = [
    body('repuesto_id')
        .isInt({ min: 1 }).withMessage('ID de repuesto inválido'),
    body('mensaje')
        .notEmpty().withMessage('El mensaje es requerido')
        .trim(),
    body('tipo')
        .isIn(['stock_bajo', 'stock_critico', 'vencimiento', 'otro']).withMessage('Tipo de alerta inválido'),
    handleValidationErrors
];

const validateAlertaId = [
    param('id').isInt({ min: 1 }).withMessage('ID de alerta inválido'),
    handleValidationErrors
];

// ==================== VALIDACIONES GENERALES ====================
const validateId = [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    handleValidationErrors
];

module.exports = {
    // Generales
    handleValidationErrors,
    validateId,

    // Autenticación
    validateLogin,
    validateRegister,

    // Repuestos
    validateCreateRepuesto,
    validateUpdateRepuesto,
    validateRepuestoId,

    // Entradas
    validateCreateEntrada,
    validateUpdateEntrada,

    // Salidas
    validateCreateSalida,
    validateUpdateSalida,

    // Cotizaciones
    validateCreateCotizacion,
    validateCotizacionId,

    // Alertas
    validateCreateAlerta,
    validateAlertaId
};
