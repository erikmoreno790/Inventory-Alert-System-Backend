const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

const getAll = async (req, res) => {
    try {
        const users = await userModel.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
};

const getById = async (req, res) => {
    try {
        const user = await userModel.getUserById(req.params.id);
        if (!user) return res.status(404).json({ message: 'No encontrado' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
    }
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
    try {
        const updated = await userModel.asigneRoleToUser(req.params.id, req.body.role);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error al asignar rol', error: error.message });
    }
}

const update = async (req, res) => {
    try {
        const updated = await userModel.updateUser(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        await userModel.deleteUser(req.params.id);
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
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
