const { Pool } = require('pg');
const logger = require('./logger');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});

// Determinar si estás en Render (producción) o en local
const isRenderDB = process.env.DATABASE_URL?.includes('render.com');

// Configuración optimizada del pool — reducido para planes pequeños de Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderDB ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX) || 5, // Reducido de 20 a 5 para Render (evita agotar conexiones)
  idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 5000, // Timeout de conexión de 5s (aumentado para cold starts)
  maxUses: 7500, // Reciclar conexiones después de 7500 usos
  allowExitOnIdle: true, // Permite que el pool se reduzca a 0 cuando no hay actividad
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

