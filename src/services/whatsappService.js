const axios = require('axios');
const logger = require('../config/logger');

/**
 * Servicio de envío de mensajes WhatsApp usando Twilio
 * Soporta Twilio Sandbox (pruebas) y WhatsApp Business (producción)
 * 
 * Variables de entorno requeridas:
 * - TWILIO_ACCOUNT_SID: Account SID de Twilio
 * - TWILIO_AUTH_TOKEN: Auth Token de Twilio
 * - TWILIO_WHATSAPP_FROM: Número WhatsApp remitente (ej: +14155238886 para Sandbox)
 * - WHATSAPP_RECIPIENTS: Números destino separados por coma (ej: +573001234567,+573009876543)
 * - WHATSAPP_ENABLED: true/false para activar/desactivar envío real
 */

class WhatsAppService {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
        this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
        this.fromNumber = process.env.TWILIO_WHATSAPP_FROM || '';
        this.enabled = process.env.WHATSAPP_ENABLED === 'true';
        this.recipients = (process.env.WHATSAPP_RECIPIENTS || '')
            .split(',')
            .map(n => n.trim())
            .filter(n => n.length > 0);

        this.twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    }

    isConfigured() {
        return this.accountSid && this.authToken && this.fromNumber && this.recipients.length > 0;
    }

    /**
     * Formatear número de teléfono colombiano para WhatsApp
     */
    formatPhoneNumber(phone) {
        if (!phone) return null;

        let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

        if (cleanPhone.startsWith('+')) {
            return cleanPhone;
        }

        if (cleanPhone.startsWith('57') && cleanPhone.length >= 12) {
            return `+${cleanPhone}`;
        }

        if (cleanPhone.length === 10) {
            return `+57${cleanPhone}`;
        }

        logger.logWarn('WhatsApp: Número en formato no reconocido', { phone });
        return null;
    }

    /**
     * Enviar mensaje WhatsApp individual
     */
    async sendWhatsApp(to, message) {
        try {
            if (!this.enabled) {
                logger.logInfo('WhatsApp deshabilitado (modo simulación)', { to, message: message.substring(0, 100) });
                return {
                    success: true,
                    simulated: true,
                    message: 'WhatsApp enviado en modo simulación'
                };
            }

            if (!this.isConfigured()) {
                throw new Error('Servicio WhatsApp no configurado. Faltan credenciales de Twilio o destinatarios.');
            }

            const formattedPhone = this.formatPhoneNumber(to);
            if (!formattedPhone) {
                throw new Error(`Número de teléfono inválido: ${to}`);
            }

            const response = await axios.post(
                this.twilioUrl,
                new URLSearchParams({
                    To: `whatsapp:${formattedPhone}`,
                    From: `whatsapp:${this.fromNumber}`,
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

            logger.logInfo('WhatsApp enviado exitosamente', {
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
            logger.logError('Error enviando WhatsApp', error, { to });

            return {
                success: false,
                error: error.message,
                details: error.response?.data || null
            };
        }
    }

    /**
     * Enviar alerta de stock bajo a todos los destinatarios configurados
     * @param {Object} repuesto - Datos del repuesto con stock bajo
     * @returns {Promise<Object>} - Resultado del envío
     */
    async sendStockAlert(repuesto) {
        const stock = Number(repuesto.stock);
        const stockMinimo = Number(repuesto.stock_minimo);

        const message = stock === 0
            ? `⚠️ *ALERTA: PRODUCTO AGOTADO*\n\n` +
              `📦 *Producto:* ${repuesto.nombre}\n` +
              `🔖 *Referencia:* ${repuesto.referencia || 'N/A'}\n` +
              `📊 *Stock actual:* 0 unidades\n` +
              `📉 *Stock mínimo:* ${stockMinimo} unidades\n` +
              `🏷️ *Categoría:* ${repuesto.categoria || 'N/A'}\n\n` +
              `🚨 Se requiere reabastecimiento inmediato.`
            : `⚠️ *ALERTA DE STOCK BAJO*\n\n` +
              `📦 *Producto:* ${repuesto.nombre}\n` +
              `🔖 *Referencia:* ${repuesto.referencia || 'N/A'}\n` +
              `📊 *Stock actual:* ${stock} unidades\n` +
              `📉 *Stock mínimo:* ${stockMinimo} unidades\n` +
              `🏷️ *Categoría:* ${repuesto.categoria || 'N/A'}\n\n` +
              `📋 Programar reabastecimiento.`;

        const results = {
            total: this.recipients.length,
            sent: 0,
            failed: 0,
            errors: []
        };

        for (const recipient of this.recipients) {
            const result = await this.sendWhatsApp(recipient, message);

            if (result.success) {
                results.sent++;
            } else {
                results.failed++;
                results.errors.push({
                    phone: recipient,
                    error: result.error
                });
            }

            // Pausa entre mensajes para respetar rate limits de Twilio
            if (this.recipients.length > 1) {
                await this.delay(150);
            }
        }

        logger.logInfo('Alerta de stock bajo WhatsApp completada', {
            repuesto: repuesto.nombre,
            stock,
            stockMinimo,
            ...results
        });

        return results;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new WhatsAppService();
