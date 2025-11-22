const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({
    path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DATABASE_URL = process.env.DATABASE_URL;

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const repuestoRoutes = require('./routes/repuestoRoutes');
const alertRoutes = require('./routes/alertRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const cotizacionItemRoutes = require('./routes/cotizacionItemRoutes');
const entradaRoutes = require('./routes/entradaRoutes');
const salidaRoutes = require('./routes/salidaRoutes');

const app = express();

// Lista de orígenes permitidos
const allowedOrigins = [
    'https://inventory-alert-system-frontend-a63pswjuh.vercel.app', // Producción en Vercel
    'http://localhost:5173',                                        // Desarrollo local (localhost)
    'http://192.168.20.83:5173',                                    // Nueva IP local que necesitas
    // Si en el futuro tienes más IPs locales puedes ir añadiéndolas aquí
];

// Configuración de CORS
app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (Postman, cURL, etc.) o desde orígenes permitidos
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else if (origin && origin.endsWith('.vercel.app')) {
            // Mantiene la flexibilidad para cualquier despliegue en Vercel
            callback(null, true);
        } else {
            console.log('Origen bloqueado por CORS:', origin); // útil para depurar
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,                 // Necesario si envías cookies o Authorization header con token
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/repuestos', repuestoRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/cotizacion-items', cotizacionItemRoutes);
app.use('/api/entradas', entradaRoutes);
app.use('/api/salidas', salidaRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send(`API funcionando correctamente en entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
});

app.listen(PORT, '0.0.0.0', () => {  // <-- Importante: escuchar en todas las interfaces
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`También accesible desde la red local en http://192.168.20.83:${PORT}`);
    console.log(`Base de datos: ${DATABASE_URL || 'no definida'}`);
});