const userModel = require('../models/userModel');

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
        const newUser = await userModel.createUser(req.body);
        console.log("Usuario creado:", newUser)
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

//Cambiar credenciales
const changeUserCredentials = async (req, res) => {
    const updated = await userModel.changeUserCredentials(req.params.id, req.body);
    res.json(updated);
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
