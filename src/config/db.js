const { Pool } = require('pg');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});
const bcrypt = require('bcrypt');

// Determinar si estás en Render (producción) o en local
const isRenderDB = process.env.DATABASE_URL?.includes('render.com');

// Configuración del pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderDB ? { rejectUnauthorized: false } : false
});

module.exports = pool;

/*(async () => {
  try {
    const nombre = 'Erik';
    const email = 'admin@gmail.com';
    const telefono = '3001234567';
    const password = '22447955'; // en texto plano solo aquí
    const rol = 'admin';

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar en la base
    const res = await pool.query(
      `INSERT INTO usuarios (nombre, email, telefono, password_hash, rol) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario, nombre, email, rol`,
      [nombre, email, telefono, hashedPassword, rol]
    );

    console.log('Usuario creado:', res.rows[0]);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
})();*/

module.exports = pool;

