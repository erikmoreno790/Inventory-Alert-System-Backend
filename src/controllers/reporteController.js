const ReporteModel = require('../models/reporteModel');
const { generateReportPDF } = require('./reportePdfGenerator');
const logger = require('../config/logger');

const ReporteController = {
    // =====================================================================
    // DATA ENDPOINTS
    // =====================================================================

    /**
     * GET /api/reportes/ventas
     */
    async getVentas(req, res) {
        try {
            const { fechaInicio, fechaFin, estatus } = req.query;

            const [resumen, topItems, ventasMes] = await Promise.all([
                ReporteModel.getResumenVentas(fechaInicio, fechaFin, estatus),
                ReporteModel.getTopItemsVendidos(fechaInicio, fechaFin, 30),
                ReporteModel.getVentasPorMes(fechaInicio, fechaFin),
            ]);

            res.json({
                resumen,
                topItems,
                ventasMes,
            });
        } catch (error) {
            logger.logError('Error en reporte de ventas', error);
            res.status(500).json({ message: 'Error al generar reporte de ventas', error: error.message });
        }
    },

    /**
     * GET /api/reportes/inventario
     */
    async getInventario(req, res) {
        try {
            const { categoria } = req.query;

            const [resumen, porCategoria, itemsCriticos] = await Promise.all([
                ReporteModel.getResumenInventario(categoria),
                ReporteModel.getInventarioPorCategoria(),
                ReporteModel.getItemsCriticos(5),
            ]);

            res.json({
                resumen,
                porCategoria,
                itemsCriticos,
            });
        } catch (error) {
            logger.logError('Error en reporte de inventario', error);
            res.status(500).json({ message: 'Error al generar reporte de inventario', error: error.message });
        }
    },

    /**
     * GET /api/reportes/mecanicos
     */
    async getMecanicos(req, res) {
        try {
            const { fechaInicio, fechaFin } = req.query;

            const mecanicos = await ReporteModel.getRendimientoMecanicos(fechaInicio, fechaFin);

            // Calcular resumen
            const resumen = {
                total_mecanicos: mecanicos.length,
                total_ordenes: mecanicos.reduce((sum, m) => sum + parseInt(m.total_ordenes), 0),
                total_aprobadas: mecanicos.reduce((sum, m) => sum + parseInt(m.ordenes_aprobadas), 0),
                total_facturado: mecanicos.reduce((sum, m) => sum + parseFloat(m.valor_aprobado), 0),
                mejor_mecanico: mecanicos.length > 0 ? mecanicos[0].mecanico : 'N/A',
            };

            res.json({
                resumen,
                mecanicos,
            });
        } catch (error) {
            logger.logError('Error en reporte de mecánicos', error);
            res.status(500).json({ message: 'Error al generar reporte de mecánicos', error: error.message });
        }
    },

    /**
     * GET /api/reportes/clientes
     */
    async getClientes(req, res) {
        try {
            const { fechaInicio, fechaFin, limit } = req.query;

            const [resumen, topClientes] = await Promise.all([
                ReporteModel.getResumenClientes(fechaInicio, fechaFin),
                ReporteModel.getTopClientes(fechaInicio, fechaFin, parseInt(limit) || 20),
            ]);

            res.json({
                resumen,
                topClientes,
            });
        } catch (error) {
            logger.logError('Error en reporte de clientes', error);
            res.status(500).json({ message: 'Error al generar reporte de clientes', error: error.message });
        }
    },

    /**
     * GET /api/reportes/movimientos
     */
    async getMovimientos(req, res) {
        try {
            const { fechaInicio, fechaFin, tipo, motivo, categoria } = req.query;

            const [resumen, porCategoria, porMotivo] = await Promise.all([
                ReporteModel.getResumenMovimientos(fechaInicio, fechaFin, tipo, motivo, categoria),
                ReporteModel.getMovimientosPorCategoria(fechaInicio, fechaFin),
                ReporteModel.getMovimientosPorMotivo(fechaInicio, fechaFin),
            ]);

            res.json({
                resumen,
                porCategoria,
                porMotivo,
            });
        } catch (error) {
            logger.logError('Error en reporte de movimientos', error);
            res.status(500).json({ message: 'Error al generar reporte de movimientos', error: error.message });
        }
    },

    // =====================================================================
    // PDF ENDPOINT
    // =====================================================================

    /**
     * GET /api/reportes/:tipo/pdf
     * Genera y descarga PDF del reporte seleccionado
     */
    async downloadPDF(req, res) {
        try {
            const { tipo } = req.params;
            const filtros = req.query;

            // Validar tipo de reporte
            const tiposValidos = ['ventas', 'inventario', 'mecanicos', 'clientes', 'movimientos'];
            if (!tiposValidos.includes(tipo)) {
                return res.status(400).json({ message: `Tipo de reporte inválido. Válidos: ${tiposValidos.join(', ')}` });
            }

            // Obtener datos según tipo
            let data;
            switch (tipo) {
                case 'ventas': {
                    const [resumen, topItems, ventasMes] = await Promise.all([
                        ReporteModel.getResumenVentas(filtros.fechaInicio, filtros.fechaFin, filtros.estatus),
                        ReporteModel.getTopItemsVendidos(filtros.fechaInicio, filtros.fechaFin, 30),
                        ReporteModel.getVentasPorMes(filtros.fechaInicio, filtros.fechaFin),
                    ]);
                    data = { resumen, topItems, ventasMes };
                    break;
                }
                case 'inventario': {
                    const [resumen, porCategoria, itemsCriticos] = await Promise.all([
                        ReporteModel.getResumenInventario(filtros.categoria),
                        ReporteModel.getInventarioPorCategoria(),
                        ReporteModel.getItemsCriticos(5),
                    ]);
                    data = { resumen, porCategoria, itemsCriticos };
                    break;
                }
                case 'mecanicos': {
                    const mecanicos = await ReporteModel.getRendimientoMecanicos(filtros.fechaInicio, filtros.fechaFin);
                    const resumen = {
                        total_mecanicos: mecanicos.length,
                        total_ordenes: mecanicos.reduce((s, m) => s + parseInt(m.total_ordenes), 0),
                        total_aprobadas: mecanicos.reduce((s, m) => s + parseInt(m.ordenes_aprobadas), 0),
                        total_facturado: mecanicos.reduce((s, m) => s + parseFloat(m.valor_aprobado), 0),
                        mejor_mecanico: mecanicos.length > 0 ? mecanicos[0].mecanico : 'N/A',
                    };
                    data = { resumen, mecanicos };
                    break;
                }
                case 'clientes': {
                    const [resumen, topClientes] = await Promise.all([
                        ReporteModel.getResumenClientes(filtros.fechaInicio, filtros.fechaFin),
                        ReporteModel.getTopClientes(filtros.fechaInicio, filtros.fechaFin, parseInt(filtros.limit) || 20),
                    ]);
                    data = { resumen, topClientes };
                    break;
                }
                case 'movimientos': {
                    const [resumen, porCategoria, porMotivo] = await Promise.all([
                        ReporteModel.getResumenMovimientos(filtros.fechaInicio, filtros.fechaFin, filtros.tipo, filtros.motivo, filtros.categoria),
                        ReporteModel.getMovimientosPorCategoria(filtros.fechaInicio, filtros.fechaFin),
                        ReporteModel.getMovimientosPorMotivo(filtros.fechaInicio, filtros.fechaFin),
                    ]);
                    data = { resumen, porCategoria, porMotivo };
                    break;
                }
            }

            // Parsear columnas seleccionadas
            const columnas = filtros.columnas ? filtros.columnas.split(',') : null;

            const pdfBuffer = await generateReportPDF(tipo, data, {
                fechaInicio: filtros.fechaInicio,
                fechaFin: filtros.fechaFin,
                columnas,
            });

            const filename = `reporte_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);

        } catch (error) {
            logger.logError('Error generando PDF de reporte', error);
            res.status(500).json({ message: 'Error al generar PDF', error: error.message });
        }
    },
};

module.exports = ReporteController;
