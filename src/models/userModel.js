const pool = require('../config/db');

const findUserByEmail = async (email) => {
    const res = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return res.rows[0];
};

const createUser = async ({ name, email, password, role }) => {
    const res = await pool.query(
        'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, email, password, role]
    );
    return res.rows[0];
};

const getAllUsers = async () => {
    const res = await pool.query('SELECT id_usuario, nombre, email, telefono, rol, created_at FROM usuarios');
    return res.rows;
};

const getUserById = async (id) => {
    const res = await pool.query('SELECT id_usuario, nombre, email, telefono, rol, created_at FROM usuarios WHERE id = $1', [id]);
    return res.rows[0];
};

const updateUser = async (id, { name, role }) => {
    const res = await pool.query(
        'UPDATE usuarios SET name = $1, rol = $2 WHERE id_usuario = $3 RETURNING *',
        [name, role, id]
    );
    return res.rows[0];
};

const deleteUser = async (id) => {
    await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
};

const getNotificationUsers = async () => {
    const res = await pool.query(
        `SELECT id_usuario, email FROM usuarios WHERE rol IN ('admin', 'inventario', 'compras')`
    );
    return res.rows;
};



module.exports = { findUserByEmail, createUser, getAllUsers, getUserById, updateUser, deleteUser, getNotificationUsers };
