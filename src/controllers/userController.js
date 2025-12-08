const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

const getAll = async (req, res) => {
    const users = await userModel.getAllUsers();
    res.json(users);
};

const getById = async (req, res) => {
    const user = await userModel.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'No encontrado' });
    res.json(user);
};

const createUser = async (req, res) => {
    try {
        // Hash password antes de crear usuario
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await userModel.createUser({
            name,
            email,
            password: hashedPassword
        });

        console.log("Usuario creado:", newUser);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

//Cambiar credenciales
const changeUserCredentials = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña son requeridos' });
        }

        // Hash password antes de actualizar
        const hashedPassword = await bcrypt.hash(password, 10);
        const updated = await userModel.changeUserCredentials(req.params.id, {
            email,
            password: hashedPassword
        });

        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

// Asignar rol
const assignRole = async (req, res) => {
    const updated = await userModel.asigneRoleToUser(req.params.id, req.body.role);
    res.json(updated);
}

const update = async (req, res) => {
    const updated = await userModel.updateUser(req.params.id, req.body);
    res.json(updated);
};

const remove = async (req, res) => {
    await userModel.deleteUser(req.params.id);
    res.json({ message: 'Eliminado correctamente' });
};

module.exports = {
    getAll,
    getById,
    update,
    remove,
    createUser,
    changeUserCredentials,
    assignRole
};
