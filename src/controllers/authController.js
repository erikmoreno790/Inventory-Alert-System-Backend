const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, createUser } = require('../models/userModel');
require('dotenv').config();

const register = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const userExist = await findUserByEmail(email);
        if (userExist) return res.status(400).json({ message: 'Email ya registrado' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createUser({ name, email, password: hashedPassword, role });
        res.status(201).json({ message: 'Usuario registrado', user });
    } catch (err) {
        res.status(500).json({ message: 'Error en el registro', error: err.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    console.log("Intentando iniciar sesión con email:", email);
    try {
        const user = await findUserByEmail(email);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        console.log("Usuario encontrado:", user);

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ message: 'Credenciales incorrectas' });
        console.log("Contraseña verificada correctamente");

        const token = jwt.sign({ id_usuario: user.id_usuario, nombre: user.nombre, rol: user.rol, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id_usuario: user.id_usuario, nombre: user.nombre, email: user.email, rol: user.rol } });
    } catch (err) {
        res.status(500).json({ message: 'Error al iniciar sesión', error: err.message });
        console.error("Error al iniciar sesión:", err);
    }
};

// Validamos token con authenticate middleware
const validateToken = async (req, res) => {
    try {
        //console.log("Validando token para el usuario:", req.user);
        const user = req.user; // { id_usuario, rol, name, email }
        if (!user) return res.status(401).json({ message: 'Token inválido' });
        //console.log("Token válido para el usuario:", user);
        res.json({ user: { id_usuario: user.id_usuario, nombre: user.nombre, email: user.email, rol: user.rol } });

    } catch (err) {
        res.status(500).json({ message: 'Error al validar token', error: err.message });
        console.error("Error al validar token:", err);

    }
};
module.exports = { register, login, validateToken };
