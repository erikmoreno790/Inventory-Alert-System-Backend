const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Cache del logo al iniciar
let logoCached = null;
try {
    const logoPath = path.join(__dirname, '../public/uploads/logo.png');
    if (fs.existsSync(logoPath)) {
        logoCached = logoPath;
    }
} catch (e) { /* Logo no disponible */ }

const formatCurrency = (value) => {
    value = Number(value) || 0;
    return `$ ${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return String(dateStr);
    }
};

const formatPercent = (value) => {
    return `${(Number(value) || 0).toFixed(1)}%`;
};

// Colores del tema (mismo que cotizaciones)
const C = {
    primary: '#059669',
    primaryDark: '#1e293b',
    white: '#FFFFFF',
    lightGray: '#F7FAFC',
    border: '#E2E8F0',
    text: '#2D3748',
    textLight: '#4A5568',
    textMuted: '#718096',
    red: '#DC2626',
    green: '#16A34A',
    blue: '#1E40AF',
    amber: '#D97706',
    blueBg: '#EFF6FF',
};

// ===================================================================
// HELPERS
// ===================================================================

function drawHeader(doc, title, pageWidth, opciones = {}) {
    let y = doc.page.margins.top;
    const headerH = 65;

    doc.save();
    doc.roundedRect(doc.page.margins.left, y, pageWidth, headerH, 6).fill(C.primaryDark);
    doc.rect(doc.page.margins.left + pageWidth - 4, y, 4, headerH).fill(C.primary);
    doc.restore();

    let logoEndX = doc.page.margins.left + 12;
    if (logoCached) {
        try {
            doc.image(logoCached, doc.page.margins.left + 10, y + 10, { width: 42, height: 42 });
            logoEndX = doc.page.margins.left + 60;
        } catch (e) { /* skip */ }
    }

    doc.font('Helvetica-Bold').fontSize(15).fillColor(C.white);
    doc.text(title, logoEndX, y + 12, { width: 280 });

    // Fecha generación
    doc.font('Helvetica').fontSize(8).fillColor('#94A3B8');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, logoEndX, y + 34);

    // Company info right
    const rightX = doc.page.margins.left + pageWidth - 220;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white);
    doc.text('Frenos y Servicios del Valle', rightX, y + 10, { width: 210, align: 'right' });
    doc.font('Helvetica').fontSize(7.5).fillColor('#CBD5E0');
    doc.text('Cra. 16 No. 23-35 Av Pastrana, Valledupar', rightX, y + 24, { width: 210, align: 'right' });
    doc.text('+57 315 886 8625', rightX, y + 35, { width: 210, align: 'right' });

    y += headerH + 10;

    // Filtros aplicados
    if (opciones.fechaInicio || opciones.fechaFin) {
        doc.font('Helvetica').fontSize(8).fillColor(C.textMuted);
        const desde = opciones.fechaInicio ? formatDate(opciones.fechaInicio) : 'Inicio';
        const hasta = opciones.fechaFin ? formatDate(opciones.fechaFin) : 'Hoy';
        doc.text(`Período: ${desde} — ${hasta}`, doc.page.margins.left, y);
        y += 14;
    }

    return y;
}

function drawKPIRow(doc, y, pageWidth, kpis) {
    const count = kpis.length;
    const kpiW = (pageWidth - (count - 1) * 8) / count;
    const kpiH = 52;

    kpis.forEach((kpi, i) => {
        const x = doc.page.margins.left + i * (kpiW + 8);
        doc.save();
        doc.roundedRect(x, y, kpiW, kpiH, 5).lineWidth(1).strokeColor(C.border).fillAndStroke(C.lightGray, C.border);
        doc.restore();

        doc.font('Helvetica').fontSize(7).fillColor(C.textMuted);
        doc.text(kpi.label, x + 8, y + 8, { width: kpiW - 16 });

        doc.font('Helvetica-Bold').fontSize(13).fillColor(kpi.color || C.text);
        doc.text(kpi.value, x + 8, y + 22, { width: kpiW - 16 });
    });

    return y + kpiH + 12;
}

function drawSectionTitle(doc, y, text, pageWidth) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.primary);
    doc.text(text, doc.page.margins.left, y);
    y += 4;
    doc.moveTo(doc.page.margins.left, y + 14).lineTo(doc.page.margins.left + pageWidth, y + 14)
       .lineWidth(0.5).strokeColor(C.border).stroke();
    return y + 20;
}

function drawTable(doc, y, pageWidth, headers, rows, colWidths) {
    const headerH = 24;
    const rowH = 22;

    // Header
    doc.save();
    doc.roundedRect(doc.page.margins.left, y, pageWidth, headerH, 3).fill(C.primary);
    doc.restore();

    let colX = doc.page.margins.left;
    headers.forEach((h, i) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white);
        doc.text(h.label, colX + 6, y + 7, { width: colWidths[i] - 12, align: h.align || 'left' });
        colX += colWidths[i];
    });

    y += headerH;

    // Rows
    for (let r = 0; r < rows.length; r++) {
        // Page break
        if (y + rowH > doc.page.height - doc.page.margins.bottom - 50) {
            doc.addPage();
            y = doc.page.margins.top;

            // Redraw header on new page
            doc.save();
            doc.roundedRect(doc.page.margins.left, y, pageWidth, headerH, 3).fill(C.primary);
            doc.restore();
            colX = doc.page.margins.left;
            headers.forEach((h, i) => {
                doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white);
                doc.text(h.label, colX + 6, y + 7, { width: colWidths[i] - 12, align: h.align || 'left' });
                colX += colWidths[i];
            });
            y += headerH;
        }

        const bgColor = r % 2 === 0 ? C.lightGray : C.white;
        doc.rect(doc.page.margins.left, y, pageWidth, rowH)
           .lineWidth(0.5).strokeColor(C.border).fillAndStroke(bgColor, C.border);

        colX = doc.page.margins.left;
        const row = rows[r];
        headers.forEach((h, i) => {
            const cellVal = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]) : '';
            doc.font('Helvetica').fontSize(8).fillColor(C.text);
            doc.text(cellVal, colX + 6, y + 7, { width: colWidths[i] - 12, align: h.align || 'left' });
            colX += colWidths[i];
        });

        y += rowH;
    }

    return y + 8;
}

function drawFooter(doc, pageWidth) {
    const footerH = 35;
    const footerY = doc.page.height - doc.page.margins.bottom - footerH + 5;
    doc.save();
    doc.roundedRect(doc.page.margins.left, footerY, pageWidth, footerH, 6).fill(C.primaryDark);
    doc.restore();

    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.white);
    doc.text(`© ${new Date().getFullYear()} Frenos y Servicios del Valle`, doc.page.margins.left, footerY + 8, { width: pageWidth, align: 'center' });
    doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8');
    doc.text('Desarrollado por Erik Moreno | erikmoreno790@gmail.com | WhatsApp: 302 751 5585', doc.page.margins.left, footerY + 19, { width: pageWidth, align: 'center' });
}

// ===================================================================
// REPORT-SPECIFIC GENERATORS
// ===================================================================

function buildVentasPDF(doc, data, pageWidth, opciones) {
    let y = drawHeader(doc, 'Reporte de Ventas', pageWidth, opciones);

    const r = data.resumen;
    const tasa = r.total_cotizaciones > 0
        ? ((parseInt(r.aprobadas) / parseInt(r.total_cotizaciones)) * 100).toFixed(1)
        : '0.0';

    y = drawKPIRow(doc, y, pageWidth, [
        { label: 'Total Facturado', value: formatCurrency(r.total_facturado), color: C.green },
        { label: 'Cotizaciones', value: String(r.total_cotizaciones) },
        { label: 'Ticket Promedio', value: formatCurrency(r.ticket_promedio) },
        { label: 'Tasa Aprobación', value: `${tasa}%`, color: parseFloat(tasa) >= 50 ? C.green : C.red },
    ]);

    y = drawKPIRow(doc, y, pageWidth, [
        { label: 'Aprobadas', value: String(r.aprobadas), color: C.green },
        { label: 'Pendientes', value: String(r.pendientes), color: C.amber },
        { label: 'Rechazadas', value: String(r.rechazadas), color: C.red },
        { label: 'Total Descuentos', value: formatCurrency(r.total_descuentos) },
    ]);

    // Top items
    if (data.topItems && data.topItems.length > 0) {
        y = drawSectionTitle(doc, y, 'Top Repuestos / Servicios Vendidos', pageWidth);

        const cols = opciones.columnas;
        let headers = [
            { key: 'descripcion', label: 'Descripción' },
            { key: 'total_cantidad', label: 'Cantidad', align: 'center' },
            { key: 'total_valor_fmt', label: 'Valor Total', align: 'right' },
            { key: 'en_cotizaciones', label: '# Cotiz.', align: 'center' },
            { key: 'precio_promedio_fmt', label: 'Precio Prom.', align: 'right' },
        ];

        if (cols) headers = headers.filter(h => cols.includes(h.key) || h.key === 'descripcion');

        const descW = pageWidth * 0.38;
        const otherW = (pageWidth - descW) / (headers.length - 1);
        const colWidths = headers.map((_, i) => i === 0 ? descW : otherW);

        const rows = data.topItems.map(item => ({
            ...item,
            total_valor_fmt: formatCurrency(item.total_valor),
            precio_promedio_fmt: formatCurrency(item.precio_promedio),
        }));

        y = drawTable(doc, y, pageWidth, headers, rows, colWidths);
    }

    // Ventas por mes
    if (data.ventasMes && data.ventasMes.length > 0) {
        if (y + 60 > doc.page.height - doc.page.margins.bottom - 50) {
            doc.addPage();
            y = doc.page.margins.top;
        }
        y = drawSectionTitle(doc, y, 'Ventas por Mes', pageWidth);

        const headers = [
            { key: 'mes_label', label: 'Mes' },
            { key: 'total_cotizaciones', label: 'Cotizaciones', align: 'center' },
            { key: 'aprobadas', label: 'Aprobadas', align: 'center' },
            { key: 'total_facturado_fmt', label: 'Facturado', align: 'right' },
        ];
        const cw = [pageWidth * 0.3, pageWidth * 0.2, pageWidth * 0.2, pageWidth * 0.3];
        const rows = data.ventasMes.map(m => ({
            ...m,
            total_facturado_fmt: formatCurrency(m.total_facturado),
        }));

        y = drawTable(doc, y, pageWidth, headers, rows, cw);
    }

    return y;
}

function buildInventarioPDF(doc, data, pageWidth, opciones) {
    let y = drawHeader(doc, 'Reporte de Inventario', pageWidth, opciones);

    const r = data.resumen;
    y = drawKPIRow(doc, y, pageWidth, [
        { label: 'Valor Inventario (Venta)', value: formatCurrency(r.valor_total_venta), color: C.green },
        { label: 'Valor Inventario (Costo)', value: formatCurrency(r.valor_total_costo) },
        { label: 'Total Items', value: String(r.total_items) },
        { label: 'Total Unidades', value: String(r.total_unidades) },
    ]);

    y = drawKPIRow(doc, y, pageWidth, [
        { label: 'Sin Stock', value: String(r.items_sin_stock), color: C.red },
        { label: 'Stock Bajo (<5)', value: String(r.items_stock_bajo), color: C.amber },
        { label: 'Stock OK', value: String(r.items_stock_ok), color: C.green },
        { label: 'Margen Estimado', value: formatCurrency(r.valor_total_venta - r.valor_total_costo) },
    ]);

    // Por categoría
    if (data.porCategoria && data.porCategoria.length > 0) {
        y = drawSectionTitle(doc, y, 'Distribución por Categoría', pageWidth);

        const headers = [
            { key: 'categoria', label: 'Categoría' },
            { key: 'total_items', label: 'Items', align: 'center' },
            { key: 'total_unidades', label: 'Unidades', align: 'center' },
            { key: 'valor_venta_fmt', label: 'Valor Venta', align: 'right' },
            { key: 'sin_stock', label: 'Sin Stock', align: 'center' },
            { key: 'stock_bajo', label: 'Stock Bajo', align: 'center' },
        ];
        const cw = [pageWidth * 0.24, pageWidth * 0.12, pageWidth * 0.14, pageWidth * 0.22, pageWidth * 0.14, pageWidth * 0.14];
        const rows = data.porCategoria.map(c => ({
            ...c,
            valor_venta_fmt: formatCurrency(c.valor_venta),
        }));

        y = drawTable(doc, y, pageWidth, headers, rows, cw);
    }

    // Items críticos
    if (data.itemsCriticos && data.itemsCriticos.length > 0) {
        if (y + 60 > doc.page.height - doc.page.margins.bottom - 50) {
            doc.addPage();
            y = doc.page.margins.top;
        }
        y = drawSectionTitle(doc, y, 'Items con Stock Crítico', pageWidth);

        const cols = opciones.columnas;
        let headers = [
            { key: 'nombre', label: 'Nombre' },
            { key: 'referencia', label: 'Referencia' },
            { key: 'categoria', label: 'Categoría' },
            { key: 'stock', label: 'Stock', align: 'center' },
            { key: 'valor_fmt', label: 'Valor en Stock', align: 'right' },
        ];

        if (cols) headers = headers.filter(h => cols.includes(h.key) || h.key === 'nombre');

        const nameW = pageWidth * 0.3;
        const otherW = (pageWidth - nameW) / (headers.length - 1);
        const cw = headers.map((_, i) => i === 0 ? nameW : otherW);

        const rows = data.itemsCriticos.map(item => ({
            ...item,
            valor_fmt: formatCurrency(item.valor_en_stock),
        }));

        y = drawTable(doc, y, pageWidth, headers, rows, cw);
    }

    return y;
}

function buildMecanicosPDF(doc, data, pageWidth, opciones) {
    let y = drawHeader(doc, 'Reporte de Mecánicos', pageWidth, opciones);

    const r = data.resumen;
    y = drawKPIRow(doc, y, pageWidth, [
        { label: 'Total Facturado', value: formatCurrency(r.total_facturado), color: C.green },
        { label: 'Total Mecánicos', value: String(r.total_mecanicos) },
        { label: 'Total Órdenes', value: String(r.total_ordenes) },
        { label: 'Mejor Mecánico', value: String(r.mejor_mecanico) },
    ]);

    if (data.mecanicos && data.mecanicos.length > 0) {
        y = drawSectionTitle(doc, y, 'Rendimiento por Mecánico', pageWidth);

        const cols = opciones.columnas;
        let headers = [
            { key: 'mecanico', label: 'Mecánico' },
            { key: 'total_ordenes', label: 'Órdenes', align: 'center' },
            { key: 'ordenes_aprobadas', label: 'Aprobadas', align: 'center' },
            { key: 'tasa_aprobacion_fmt', label: 'Tasa Aprob.', align: 'center' },
            { key: 'valor_aprobado_fmt', label: 'Valor Facturado', align: 'right' },
        ];

        if (cols) headers = headers.filter(h => cols.includes(h.key) || h.key === 'mecanico');

        const nameW = pageWidth * 0.28;
        const otherW = (pageWidth - nameW) / (headers.length - 1);
        const cw = headers.map((_, i) => i === 0 ? nameW : otherW);

        const rows = data.mecanicos.map(m => ({
            ...m,
            tasa_aprobacion_fmt: formatPercent(m.tasa_aprobacion),
            valor_aprobado_fmt: formatCurrency(m.valor_aprobado),
        }));

        y = drawTable(doc, y, pageWidth, headers, rows, cw);
    }

    return y;
}

function buildClientesPDF(doc, data, pageWidth, opciones) {
    let y = drawHeader(doc, 'Reporte de Clientes', pageWidth, opciones);

    const r = data.resumen;
    y = drawKPIRow(doc, y, pageWidth, [
        { label: 'Total Facturado', value: formatCurrency(r.total_facturado), color: C.green },
        { label: 'Clientes Únicos', value: String(r.total_clientes_unicos) },
        { label: 'Total Cotizaciones', value: String(r.total_cotizaciones) },
        { label: 'Ticket Promedio', value: formatCurrency(r.ticket_promedio) },
    ]);

    if (data.topClientes && data.topClientes.length > 0) {
        y = drawSectionTitle(doc, y, 'Top Clientes por Facturación', pageWidth);

        const cols = opciones.columnas;
        let headers = [
            { key: 'nombre_cliente', label: 'Cliente' },
            { key: 'placa', label: 'Placa' },
            { key: 'total_cotizaciones', label: 'Cotiz.', align: 'center' },
            { key: 'cotizaciones_aprobadas', label: 'Aprobadas', align: 'center' },
            { key: 'total_facturado_fmt', label: 'Total Facturado', align: 'right' },
            { key: 'ultima_visita_fmt', label: 'Última Visita' },
        ];

        if (cols) headers = headers.filter(h => cols.includes(h.key) || h.key === 'nombre_cliente');

        const nameW = pageWidth * 0.24;
        const otherW = (pageWidth - nameW) / (headers.length - 1);
        const cw = headers.map((_, i) => i === 0 ? nameW : otherW);

        const rows = data.topClientes.map(c => ({
            ...c,
            total_facturado_fmt: formatCurrency(c.total_facturado),
            ultima_visita_fmt: c.ultima_visita ? formatDate(c.ultima_visita) : 'N/A',
        }));

        y = drawTable(doc, y, pageWidth, headers, rows, cw);
    }

    return y;
}

function buildMovimientosPDF(doc, data, pageWidth, opciones) {
    let y = drawHeader(doc, 'Reporte de Movimientos', pageWidth, opciones);

    const r = data.resumen;
    y = drawKPIRow(doc, y, pageWidth, [
        { label: 'Total Movimientos', value: String(r.total_movimientos) },
        { label: 'Entradas', value: `${r.total_entradas} (${r.cantidad_entradas} uds)`, color: C.green },
        { label: 'Salidas', value: `${r.total_salidas} (${r.cantidad_salidas} uds)`, color: C.red },
        { label: 'Repuestos Afectados', value: String(r.repuestos_afectados) },
    ]);

    // Por categoría
    if (data.porCategoria && data.porCategoria.length > 0) {
        y = drawSectionTitle(doc, y, 'Movimientos por Categoría', pageWidth);

        const headers = [
            { key: 'categoria', label: 'Categoría' },
            { key: 'total_movimientos', label: 'Total', align: 'center' },
            { key: 'entradas', label: 'Entradas', align: 'center' },
            { key: 'salidas', label: 'Salidas', align: 'center' },
            { key: 'cantidad_entradas', label: 'Uds. Entrada', align: 'center' },
            { key: 'cantidad_salidas', label: 'Uds. Salida', align: 'center' },
        ];
        const cw = [pageWidth * 0.24, pageWidth * 0.12, pageWidth * 0.14, pageWidth * 0.14, pageWidth * 0.18, pageWidth * 0.18];

        y = drawTable(doc, y, pageWidth, headers, data.porCategoria, cw);
    }

    // Por motivo
    if (data.porMotivo && data.porMotivo.length > 0) {
        if (y + 60 > doc.page.height - doc.page.margins.bottom - 50) {
            doc.addPage();
            y = doc.page.margins.top;
        }
        y = drawSectionTitle(doc, y, 'Movimientos por Motivo', pageWidth);

        const headers = [
            { key: 'motivo', label: 'Motivo' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'total_movimientos', label: 'Total Movs.', align: 'center' },
            { key: 'total_cantidad', label: 'Total Cantidad', align: 'center' },
        ];
        const cw = [pageWidth * 0.3, pageWidth * 0.2, pageWidth * 0.25, pageWidth * 0.25];

        y = drawTable(doc, y, pageWidth, headers, data.porMotivo, cw);
    }

    return y;
}

// ===================================================================
// MAIN EXPORT
// ===================================================================

const generateReportPDF = async (tipo, data, opciones = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 30, bottom: 30, left: 40, right: 40 },
                bufferPages: true,
                info: {
                    Title: `Reporte ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} - Frenos y Servicios del Valle`,
                    Author: 'Frenos y Servicios del Valle',
                }
            });

            const buffers = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

            switch (tipo) {
                case 'ventas':
                    buildVentasPDF(doc, data, pageWidth, opciones);
                    break;
                case 'inventario':
                    buildInventarioPDF(doc, data, pageWidth, opciones);
                    break;
                case 'mecanicos':
                    buildMecanicosPDF(doc, data, pageWidth, opciones);
                    break;
                case 'clientes':
                    buildClientesPDF(doc, data, pageWidth, opciones);
                    break;
                case 'movimientos':
                    buildMovimientosPDF(doc, data, pageWidth, opciones);
                    break;
            }

            // Footer on every page
            const pages = doc.bufferedPageRange();
            for (let i = pages.start; i < pages.start + pages.count; i++) {
                doc.switchToPage(i);
                drawFooter(doc, pageWidth);
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateReportPDF };
