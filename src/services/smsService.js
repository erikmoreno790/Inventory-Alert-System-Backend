const axios = require('axios');
const logger = require('../config/logger');

/**
 * Servicio de envío de SMS usando Twilio
 * Para configurar, necesitas crear una cuenta en https://www.twilio.com
 * y obtener: ACCOUNT_SID, AUTH_TOKEN y un número de teléfono Twilio
 */

class SMSService {
    constructor() {
        // Configuración desde variables de entorno
        this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
        this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
        this.enabled = process.env.SMS_ENABLED === 'true';

        // URL de la API de Twilio
        this.twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    }

    /**
     * Validar configuración del servicio
     */
    isConfigured() {
        return this.accountSid && this.authToken && this.fromNumber;
    }

    /**
     * Formatear número de teléfono colombiano
     * Convierte números locales a formato internacional
     */
    formatPhoneNumber(phone) {
        if (!phone) return null;

        // Remover espacios y caracteres especiales
        let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

        // Si empieza con 57, ya está en formato internacional
        if (cleanPhone.startsWith('57')) {
            return `+${cleanPhone}`;
        }

        // Si empieza con +57, ya está listo
        if (cleanPhone.startsWith('+57')) {
            return cleanPhone;
        }

        // Si es número de 10 dígitos (Colombia), agregar +57
        if (cleanPhone.length === 10) {
            return `+57${cleanPhone}`;
        }

        // Si es número de 7 dígitos (fijo sin prefijo), no podemos procesarlo sin más info
        logger.logWarn('Número de teléfono en formato no reconocido', { phone });
        return null;
    }

    /**
     * Enviar SMS individual
     * @param {string} to - Número de teléfono destino
     * @param {string} message - Mensaje a enviar
     * @returns {Promise<Object>} - Resultado del envío
     */
    async sendSMS(to, message) {
        try {
            // Verificar si el servicio está habilitado
            if (!this.enabled) {
                logger.logInfo('SMS deshabilitado (modo simulación)', { to, message });
                return {
                    success: true,
                    simulated: true,
                    message: 'SMS enviado en modo simulación'
                };
            }

            // Verificar configuración
            if (!this.isConfigured()) {
                throw new Error('Servicio SMS no configurado. Faltan credenciales de Twilio.');
            }

            // Formatear número
            const formattedPhone = this.formatPhoneNumber(to);
            if (!formattedPhone) {
                throw new Error('Número de teléfono inválido');
            }

            // Enviar SMS usando Twilio
            const response = await axios.post(
                this.twilioUrl,
                new URLSearchParams({
                    To: formattedPhone,
                    From: this.fromNumber,
                    Body: message
                }),
                {
                    auth: {
                        username: this.accountSid,
                        password: this.authToken
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            logger.logInfo('SMS enviado exitosamente', {
                to: formattedPhone,
                sid: response.data.sid
            });

            return {
                success: true,
                sid: response.data.sid,
                status: response.data.status,
                to: formattedPhone
            };

        } catch (error) {
            logger.logError('Error enviando SMS', error, { to, message });

            return {
                success: false,
                error: error.message,
                details: error.response?.data || null
            };
        }
    }

    /**
     * Enviar SMS masivo a múltiples números
     * @param {Array<{phone: string, message: string}>} recipients - Lista de destinatarios
     * @returns {Promise<Object>} - Resultado del envío masivo
     */
    async sendBulkSMS(recipients) {
        const results = {
            total: recipients.length,
            sent: 0,
            failed: 0,
            errors: []
        };

        for (const recipient of recipients) {
            const result = await this.sendSMS(recipient.phone, recipient.message);

            if (result.success) {
                results.sent++;
            } else {
                results.failed++;
                results.errors.push({
                    phone: recipient.phone,
                    error: result.error
                });
            }

            // Pequeña pausa entre mensajes para evitar límites de rate
            await this.delay(100);
        }

        logger.logInfo('Envío masivo de SMS completado', results);
        return results;
    }

    /**
     * Crear mensaje de recordatorio de mantenimiento
     */
    createMaintenanceReminder(clienteNombre, vehiculoPlaca, fechaSugerida) {
        return `Hola ${clienteNombre}! Te recordamos traer tu vehículo ${vehiculoPlaca} al taller para su mantenimiento. Fecha sugerida: ${fechaSugerida}. Agenda tu cita: [TU_TELEFONO]`;
    }

    /**
     * Crear mensaje de cotización aprobada
     */
    createQuotationApprovedMessage(clienteNombre, vehiculoPlaca, total) {
        return `Hola ${clienteNombre}! Tu cotización para el vehículo ${vehiculoPlaca} ha sido aprobada. Total: $${total.toLocaleString()}. Gracias por confiar en nosotros!`;
    }

    /**
     * Crear mensaje personalizado
     */
    createCustomMessage(template, variables) {
        let message = template;

        for (const [key, value] of Object.entries(variables)) {
            message = message.replace(new RegExp(`{${key}}`, 'g'), value);
        }

        return message;
    }

    /**
     * Función auxiliar para pausas
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Validar número de teléfono
     */
    isValidPhoneNumber(phone) {
        const formatted = this.formatPhoneNumber(phone);
        return formatted !== null;
    }
}

// Exportar instancia única (singleton)
module.exports = new SMSService();
