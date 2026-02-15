const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
require('dotenv').config({
    path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});

// Validar variables de entorno críticas
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    logger.logError(`Variables de entorno faltantes: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DATABASE_URL = process.env.DATABASE_URL;

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const repuestoRoutes = require('./routes/repuestoRoutes');
const alertRoutes = require('./routes/alertRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const cotizacionItemRoutes = require('./routes/cotizacionItemRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const vehiculoRoutes = require('./routes/vehiculoRoutes');
const recordatorioRoutes = require('./routes/recordatorioRoutes');
const reporteRoutes = require('./routes/reporteRoutes');

const app = express();

// Rate limiter general para todas las rutas
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // límite de 100 peticiones por ventana por IP
    message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter estricto para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // límite de 5 intentos de login por ventana
    message: 'Demasiados intentos de inicio de sesión, por favor intenta de nuevo en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Exportar para usar en rutas específicas
app.set('authLimiter', authLimiter);

// Seguridad con Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permitir carga de recursos
}));

// Compresión de respuestas
app.use(compression());

// Rate limiting general
app.use(generalLimiter);

// Lista de orígenes permitidos
const allowedOrigins = [
    'https://inventory-alert-system-frontend-a63pswjuh.vercel.app', // Producción en Vercel
    'http://localhost:5173',                                        // Desarrollo local (localhost)
    'http://192.168.20.83:5173',                                    // Nueva IP local que necesitas
];

// Configuración de CORS optimizada
const corsOptions = {
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (Postman, cURL, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Permitir todos los dominios de Vercel (*.vercel.app)
        if (origin.endsWith('.vercel.app')) {
            logger.logInfo('Origen Vercel permitido', { origin });
            return callback(null, true);
        }

        // Permitir orígenes en la lista blanca
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // En desarrollo, ser más permisivo con localhost
        if (origin.startsWith('http://localhost') || origin.startsWith('http://192.168.')) {
            logger.logInfo('Origen local permitido', { origin });
            return callback(null, true);
        }

        // Rechazar otros orígenes
        logger.logWarn('Origen bloqueado por CORS', { origin });
        callback(new Error('No permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 200, // Para navegadores antiguos (IE11)
    maxAge: 86400, // Cache preflight requests por 24 horas
    preflightContinue: false
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' })); // Limitar tamaño de body para prevenir abuso de memoria
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/repuestos', repuestoRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/cotizacion-items', cotizacionItemRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/recordatorios', recordatorioRoutes);
app.use('/api/reportes', reporteRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send(`API funcionando correctamente en entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
});

// Endpoint de salud — monitoreo de memoria para diagnóstico
app.get('/health', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
        status: 'ok',
        uptime: `${(process.uptime() / 60).toFixed(1)} min`,
        memory: {
            rss: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
            heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
            heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`,
            external: `${(mem.external / 1024 / 1024).toFixed(1)} MB`,
        },
        env: process.env.NODE_ENV || 'desarrollo',
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    logger.logInfo(`Servidor corriendo en http://localhost:${PORT}`);
    logger.logInfo(`Entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
    logger.logInfo(`Base de datos: ${DATABASE_URL ? 'Configurada' : 'NO DEFINIDA'}`);
});

// Graceful shutdown — libera conexiones DB correctamente al reiniciar
const pool = require('./config/db');

const gracefulShutdown = async (signal) => {
    logger.logInfo(`${signal} recibido. Cerrando servidor...`);
    server.close(async () => {
        try {
            await pool.end();
            logger.logInfo('Pool de conexiones cerrado correctamente');
        } catch (err) {
            logger.logError('Error cerrando pool de conexiones', err);
        }
        process.exit(0);
    });

    // Forzar cierre si no termina en 10s
    setTimeout(() => {
        logger.logWarn('Forzando cierre después de timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));