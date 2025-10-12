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
const entradaRoutes = require('./routes/entradaRoutes')
const salidaRoutes = require('./routes/salidaRoutes')

const app = express();

// Lista de orígenes permitidos
const allowedOrigins = [
    'https://inventory-alert-system-frontend-a63pswjuh.vercel.app', // Origen actual
    'http://localhost:5173' // Para pruebas locales
];

// Configuración de CORS
app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (e.g., Postman) o desde orígenes permitidos
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else if (origin && origin.endsWith('.vercel.app')) {
            // Permitir cualquier subdominio de vercel.app (para flexibilidad)
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true, // Si usas cookies o tokens
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

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


app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://${DB_HOST}:${PORT}`);
    //Api
    //console.log(`🔧 API: http://${DB_HOST}:${PORT}/api`);
    console.log(`📦 Base de datos: ${DATABASE_URL || 'no definida'}`);
});
