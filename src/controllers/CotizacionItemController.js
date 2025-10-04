const CotizacionItem = require('../models/cotizacionItemModel');

const cotizacionItemController = {
    async getByCotizacionId(req, res) {
        try {
            const { id } = req.params;
            const items = await CotizacionItem.getByCotizacionId(id);
            res.json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async create(req, res) {
        try {
            const nuevo = await CotizacionItem.create(req.body);
            res.status(201).json(nuevo);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const actualizado = await CotizacionItem.update(id, req.body);
            res.json(actualizado);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            await CotizacionItem.delete(id);
            res.json({ message: 'Item eliminado' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getApprovedItemsReportByDate(req, res) {
        try {
            const { fechaInicio, fechaFin } = req.query;

            if (!fechaInicio || !fechaFin) {
                return res.status(400).json({ 
                    error: 'Debes enviar fechaInicio y fechaFin en formato YYYY-MM-DD' 
                });
            }

            const reporte = await CotizacionItem.getApprovedItemsReportByDate(fechaInicio, fechaFin);
            res.json(reporte);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al generar el reporte' });
        }
    }
};

module.exports = cotizacionItemController;
