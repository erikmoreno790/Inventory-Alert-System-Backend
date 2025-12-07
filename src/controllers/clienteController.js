const ClienteModel = require('../models/clienteModel');
const logger = require('../config/logger');

const clienteController = {
    /**
     * Obtener todos los clientes con filtros opcionales
     */
    async getAll(req, res) {
        try {
            const { nombre, documento, email, telefono } = req.query;
            const filters = {};

            if (nombre) filters.nombre = nombre;
            if (documento) filters.documento = documento;
            if (email) filters.email = email;
            if (telefono) filters.telefono = telefono;

            const clientes = await ClienteModel.findAll(filters);
            res.json({
                success: true,
                data: clientes,
                count: clientes.length
            });
        } catch (error) {
            logger.logError('Error obteniendo clientes', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener clientes',
                error: error.message
            });
        }
    },

    /**
     * Obtener un cliente por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const cliente = await ClienteModel.findById(id);

            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }

            res.json({
                success: true,
                data: cliente
            });
        } catch (error) {
            logger.logError('Error obteniendo cliente', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener cliente',
                error: error.message
            });
        }
    },

    /**
     * Obtener cliente con sus vehículos
     */
    async getByIdWithVehiculos(req, res) {
        try {
            const { id } = req.params;
            const cliente = await ClienteModel.findByIdWithVehiculos(id);

            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }

            res.json({
                success: true,
                data: cliente
            });
        } catch (error) {
            logger.logError('Error obteniendo cliente con vehículos', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener cliente con vehículos',
                error: error.message
            });
        }
    },

    /**
     * Buscar clientes por nombre
     */
    async searchByNombre(req, res) {
        try {
            const { nombre } = req.query;

            if (!nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'El parámetro nombre es requerido'
                });
            }

            const clientes = await ClienteModel.searchByNombre(nombre);
            res.json({
                success: true,
                data: clientes,
                count: clientes.length
            });
        } catch (error) {
            logger.logError('Error buscando clientes', error);
            res.status(500).json({
                success: false,
                message: 'Error al buscar clientes',
                error: error.message
            });
        }
    },

    /**
     * Crear un nuevo cliente
     */
    async create(req, res) {
        try {
            const { nombre, documento, telefono, email, direccion } = req.body;

            // Validaciones
            if (!nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre es requerido'
                });
            }

            // Validar si ya existe el documento
            if (documento) {
                const existe = await ClienteModel.existsByDocumento(documento);
                if (existe) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ya existe un cliente con ese documento'
                    });
                }
            }

            // Validar si ya existe el email
            if (email) {
                const existe = await ClienteModel.existsByEmail(email);
                if (existe) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ya existe un cliente con ese email'
                    });
                }
            }

            const nuevoCliente = await ClienteModel.create({
                nombre,
                documento,
                telefono,
                email,
                direccion
            });

            logger.logInfo('Cliente creado', { cliente_id: nuevoCliente.cliente_id });

            res.status(201).json({
                success: true,
                message: 'Cliente creado exitosamente',
                data: nuevoCliente
            });
        } catch (error) {
            logger.logError('Error creando cliente', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear cliente',
                error: error.message
            });
        }
    },

    /**
     * Actualizar un cliente
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const { nombre, documento, telefono, email, direccion } = req.body;

            // Verificar que existe
            const clienteExistente = await ClienteModel.findById(id);
            if (!clienteExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }

            // Validar documento único (si cambió)
            if (documento && documento !== clienteExistente.documento) {
                const existe = await ClienteModel.existsByDocumento(documento);
                if (existe) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ya existe un cliente con ese documento'
                    });
                }
            }

            // Validar email único (si cambió)
            if (email && email.toLowerCase() !== clienteExistente.email?.toLowerCase()) {
                const existe = await ClienteModel.existsByEmail(email);
                if (existe) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ya existe un cliente con ese email'
                    });
                }
            }

            const clienteActualizado = await ClienteModel.update(id, {
                nombre,
                documento,
                telefono,
                email,
                direccion
            });

            logger.logInfo('Cliente actualizado', { cliente_id: id });

            res.json({
                success: true,
                message: 'Cliente actualizado exitosamente',
                data: clienteActualizado
            });
        } catch (error) {
            logger.logError('Error actualizando cliente', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar cliente',
                error: error.message
            });
        }
    },

    /**
     * Eliminar un cliente
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            const clienteEliminado = await ClienteModel.delete(id);

            if (!clienteEliminado) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }

            logger.logInfo('Cliente eliminado', { cliente_id: id });

            res.json({
                success: true,
                message: 'Cliente eliminado exitosamente',
                data: clienteEliminado
            });
        } catch (error) {
            logger.logError('Error eliminando cliente', error);

            // Verificar si es error de restricción de FK
            if (error.code === '23503') {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar el cliente porque tiene vehículos o movimientos asociados'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error al eliminar cliente',
                error: error.message
            });
        }
    },

    /**
     * Obtener estadísticas de clientes
     */
    async getStats(req, res) {
        try {
            const total = await ClienteModel.count();
            const conMovimientos = await ClienteModel.findWithMovimientos();

            res.json({
                success: true,
                data: {
                    total_clientes: total,
                    clientes_con_movimientos: conMovimientos.filter(c => c.total_movimientos > 0).length,
                    clientes_sin_movimientos: conMovimientos.filter(c => c.total_movimientos === 0).length
                }
            });
        } catch (error) {
            logger.logError('Error obteniendo estadísticas de clientes', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    }
};

module.exports = clienteController;
