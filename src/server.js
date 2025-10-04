const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();


const PORT = process.env.PORT;
const HOST = process.env.HOST;

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const repuestoRoutes = require('./routes/repuestoRoutes');
const alertRoutes = require('./routes/alertRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const cotizacionItemRoutes = require('./routes/cotizacionItemRoutes');
const entradaRoutes = require('./routes/entradaRoutes')
const salidaRoutes = require('./routes/salidaRoutes')

const app = express();

app.use(cors());
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


app.listen(PORT, HOST, () => {
    console.log(`✅ Servidor corriendo en http://${HOST}:${PORT}`);
    console.log(`🔗 URL de la API: http://${HOST}:${PORT}/api`);
    console.log(`🔐 Entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
    console.log(`📦 Base de datos: ${process.env.DB_NAME || 'no definida'}`);
});
