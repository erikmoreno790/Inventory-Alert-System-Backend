const { Pool } = require('pg');
const logger = require('./logger');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});

// Determinar si estás en Render (producción) o en local
const isRenderDB = process.env.DATABASE_URL?.includes('render.com');

// Configuración optimizada del pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderDB ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 2000, // Timeout de conexión de 2s
  maxUses: 7500, // Reciclar conexiones después de 7500 usos
});

// Log de eventos del pool
pool.on('connect', () => {
  logger.logDebug('Nueva conexión establecida con la base de datos');
});

pool.on('error', (err) => {
  logger.logError('Error inesperado en el pool de conexiones', err);
});

pool.on('remove', () => {
  logger.logDebug('Conexión removida del pool');
});

module.exports = pool;

