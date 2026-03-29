const pool = require('../config/db');
const CotizacionModel = require('../models/cotizacionModel');
const CotizacionItem = require('../models/cotizacionItemModel');
const CotizacionImagenModel = require('../models/cotizacionImagenModel');
const CotizacionInventarioService = require('../services/cotizacionInventarioService');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');
const { generateQuotationPDF } = require('./pdfGenerator');

const cotizacionController = {
    /**
     * Obtener todas las cotizaciones con paginación y filtros
     */
    async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;

            // Validar parámetros
            if (page < 1 || limit < 1 || limit > 100) {
                return res.status(400).json({
                    error: 'Parámetros inválidos. Page debe ser >= 1 y limit entre 1 y 100'
                });
            }

            // Obtener filtros opcionales
            const filters = {
                nombre_cliente: req.query.nombre_cliente,
                placa: req.query.placa,
                estatus: req.query.estatus,
                fecha: req.query.fecha
            };

            const result = await CotizacionModel.findAll(page, limit, filters);
            res.json(result);
        } catch (err) {
            logger.logError('Error al obtener cotizaciones', err);
            res.status(500).json({ error: 'Error al obtener cotizaciones', details: err.message });
        }
    },

    /**
     * Obtener cotización por ID con items e imágenes
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const cotizacion = await CotizacionModel.findById(id);

            if (!cotizacion) {
                return res.status(404).json({ error: 'Cotización no encontrada' });
            }

            // Convertir URLs relativas en absolutas para el frontend
            if (cotizacion.imagenes && cotizacion.imagenes.length > 0) {
                cotizacion.imagenes = cotizacion.imagenes.map(url => ({
                    url: `${req.protocol}://${req.get("host")}/${url}`
                }));
            }

            res.json(cotizacion);
        } catch (err) {
            logger.logError('Error al obtener cotización', err);
            res.status(500).json({ error: 'Error al obtener cotización', details: err.message });
        }
    },

    /**
     * Crear nueva cotización con items e imágenes
     */
    async create(req, res) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const {
                fecha,
                nombre_cliente,
                nit_cc,
                telefono,
                vehiculo,
                placa,
                kilometraje,
                nombre_mecanico,
                segundo_mecanico,
                observaciones,
                estatus,
                porcentaje_descuento,
                subtotal,
                descuento,
                total,
                items,
                tiempo_trabajo,
                validez_cotizacion,
                garantia
            } = req.body;

            const imagenes = req.files || [];

            // 🔹 Parsear items de forma segura
            let parsedItems = items;
            if (typeof items === 'string') {
                try {
                    parsedItems = JSON.parse(items);
                } catch (err) {
                    logger.logError('Error parseando items de cotización', err);
                    parsedItems = [];
                }
            } else if (!Array.isArray(items)) {
                logger.logWarn('Items no es un array ni string, usando array vacío');
                parsedItems = [];
            }

            // 🔹 Validar disponibilidad de stock antes de guardar
            const validacion = await CotizacionInventarioService.validarDisponibilidad(parsedItems);
            if (!validacion.valid) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Stock insuficiente',
                    detalles: validacion.errors
                });
            }

            // 🔹 Vincular items con repuestos del inventario
            const itemsVinculados = await CotizacionInventarioService.vincularRepuestos(parsedItems);

            // 1️⃣ Crear cotización
            const cotizacionData = {
                fecha,
                nombre_cliente,
                nit_cc,
                telefono,
                vehiculo,
                placa,
                kilometraje,
                nombre_mecanico,
                segundo_mecanico,
                observaciones,
                estatus,
                porcentaje_descuento,
                descuento,
                subtotal,
                total,
                tiempo_trabajo,
                validez_cotizacion,
                garantia
            };

            const nuevaCotizacion = await CotizacionModel.create(cotizacionData, client);
            const idCotizacion = nuevaCotizacion.id_cotizacion;

            // 2️⃣ Insertar items (usando client para estar dentro de la transacción)
            for (const item of itemsVinculados) {
                await CotizacionItem.create({
                    id_cotizacion: idCotizacion,
                    descripcion: item.descripcion,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    total: item.sub_total || (item.cantidad * item.precio_unitario),
                    repuesto_id: item.repuesto_id || null,
                    referencia: item.referencia || null,
                    stock_afectado: false
                }, client);
            }

            // 3️⃣ Insertar imágenes (usando client para estar dentro de la transacción)
            for (const img of imagenes) {
                const imageUrl = `uploads/${img.filename}`;
                await CotizacionImagenModel.create({
                    id_cotizacion: idCotizacion,
                    imagen_url: imageUrl
                }, client);
            }

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Cotización creada con éxito',
                id: idCotizacion
            });

        } catch (error) {
            await client.query('ROLLBACK');
            logger.logError('Error creando cotización', error);
            res.status(500).json({
                error: 'Error al crear cotización',
                details: error.message
            });
        } finally {
            client.release();
        }
    },

    /**
     * Actualizar cotización existente
     */
    async update(req, res) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { id } = req.params;
            const {
                fecha,
                nombre_cliente,
                nit_cc,
                telefono,
                vehiculo,
                placa,
                kilometraje,
                nombre_mecanico,
                segundo_mecanico,
                observaciones,
                estatus,
                porcentaje_descuento,
                descuento,
                subtotal,
                total,
                items,
                tiempo_trabajo,
                validez_cotizacion,
                garantia
            } = req.body;

            // 🔹 Obtener estatus anterior
            const cotizacionAnterior = await CotizacionModel.findById(id);
            if (!cotizacionAnterior) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Cotización no encontrada' });
            }

            const estatusAnterior = cotizacionAnterior.estatus;
            const inventarioProcesado = cotizacionAnterior.inventario_procesado;

            // 🔹 Validar transiciones de estado permitidas
            if (estatus && estatus !== estatusAnterior) {
                const transicionesPermitidas = {
                    'Pendiente': ['Aprobada', 'Rechazada'],
                    'Aprobada': ['Rechazada'],
                    'Rechazada': []
                };

                const permitidas = transicionesPermitidas[estatusAnterior] || [];
                if (!permitidas.includes(estatus)) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        error: `No se puede cambiar el estado de "${estatusAnterior}" a "${estatus}"`
                    });
                }
            }

            // 🔹 Bloquear edición de cotizaciones aprobadas (solo permitir cambio de estado)
            if (estatusAnterior === 'Aprobada' && estatus !== 'Rechazada') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'No se puede editar una cotización aprobada. Solo se permite rechazarla.'
                });
            }

            // 🔹 Validar disponibilidad de stock si hay items
            if (items && items.length > 0) {
                const validacion = await CotizacionInventarioService.validarDisponibilidad(items);
                if (!validacion.valid) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        error: 'Stock insuficiente',
                        detalles: validacion.errors
                    });
                }
            }

            // 1️⃣ Actualizar cotización
            const cotizacionData = {
                fecha,
                nombre_cliente,
                nit_cc,
                telefono,
                vehiculo,
                placa,
                kilometraje,
                nombre_mecanico,
                segundo_mecanico,
                observaciones,
                estatus,
                porcentaje_descuento,
                descuento,
                subtotal,
                total,
                tiempo_trabajo,
                validez_cotizacion,
                garantia
            };

            await CotizacionModel.update(id, cotizacionData, client);

            // 2️⃣ Manejar items si se enviaron
            if (items && items.length > 0) {
                // Obtener IDs actuales de la DB
                const existingItems = await CotizacionItem.getByCotizacionId(id, client);
                const existingIds = existingItems.map(i => i.id_cotizacion_item);

                // Separar items a actualizar vs insertar
                const itemsToUpdate = items.filter(i => i.id_cotizacion_item);
                const itemsToInsert = items.filter(i => !i.id_cotizacion_item);

                // Vincular items nuevos con repuestos
                const itemsToInsertVinculados = await CotizacionInventarioService.vincularRepuestos(itemsToInsert);

                // Actualizar items existentes
                for (const item of itemsToUpdate) {
                    await CotizacionItem.update(item.id_cotizacion_item, {
                        id_cotizacion: id,
                        descripcion: item.descripcion,
                        cantidad: item.cantidad,
                        precio_unitario: item.precio_unitario,
                        total: item.total || (item.cantidad * item.precio_unitario),
                        repuesto_id: item.repuesto_id,
                        referencia: item.referencia,
                        stock_afectado: item.stock_afectado || false
                    }, client);
                }

                // Insertar nuevos items
                for (const item of itemsToInsertVinculados) {
                    await CotizacionItem.create({
                        id_cotizacion: id,
                        descripcion: item.descripcion,
                        cantidad: item.cantidad,
                        precio_unitario: item.precio_unitario,
                        total: item.sub_total || (item.cantidad * item.precio_unitario),
                        repuesto_id: item.repuesto_id || null,
                        referencia: item.referencia || null,
                        stock_afectado: false
                    }, client);
                }

                // Eliminar items que fueron removidos
                const updatedIds = itemsToUpdate.map(i => i.id_cotizacion_item);
                const idsToDelete = existingIds.filter(id => !updatedIds.includes(id));

                for (const itemId of idsToDelete) {
                    await CotizacionItem.delete(itemId, client);
                }
            }

            // 🔹 Procesar inventario si se aprueba la cotización
            if (estatus === 'Aprobada' && estatusAnterior !== 'Aprobada') {
                const resultado = await CotizacionInventarioService.procesarSalidaInventario(
                    id,
                    req.user?.id_usuario,
                    client
                );
                logger.logInfo(`Inventario procesado para cotización ${id}`, resultado);
            }

            // 🔹 Revertir inventario si se rechaza una cotización aprobada
            if (estatus === 'Rechazada' && estatusAnterior === 'Aprobada' && inventarioProcesado) {
                const resultado = await CotizacionInventarioService.revertirSalidaInventario(id, client);
                logger.logInfo(`Inventario revertido para cotización ${id}`, resultado);
            }

            await client.query('COMMIT');

            res.json({
                message: 'Cotización actualizada exitosamente',
                id
            });

        } catch (error) {
            await client.query('ROLLBACK');
            logger.logError('Error actualizando cotización', error);
            res.status(500).json({
                error: 'Error al actualizar cotización',
                details: error.message
            });
        } finally {
            client.release();
        }
    },

    /**
     * Eliminar cotización con sus items e imágenes
     */
    async delete(req, res) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const { id } = req.params;

            // 1️⃣ Obtener rutas de las imágenes antes de borrarlas
            const imagenesRes = await client.query(
                'SELECT imagen_url FROM cotizacion_imagenes WHERE id_cotizacion = $1',
                [id]
            );

            const imagenes = imagenesRes.rows;

            // Verificar que la cotización existe
            const cotizacionRes = await client.query(
                'SELECT id_cotizacion FROM cotizaciones WHERE id_cotizacion = $1',
                [id]
            );

            if (cotizacionRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Cotización no encontrada' });
            }

            // 2️⃣ Eliminar físicamente las imágenes (async sin bloquear)
            if (imagenes.length > 0) {
                for (const img of imagenes) {
                    const filePath = path.join(__dirname, '..', 'public', img.imagen_url);

                    // Usar unlink asíncrono sin esperar
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            logger.logWarn('No se pudo borrar imagen física', { filePath, error: err.message });
                        } else {
                            logger.logInfo('Imagen eliminada', { filePath });
                        }
                    });
                }
            }

            // 3️⃣ Eliminar registros de imágenes
            await client.query(
                'DELETE FROM cotizacion_imagenes WHERE id_cotizacion = $1',
                [id]
            );

            // 4️⃣ Eliminar items
            await client.query(
                'DELETE FROM cotizacion_items WHERE id_cotizacion = $1',
                [id]
            );

            // 5️⃣ Eliminar la cotización
            await client.query(
                'DELETE FROM cotizaciones WHERE id_cotizacion = $1',
                [id]
            );

            await client.query('COMMIT');

            logger.logInfo('Cotización eliminada exitosamente', { id });
            res.json({ message: 'Cotización eliminada correctamente' });

        } catch (error) {
            await client.query('ROLLBACK');
            logger.logError('Error eliminando cotización', error);
            res.status(500).json({
                error: 'Error al eliminar cotización',
                details: error.message
            });
        } finally {
            client.release();
        }
    },

    /**
     * Contar cotizaciones aprobadas
     */
    async countApproved(req, res) {
        try {
            const count = await CotizacionModel.countByEstatus('Aprobada');
            res.json({ count });
        } catch (err) {
            logger.logError('Error contando cotizaciones aprobadas', err);
            res.status(500).json({ error: 'Error al contar cotizaciones', details: err.message });
        }
    },

    /**
     * Obtener distribución de órdenes por mecánico (para gráficos)
     */
    async distributionByMechanic(req, res) {
        try {
            const distribution = await CotizacionModel.getDistribucionPorMecanico();
            res.json(distribution);
        } catch (err) {
            logger.logError('Error obteniendo distribución por mecánico', err);
            res.status(500).json({ error: 'Error al obtener distribución', details: err.message });
        }
    },

    /**
     * Obtener cotizaciones por semana (para gráficos)
     */
    async countByMonth(req, res) {
        try {
            const counts = await CotizacionModel.getCotizacionesPorSemana();
            res.json(counts);
        } catch (err) {
            logger.logError('Error obteniendo cotizaciones por semana', err);
            res.status(500).json({ error: 'Error al obtener estadísticas', details: err.message });
        }
    }
,

        /**
         * Generar PDF de una cotización usando Puppeteer
         */
    /**
     * Subir imágenes a una cotización existente
     */
    async uploadImages(req, res) {
        try {
            const { id } = req.params;
            const imagenes = req.files || [];

            if (imagenes.length === 0) {
                return res.status(400).json({ error: 'No se enviaron imágenes' });
            }

            // Verificar que la cotización existe
            const cotizacion = await CotizacionModel.findById(id);
            if (!cotizacion) {
                return res.status(404).json({ error: 'Cotización no encontrada' });
            }

            // Verificar límite de 5 imágenes totales
            const existingCount = await CotizacionImagenModel.countByCotizacionId(id);
            if (existingCount + imagenes.length > 5) {
                // Eliminar archivos subidos que exceden el límite
                for (const img of imagenes) {
                    fs.unlink(img.path, () => {});
                }
                return res.status(400).json({
                    error: `Solo se permiten 5 imágenes por cotización. Ya tiene ${existingCount}.`
                });
            }

            const imagenesCreadas = [];
            for (const img of imagenes) {
                const imageUrl = `uploads/${img.filename}`;
                const imagen = await CotizacionImagenModel.create({
                    id_cotizacion: id,
                    imagen_url: imageUrl
                });
                imagenesCreadas.push({
                    ...imagen,
                    url: `${req.protocol}://${req.get('host')}/${imageUrl}`
                });
            }

            logger.logInfo('Imágenes subidas a cotización', { id, cantidad: imagenes.length });
            res.status(201).json({ imagenes: imagenesCreadas });
        } catch (error) {
            logger.logError('Error al subir imágenes', error);
            res.status(500).json({ error: 'Error al subir imágenes', details: error.message });
        }
    },

    /**
     * Eliminar una imagen de una cotización
     */
    async deleteImage(req, res) {
        try {
            const { id } = req.params;
            const { imagen_url } = req.body;

            if (!imagen_url) {
                return res.status(400).json({ error: 'Se requiere imagen_url' });
            }

            // Verificar que la cotización existe
            const cotizacion = await CotizacionModel.findById(id);
            if (!cotizacion) {
                return res.status(404).json({ error: 'Cotización no encontrada' });
            }

            // Extraer la ruta relativa de la URL completa
            let relativePath = imagen_url;
            if (imagen_url.includes('/uploads/')) {
                relativePath = 'uploads/' + imagen_url.split('/uploads/').pop();
            }

            // Buscar la imagen en la BD
            const imagenes = await CotizacionImagenModel.findByCotizacionId(id);
            const imagen = imagenes.find(img => img.imagen_url === relativePath);

            if (!imagen) {
                return res.status(404).json({ error: 'Imagen no encontrada en esta cotización' });
            }

            // Eliminar archivo físico
            const filePath = path.join(__dirname, '..', 'public', relativePath);
            fs.unlink(filePath, (err) => {
                if (err) {
                    logger.logWarn('No se pudo borrar imagen física', { filePath, error: err.message });
                } else {
                    logger.logInfo('Imagen física eliminada', { filePath });
                }
            });

            // Eliminar registro de BD
            await CotizacionImagenModel.delete(imagen.id_imagen);

            logger.logInfo('Imagen eliminada de cotización', { id, imagen_url: relativePath });
            res.json({ message: 'Imagen eliminada correctamente' });
        } catch (error) {
            logger.logError('Error al eliminar imagen', error);
            res.status(500).json({ error: 'Error al eliminar imagen', details: error.message });
        }
    },

        async generatePdf(req, res) {
                try {
                        const { id } = req.params;
                        const cotizacion = await CotizacionModel.findById(id);

                        if (!cotizacion) {
                                return res.status(404).json({ error: 'Cotización no encontrada' });
                        }

                        logger.logInfo(`Generando PDF para cotización ${id}`, { nombre_cliente: cotizacion.nombre_cliente });

                        const pdfBuffer = await generateQuotationPDF(cotizacion);

                        if (!pdfBuffer || pdfBuffer.length === 0) {
                                throw new Error('El PDF generado está vacío');
                        }

                        logger.logInfo(`PDF generado exitosamente para cotización ${id}`, { size: pdfBuffer.length });

                        res.set({
                                'Content-Type': 'application/pdf',
                                'Content-Disposition': `attachment; filename="Cotizacion-${(cotizacion.nombre_cliente || 'cliente').replace(/[^a-z0-9\-]/gi, '_')}.pdf"`,
                                'Content-Length': pdfBuffer.length,
                                'Cache-Control': 'no-cache'
                        });

                        return res.send(pdfBuffer);

                } catch (error) {
                        logger.logError('Error generando PDF de cotización', error);
                        return res.status(500).json({ error: 'Error generando PDF', details: error.message });
                }
        }
};

module.exports = cotizacionController;
