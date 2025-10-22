const pool = require('../config/db');

const findUserByEmail = async (email) => {
    const res = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return res.rows[0];
};

const getAllUsers = async () => {
    const res = await pool.query('SELECT id_usuario, nombre, email, telefono, rol, created_at FROM usuarios');
    return res.rows;
};

const createUser = async ({ name, email, password }) => {

    const res = await pool.query(
        'INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3 ) RETURNING id_usuario, nombre, email, created_at',
        [name, email, password]
    );
    return res.rows[0];
}

const getUserById = async (id) => {
    const res = await pool.query('SELECT id_usuario, nombre, email, telefono, rol, created_at FROM usuarios WHERE id = $1', [id]);
    return res.rows[0];
};

// Asignar rol a un usuario
const asigneRoleToUser = async (userId, role) => {
    const res = await pool.query(
        'UPDATE usuarios SET rol = $1 WHERE id_usuario = $2 RETURNING *',
        [role, userId]
    );
    return res.rows[0];
}

// Cambiar email o password
const changeUserCredentials = async (id, { email, password }) => {
    const res = await pool.query(
        'UPDATE usuarios SET email = $1, password_hash = $2 WHERE id_usuario = $3 RETURNING *',
        [email, password, id]
    );
    return res.rows[0];
}

// Actualizar usuario ()
const updateUser = async (id, { name, email, telefono }) => {
    const res = await pool.query(
        'UPDATE usuarios SET nombre = $1, email = $2, telefono = $3  WHERE id_usuario = $5 RETURNING id_usuario, nombre, email, telefono, created_at',
        [name, email, telefono, id]
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

module.exports = {
    findUserByEmail,
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getNotificationUsers,
    changeUserCredentials,
    asigneRoleToUser
};
