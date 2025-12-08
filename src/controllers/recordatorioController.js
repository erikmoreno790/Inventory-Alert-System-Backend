const RecordatorioModel = require('../models/recordatorioModel');
const smsService = require('../services/smsService');
const logger = require('../config/logger');

const recordatorioController = {
    /**
     * Obtener todos los recordatorios con filtros
     */
    async getAll(req, res) {
        try {
            const {
                cliente_id,
                vehiculo_id,
                tipo,
                enviado,
                estado,
                fecha_desde,
                fecha_hasta
            } = req.query;

            const filters = {};

            if (cliente_id) filters.cliente_id = parseInt(cliente_id);
            if (vehiculo_id) filters.vehiculo_id = parseInt(vehiculo_id);
            if (tipo) filters.tipo = tipo;
            if (enviado !== undefined) filters.enviado = enviado === 'true';
            if (estado) filters.estado = estado;
            if (fecha_desde) filters.fecha_desde = fecha_desde;
            if (fecha_hasta) filters.fecha_hasta = fecha_hasta;

            const recordatorios = await RecordatorioModel.findAll(filters);

            res.json({
                success: true,
                data: recordatorios,
                count: recordatorios.length
            });
        } catch (error) {
            logger.logError('Error obteniendo recordatorios', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener recordatorios',
                error: error.message
            });
        }
    },

    /**
     * Obtener un recordatorio por ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const recordatorio = await RecordatorioModel.findById(id);

            if (!recordatorio) {
                return res.status(404).json({
                    success: false,
                    message: 'Recordatorio no encontrado'
                });
            }

            res.json({
                success: true,
                data: recordatorio
            });
        } catch (error) {
            logger.logError('Error obteniendo recordatorio', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener recordatorio',
                error: error.message
            });
        }
    },

    /**
     * Obtener recordatorios pendientes de envío
     */
    async getPendientes(req, res) {
        try {
            const { fecha_limite } = req.query;
            const recordatorios = await RecordatorioModel.findPendientesEnvio(fecha_limite);

            res.json({
                success: true,
                data: recordatorios,
                count: recordatorios.length
            });
        } catch (error) {
            logger.logError('Error obteniendo recordatorios pendientes', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener recordatorios pendientes',
                error: error.message
            });
        }
    },

    /**
     * Crear un nuevo recordatorio
     */
    async create(req, res) {
        try {
            const {
                cliente_id,
                vehiculo_id,
                tipo,
                fecha_programada,
                mensaje,
                telefono,
                notas
            } = req.body;

            // Validaciones
            if (!cliente_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El cliente_id es requerido'
                });
            }

            if (!vehiculo_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El vehiculo_id es requerido'
                });
            }

            if (!fecha_programada) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha_programada es requerida'
                });
            }

            const nuevoRecordatorio = await RecordatorioModel.create({
                cliente_id,
                vehiculo_id,
                tipo: tipo || 'mantenimiento',
                fecha_programada,
                mensaje: mensaje || smsService.createMaintenanceReminder('Cliente', 'Vehículo', fecha_programada),
                telefono,
                notas
            });

            logger.logInfo('Recordatorio creado', { recordatorio_id: nuevoRecordatorio.recordatorio_id });

            res.status(201).json({
                success: true,
                message: 'Recordatorio creado exitosamente',
                data: nuevoRecordatorio
            });
        } catch (error) {
            logger.logError('Error creando recordatorio', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear recordatorio',
                error: error.message
            });
        }
    },

    /**
     * Crear recordatorio automático desde última cotización
     */
    async createFromLastQuotation(req, res) {
        try {
            const { vehiculo_id } = req.body;
            const { dias } = req.query;

            if (!vehiculo_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El vehiculo_id es requerido'
                });
            }

            const diasMantenimiento = dias ? parseInt(dias) : 90;

            const recordatorio = await RecordatorioModel.createFromLastQuotation(
                vehiculo_id,
                diasMantenimiento
            );

            logger.logInfo('Recordatorio automático creado', {
                recordatorio_id: recordatorio.recordatorio_id,
                vehiculo_id
            });

            res.status(201).json({
                success: true,
                message: 'Recordatorio automático creado exitosamente',
                data: recordatorio
            });
        } catch (error) {
            logger.logError('Error creando recordatorio automático', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear recordatorio automático',
                error: error.message
            });
        }
    },

    /**
     * Enviar SMS de un recordatorio específico
     */
    async enviarSMS(req, res) {
        try {
            const { id } = req.params;

            const recordatorio = await RecordatorioModel.findById(id);

            if (!recordatorio) {
                return res.status(404).json({
                    success: false,
                    message: 'Recordatorio no encontrado'
                });
            }

            if (recordatorio.enviado) {
                return res.status(400).json({
                    success: false,
                    message: 'Este recordatorio ya fue enviado'
                });
            }

            if (!recordatorio.telefono && !recordatorio.cliente_telefono) {
                return res.status(400).json({
                    success: false,
                    message: 'No hay número de teléfono disponible'
                });
            }

            const telefono = recordatorio.telefono || recordatorio.cliente_telefono;

            // Enviar SMS
            const resultado = await smsService.sendSMS(telefono, recordatorio.mensaje);

            if (resultado.success) {
                // Marcar como enviado
                await RecordatorioModel.marcarEnviado(id, true);

                logger.logInfo('SMS de recordatorio enviado', {
                    recordatorio_id: id,
                    telefono
                });

                res.json({
                    success: true,
                    message: 'SMS enviado exitosamente',
                    data: resultado
                });
            } else {
                // Marcar como error
                await RecordatorioModel.marcarEnviado(id, false);

                res.status(500).json({
                    success: false,
                    message: 'Error al enviar SMS',
                    error: resultado.error
                });
            }
        } catch (error) {
            logger.logError('Error enviando SMS de recordatorio', error);
            res.status(500).json({
                success: false,
                message: 'Error al enviar SMS',
                error: error.message
            });
        }
    },

    /**
     * Enviar SMS masivo a todos los recordatorios pendientes
     */
    async enviarSMSMasivo(req, res) {
        try {
            const { fecha_limite } = req.body;

            const recordatorios = await RecordatorioModel.findPendientesEnvio(fecha_limite);

            if (recordatorios.length === 0) {
                return res.json({
                    success: true,
                    message: 'No hay recordatorios pendientes para enviar',
                    data: { total: 0, enviados: 0, fallidos: 0 }
                });
            }

            const recipients = recordatorios.map(r => ({
                phone: r.telefono || r.cliente_telefono,
                message: r.mensaje,
                recordatorio_id: r.recordatorio_id
            }));

            // Enviar SMS masivo
            const resultados = await smsService.sendBulkSMS(recipients);

            // Actualizar estado de cada recordatorio
            for (let i = 0; i < recordatorios.length; i++) {
                const exito = i < resultados.sent;
                await RecordatorioModel.marcarEnviado(recordatorios[i].recordatorio_id, exito);
            }

            logger.logInfo('Envío masivo de recordatorios completado', resultados);

            res.json({
                success: true,
                message: 'Envío masivo completado',
                data: resultados
            });
        } catch (error) {
            logger.logError('Error en envío masivo de recordatorios', error);
            res.status(500).json({
                success: false,
                message: 'Error en envío masivo',
                error: error.message
            });
        }
    },

    /**
     * Actualizar un recordatorio
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const { fecha_programada, mensaje, telefono, estado, notas } = req.body;

            const recordatorio = await RecordatorioModel.findById(id);

            if (!recordatorio) {
                return res.status(404).json({
                    success: false,
                    message: 'Recordatorio no encontrado'
                });
            }

            const recordatorioActualizado = await RecordatorioModel.update(id, {
                fecha_programada,
                mensaje,
                telefono,
                estado,
                notas
            });

            logger.logInfo('Recordatorio actualizado', { recordatorio_id: id });

            res.json({
                success: true,
                message: 'Recordatorio actualizado exitosamente',
                data: recordatorioActualizado
            });
        } catch (error) {
            logger.logError('Error actualizando recordatorio', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar recordatorio',
                error: error.message
            });
        }
    },

    /**
     * Cancelar un recordatorio
     */
    async cancelar(req, res) {
        try {
            const { id } = req.params;

            const recordatorio = await RecordatorioModel.cancelar(id);

            if (!recordatorio) {
                return res.status(404).json({
                    success: false,
                    message: 'Recordatorio no encontrado'
                });
            }

            logger.logInfo('Recordatorio cancelado', { recordatorio_id: id });

            res.json({
                success: true,
                message: 'Recordatorio cancelado exitosamente',
                data: recordatorio
            });
        } catch (error) {
            logger.logError('Error cancelando recordatorio', error);
            res.status(500).json({
                success: false,
                message: 'Error al cancelar recordatorio',
                error: error.message
            });
        }
    },

    /**
     * Eliminar un recordatorio
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            const recordatorio = await RecordatorioModel.delete(id);

            if (!recordatorio) {
                return res.status(404).json({
                    success: false,
                    message: 'Recordatorio no encontrado'
                });
            }

            logger.logInfo('Recordatorio eliminado', { recordatorio_id: id });

            res.json({
                success: true,
                message: 'Recordatorio eliminado exitosamente',
                data: recordatorio
            });
        } catch (error) {
            logger.logError('Error eliminando recordatorio', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar recordatorio',
                error: error.message
            });
        }
    },

    /**
     * Obtener estadísticas de recordatorios
     */
    async getEstadisticas(req, res) {
        try {
            const estadisticas = await RecordatorioModel.getEstadisticas();

            res.json({
                success: true,
                data: estadisticas
            });
        } catch (error) {
            logger.logError('Error obteniendo estadísticas de recordatorios', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    },

    /**
     * Obtener recordatorios de un cliente
     */
    async getByClienteId(req, res) {
        try {
            const { cliente_id } = req.params;
            const recordatorios = await RecordatorioModel.findByClienteId(cliente_id);

            res.json({
                success: true,
                data: recordatorios,
                count: recordatorios.length
            });
        } catch (error) {
            logger.logError('Error obteniendo recordatorios del cliente', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener recordatorios del cliente',
                error: error.message
            });
        }
    },

    /**
     * Obtener recordatorios de un vehículo
     */
    async getByVehiculoId(req, res) {
        try {
            const { vehiculo_id } = req.params;
            const recordatorios = await RecordatorioModel.findByVehiculoId(vehiculo_id);

            res.json({
                success: true,
                data: recordatorios,
                count: recordatorios.length
            });
        } catch (error) {
            logger.logError('Error obteniendo recordatorios del vehículo', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener recordatorios del vehículo',
                error: error.message
            });
        }
    }
};

module.exports = recordatorioController;
