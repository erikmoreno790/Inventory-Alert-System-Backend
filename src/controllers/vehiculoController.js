const VehiculoModel = require('../models/vehiculoModel');
const ClienteModel = require('../models/clienteModel');
const logger = require('../config/logger');

const vehiculoController = {
    /**
     * Obtener todos los vehículos con filtros opcionales
     */
    async getAll(req, res) {
        try {
            const { cliente_id, placa, marca_modelo } = req.query;
            const filters = {};

            if (cliente_id) filters.cliente_id = parseInt(cliente_id);
            if (placa) filters.placa = placa;
            if (marca_modelo) filters.marca_modelo = marca_modelo;

            const vehiculos = await VehiculoModel.findAll(filters);
            res.json({
                success: true,
                data: vehiculos,
                count: vehiculos.length
            });
        } catch (error) {
            logger.logError('Error obteniendo vehículos', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener vehículos',
                error: error.message
            });
        }
    },

    /**
     * Obtener un vehículo por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const vehiculo = await VehiculoModel.findById(id);

            if (!vehiculo) {
                return res.status(404).json({
                    success: false,
                    message: 'Vehículo no encontrado'
                });
            }

            res.json({
                success: true,
                data: vehiculo
            });
        } catch (error) {
            logger.logError('Error obteniendo vehículo', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener vehículo',
                error: error.message
            });
        }
    },

    /**
     * Buscar vehículo por placa
     */
    async getByPlaca(req, res) {
        try {
            const { placa } = req.params;
            const vehiculo = await VehiculoModel.findByPlaca(placa);

            if (!vehiculo) {
                return res.status(404).json({
                    success: false,
                    message: 'Vehículo no encontrado'
                });
            }

            res.json({
                success: true,
                data: vehiculo
            });
        } catch (error) {
            logger.logError('Error obteniendo vehículo por placa', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener vehículo',
                error: error.message
            });
        }
    },

    /**
     * Obtener vehículos de un cliente
     */
    async getByClienteId(req, res) {
        try {
            const { cliente_id } = req.params;
            const vehiculos = await VehiculoModel.findByClienteId(cliente_id);

            res.json({
                success: true,
                data: vehiculos,
                count: vehiculos.length
            });
        } catch (error) {
            logger.logError('Error obteniendo vehículos del cliente', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener vehículos del cliente',
                error: error.message
            });
        }
    },

    /**
     * Obtener vehículo con historial de movimientos
     */
    async getByIdWithMovimientos(req, res) {
        try {
            const { id } = req.params;
            const vehiculo = await VehiculoModel.findByIdWithMovimientos(id);

            if (!vehiculo) {
                return res.status(404).json({
                    success: false,
                    message: 'Vehículo no encontrado'
                });
            }

            res.json({
                success: true,
                data: vehiculo
            });
        } catch (error) {
            logger.logError('Error obteniendo vehículo con movimientos', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener vehículo con movimientos',
                error: error.message
            });
        }
    },

    /**
     * Obtener vehículo con cotizaciones
     */
    async getByIdWithCotizaciones(req, res) {
        try {
            const { id } = req.params;
            const vehiculo = await VehiculoModel.findByIdWithCotizaciones(id);

            if (!vehiculo) {
                return res.status(404).json({
                    success: false,
                    message: 'Vehículo no encontrado'
                });
            }

            res.json({
                success: true,
                data: vehiculo
            });
        } catch (error) {
            logger.logError('Error obteniendo vehículo con cotizaciones', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener vehículo con cotizaciones',
                error: error.message
            });
        }
    },

    /**
     * Crear un nuevo vehículo
     */
    async create(req, res) {
        try {
            const { cliente_id, placa, marca_modelo } = req.body;

            // Validaciones
            if (!cliente_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El cliente_id es requerido'
                });
            }

            if (!placa) {
                return res.status(400).json({
                    success: false,
                    message: 'La placa es requerida'
                });
            }

            // Verificar que el cliente existe
            const cliente = await ClienteModel.findById(cliente_id);
            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'El cliente especificado no existe'
                });
            }

            // Validar placa única
            const existe = await VehiculoModel.existsByPlaca(placa);
            if (existe) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un vehículo con esa placa'
                });
            }

            const nuevoVehiculo = await VehiculoModel.create({
                cliente_id,
                placa,
                marca_modelo
            });

            logger.logInfo('Vehículo creado', { vehiculo_id: nuevoVehiculo.vehiculo_id });

            res.status(201).json({
                success: true,
                message: 'Vehículo creado exitosamente',
                data: nuevoVehiculo
            });
        } catch (error) {
            logger.logError('Error creando vehículo', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear vehículo',
                error: error.message
            });
        }
    },

    /**
     * Actualizar un vehículo
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const { cliente_id, placa, marca_modelo } = req.body;

            // Verificar que existe
            const vehiculoExistente = await VehiculoModel.findById(id);
            if (!vehiculoExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Vehículo no encontrado'
                });
            }

            // Validar placa única (si cambió)
            if (placa && placa.toLowerCase() !== vehiculoExistente.placa.toLowerCase()) {
                const existe = await VehiculoModel.existsByPlaca(placa);
                if (existe) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ya existe un vehículo con esa placa'
                    });
                }
            }

            // Validar cliente (si cambió)
            if (cliente_id && cliente_id !== vehiculoExistente.cliente_id) {
                const cliente = await ClienteModel.findById(cliente_id);
                if (!cliente) {
                    return res.status(404).json({
                        success: false,
                        message: 'El cliente especificado no existe'
                    });
                }
            }

            const vehiculoActualizado = await VehiculoModel.update(id, {
                cliente_id,
                placa,
                marca_modelo
            });

            logger.logInfo('Vehículo actualizado', { vehiculo_id: id });

            res.json({
                success: true,
                message: 'Vehículo actualizado exitosamente',
                data: vehiculoActualizado
            });
        } catch (error) {
            logger.logError('Error actualizando vehículo', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar vehículo',
                error: error.message
            });
        }
    },

    /**
     * Eliminar un vehículo
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            const vehiculoEliminado = await VehiculoModel.delete(id);

            if (!vehiculoEliminado) {
                return res.status(404).json({
                    success: false,
                    message: 'Vehículo no encontrado'
                });
            }

            logger.logInfo('Vehículo eliminado', { vehiculo_id: id });

            res.json({
                success: true,
                message: 'Vehículo eliminado exitosamente',
                data: vehiculoEliminado
            });
        } catch (error) {
            logger.logError('Error eliminando vehículo', error);

            // Verificar si es error de restricción de FK
            if (error.code === '23503') {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar el vehículo porque tiene movimientos asociados'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error al eliminar vehículo',
                error: error.message
            });
        }
    },

    /**
     * Obtener estadísticas de vehículos
     */
    async getStats(req, res) {
        try {
            const total = await VehiculoModel.count();

            res.json({
                success: true,
                data: {
                    total_vehiculos: total
                }
            });
        } catch (error) {
            logger.logError('Error obteniendo estadísticas de vehículos', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    }
};

module.exports = vehiculoController;
