const winston = require('winston');
const path = require('path');

// Definir niveles de log
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Definir colores para cada nivel
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Formato para consola (desarrollo)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} [${info.level}]: ${info.message}`
    )
);

// Formato para archivos (producción)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Crear transportes según entorno
const transports = [];

if (process.env.NODE_ENV === 'production') {
    // En producción (Render), solo consola — Render captura stdout/stderr automáticamente
    // Los file transports son inútiles en Render (filesystem efímero) y consumen memoria
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
        })
    );
} else {
    // En desarrollo, archivos con rotación + consola con colores
    transports.push(
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5 * 1024 * 1024, // 5MB máximo
            maxFiles: 3,
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            format: fileFormat,
            maxsize: 5 * 1024 * 1024, // 5MB máximo
            maxFiles: 3,
        }),
        new winston.transports.Console({
            format: consoleFormat,
        })
    );
}

// Crear el logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    transports,
    // No salir en errores no capturados
    exitOnError: false,
});

// Métodos de conveniencia
logger.logError = (message, error, meta = {}) => {
    logger.error(message, {
        error: error?.message,
        stack: error?.stack,
        ...meta,
    });
};

logger.logInfo = (message, meta = {}) => {
    logger.info(message, meta);
};

logger.logWarn = (message, meta = {}) => {
    logger.warn(message, meta);
};

logger.logDebug = (message, meta = {}) => {
    logger.debug(message, meta);
};

module.exports = logger;
