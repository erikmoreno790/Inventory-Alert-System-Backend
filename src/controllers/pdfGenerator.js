const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Cache del logo al iniciar (evita leer el archivo en cada request)
let logoCached = null;
try {
    const logoPath = path.join(__dirname, '../public/uploads/logo.png');
    if (fs.existsSync(logoPath)) {
        logoCached = logoPath;
    }
} catch (e) {
    // Logo no disponible, se omitirá
}

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

// Colores del tema
const COLORS = {
    primary: '#059669',
    primaryDark: '#1e293b',
    white: '#FFFFFF',
    lightGray: '#F7FAFC',
    border: '#E2E8F0',
    text: '#2D3748',
    textLight: '#4A5568',
    textMuted: '#718096',
    red: '#DC2626',
    blue: '#1E40AF',
    blueBg: '#EFF6FF',
    blueBorder: '#BFDBFE',
};

const generateQuotationPDF = async (cotizacion) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 30, bottom: 30, left: 40, right: 40 },
                bufferPages: true,
                info: {
                    Title: `Cotizacion #${cotizacion.id_cotizacion}`,
                    Author: 'Frenos y Servicios del Valle',
                }
            });

            const buffers = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            let y = doc.page.margins.top;

            // ============================================================
            // HEADER
            // ============================================================
            const headerHeight = 70;
            doc.save();
            doc.roundedRect(doc.page.margins.left, y, pageWidth, headerHeight, 6)
               .fill(COLORS.primaryDark);
            doc.rect(doc.page.margins.left + pageWidth - 4, y, 4, headerHeight)
               .fill(COLORS.primary);
            doc.restore();

            // Logo
            let logoEndX = doc.page.margins.left + 12;
            if (logoCached) {
                try {
                    doc.image(logoCached, doc.page.margins.left + 10, y + 10, { width: 45, height: 45 });
                    logoEndX = doc.page.margins.left + 62;
                } catch (e) { /* Logo no se pudo cargar */ }
            }

            // Title and badge
            doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.white);
            doc.text(`Cotizacion #${cotizacion.id_cotizacion}`, logoEndX, y + 14, { width: 250 });

            doc.font('Helvetica').fontSize(8).fillColor(COLORS.white);
            const estatus = cotizacion.estatus || 'Pendiente';
            const badgeWidth = doc.widthOfString(estatus) + 14;
            doc.roundedRect(logoEndX, y + 36, badgeWidth, 16, 8)
               .fillOpacity(0.3).fill(COLORS.white);
            doc.fillOpacity(1).fillColor(COLORS.white);
            doc.text(estatus, logoEndX + 7, y + 39);

            // Company info - right side
            const rightX = doc.page.margins.left + pageWidth - 220;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.white);
            doc.text('Frenos y Servicios del Valle', rightX, y + 10, { width: 210, align: 'right' });
            doc.font('Helvetica').fontSize(7.5).fillColor('#CBD5E0');
            doc.text('Cra. 16 No. 23-35 Av Pastrana, Valledupar', rightX, y + 24, { width: 210, align: 'right' });
            doc.text('+57 315 886 8625 | frenosyserviciosdelvalle@hotmail.com', rightX, y + 35, { width: 210, align: 'right' });

            y += headerHeight + 15;

            // ============================================================
            // CLIENT & VEHICLE INFO
            // ============================================================
            const infoBoxHeight = 105;
            doc.save();
            doc.roundedRect(doc.page.margins.left, y, pageWidth, infoBoxHeight, 6)
               .lineWidth(1).strokeColor(COLORS.border).fillAndStroke(COLORS.lightGray, COLORS.border);
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary);
            doc.text('Informacion del Cliente y Vehiculo', doc.page.margins.left + 12, y + 10);

            y += 28;
            const col1X = doc.page.margins.left + 12;
            const col2X = doc.page.margins.left + pageWidth / 2 + 10;
            const labelWidth = 85;
            const lineHeight = 15;

            const drawInfoRow = (x, yPos, label, value) => {
                doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.textLight);
                doc.text(label + ':', x, yPos, { width: labelWidth });
                doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
                doc.text(String(value || 'N/A'), x + labelWidth, yPos, { width: 170 });
            };

            drawInfoRow(col1X, y, 'Cliente', cotizacion.nombre_cliente);
            drawInfoRow(col1X, y + lineHeight, 'NIT/CC', cotizacion.nit_cc);
            drawInfoRow(col1X, y + lineHeight * 2, 'Telefono', cotizacion.telefono);
            drawInfoRow(col1X, y + lineHeight * 3, 'Placa', cotizacion.placa);

            drawInfoRow(col2X, y, 'Vehiculo', cotizacion.vehiculo);
            drawInfoRow(col2X, y + lineHeight, 'Kilometraje', cotizacion.kilometraje ? `${cotizacion.kilometraje} km` : 'N/A');
            drawInfoRow(col2X, y + lineHeight * 2, 'Mecanico', cotizacion.nombre_mecanico);
            if (cotizacion.segundo_mecanico) {
                drawInfoRow(col2X, y + lineHeight * 3, '2do Mecanico', cotizacion.segundo_mecanico);
            } else {
                drawInfoRow(col2X, y + lineHeight * 3, 'Fecha', formatDate(cotizacion.fecha));
            }

            y += infoBoxHeight - 18;

            // ============================================================
            // ITEMS TABLE
            // ============================================================
            doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary);
            doc.text('Productos y Servicios', doc.page.margins.left, y);
            y += 22;

            const items = cotizacion.items || [];
            const colWidths = {
                desc: pageWidth * 0.44,
                cant: pageWidth * 0.12,
                precio: pageWidth * 0.22,
                total: pageWidth * 0.22,
            };

            // Table header
            const tableHeaderHeight = 28;
            doc.save();
            doc.roundedRect(doc.page.margins.left, y, pageWidth, tableHeaderHeight, 4)
               .fill(COLORS.primary);
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.white);
            let colX = doc.page.margins.left;
            doc.text('Descripcion', colX + 8, y + 8, { width: colWidths.desc });
            colX += colWidths.desc;
            doc.text('Cant.', colX, y + 8, { width: colWidths.cant, align: 'center' });
            colX += colWidths.cant;
            doc.text('Precio Unit.', colX, y + 8, { width: colWidths.precio, align: 'right' });
            colX += colWidths.precio;
            doc.text('Total', colX, y + 8, { width: colWidths.total - 8, align: 'right' });

            y += tableHeaderHeight;

            // Table rows
            if (items.length === 0) {
                const rowH = 30;
                doc.rect(doc.page.margins.left, y, pageWidth, rowH)
                   .lineWidth(0.5).strokeColor(COLORS.border).stroke();
                doc.font('Helvetica').fontSize(10).fillColor(COLORS.textMuted);
                doc.text('No hay productos o servicios registrados', doc.page.margins.left, y + 9, { width: pageWidth, align: 'center' });
                y += rowH;
            } else {
                for (let idx = 0; idx < items.length; idx++) {
                    const item = items[idx];
                    const desc = String(item.descripcion || '');

                    doc.font('Helvetica').fontSize(9);
                    const descHeight = doc.heightOfString(desc, { width: colWidths.desc - 16 });
                    const rowH = Math.max(28, descHeight + 14);

                    // Check if we need a new page
                    if (y + rowH > doc.page.height - doc.page.margins.bottom - 180) {
                        doc.addPage();
                        y = doc.page.margins.top;
                    }

                    const bgColor = idx % 2 === 0 ? COLORS.lightGray : COLORS.white;
                    doc.rect(doc.page.margins.left, y, pageWidth, rowH)
                       .lineWidth(0.5).strokeColor(COLORS.border).fillAndStroke(bgColor, COLORS.border);

                    colX = doc.page.margins.left;
                    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
                    doc.text(desc, colX + 8, y + 7, { width: colWidths.desc - 16 });

                    colX += colWidths.desc;
                    doc.text(String(item.cantidad || 0), colX, y + 7, { width: colWidths.cant, align: 'center' });

                    colX += colWidths.cant;
                    doc.text(formatCurrency(item.precio_unitario), colX, y + 7, { width: colWidths.precio, align: 'right' });

                    colX += colWidths.precio;
                    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.text);
                    doc.text(formatCurrency(item.total), colX, y + 7, { width: colWidths.total - 8, align: 'right' });

                    y += rowH;
                }
            }

            y += 15;

            // ============================================================
            // TOTALS SECTION
            // ============================================================
            if (y + 200 > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                y = doc.page.margins.top;
            }

            const totalsWidth = 280;
            const totalsX = doc.page.margins.left + pageWidth - totalsWidth;
            const totalsBoxY = y;

            doc.save();
            doc.roundedRect(totalsX, totalsBoxY, totalsWidth, cotizacion.descuento > 0 ? 100 : 80, 6)
               .lineWidth(1).strokeColor(COLORS.border).fillAndStroke(COLORS.lightGray, COLORS.border);
            doc.restore();

            let totY = totalsBoxY + 12;

            doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text);
            doc.text('Subtotal:', totalsX + 15, totY, { width: 130 });
            doc.text(formatCurrency(cotizacion.subtotal), totalsX + 145, totY, { width: totalsWidth - 165, align: 'right' });
            totY += 20;

            if (cotizacion.descuento && cotizacion.descuento > 0) {
                doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.red);
                doc.text('Descuento:', totalsX + 15, totY, { width: 130 });
                doc.text(`-${formatCurrency(cotizacion.descuento)}`, totalsX + 145, totY, { width: totalsWidth - 165, align: 'right' });
                totY += 20;
            }

            const totalBarH = 32;
            const totalBarY = cotizacion.descuento > 0 ? totalsBoxY + 72 : totalsBoxY + 52;
            doc.save();
            doc.roundedRect(totalsX, totalBarY, totalsWidth, totalBarH, 0)
               .fill(COLORS.primary);
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.white);
            doc.text('TOTAL:', totalsX + 15, totalBarY + 8, { width: 100 });
            doc.text(formatCurrency(cotizacion.total), totalsX + 115, totalBarY + 8, { width: totalsWidth - 135, align: 'right' });

            y = (cotizacion.descuento > 0 ? totalsBoxY + 110 : totalsBoxY + 95);

            // ============================================================
            // OBSERVATIONS
            // ============================================================
            if (cotizacion.observaciones) {
                if (y + 80 > doc.page.height - doc.page.margins.bottom) {
                    doc.addPage();
                    y = doc.page.margins.top;
                }

                const obsText = String(cotizacion.observaciones);
                doc.font('Helvetica').fontSize(10);
                const obsHeight = doc.heightOfString(obsText, { width: pageWidth - 30 }) + 35;

                doc.save();
                doc.roundedRect(doc.page.margins.left, y, pageWidth, obsHeight, 6)
                   .lineWidth(1).strokeColor(COLORS.blueBorder).fillAndStroke(COLORS.blueBg, COLORS.blueBorder);
                doc.restore();

                doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.blue);
                doc.text('Observaciones:', doc.page.margins.left + 12, y + 10);

                doc.font('Helvetica').fontSize(10).fillColor('#1E3A8A');
                doc.text(obsText, doc.page.margins.left + 12, y + 26, { width: pageWidth - 30 });

                y += obsHeight + 15;
            }

            // ============================================================
            // CONDITIONS (Tiempo de trabajo, Validez, Garantía)
            // ============================================================
            if (y + 80 > doc.page.height - doc.page.margins.bottom - 120) {
                doc.addPage();
                y = doc.page.margins.top;
            }

            const condBoxHeight = 65;
            doc.save();
            doc.roundedRect(doc.page.margins.left, y, pageWidth, condBoxHeight, 6)
               .lineWidth(1).strokeColor(COLORS.border).fillAndStroke(COLORS.lightGray, COLORS.border);
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary);
            doc.text('Condiciones', doc.page.margins.left + 12, y + 8);

            const condY = y + 26;
            const condColWidth = pageWidth / 3;
            const condItems = [
                { label: 'Tiempo de Trabajo', value: cotizacion.tiempo_trabajo || '1 día' },
                { label: 'Cotización Válida', value: cotizacion.validez_cotizacion || '5 días hábiles' },
                { label: 'Garantía', value: cotizacion.garantia || '90 días' },
            ];

            condItems.forEach((item, idx) => {
                const cX = doc.page.margins.left + 12 + (condColWidth * idx);
                doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.textLight);
                doc.text(item.label + ':', cX, condY, { width: condColWidth - 20 });
                doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text);
                doc.text(item.value, cX, condY + 13, { width: condColWidth - 20 });
            });

            y += condBoxHeight + 15;

            // ============================================================
            // SIGNATURES
            // ============================================================
            if (y + 100 > doc.page.height - doc.page.margins.bottom - 40) {
                doc.addPage();
                y = doc.page.margins.top;
            }

            y += 10;
            doc.moveTo(doc.page.margins.left, y)
               .lineTo(doc.page.margins.left + pageWidth, y)
               .lineWidth(0.5).strokeColor(COLORS.border).stroke();
            y += 20;

            const sigWidth = pageWidth / 2 - 30;
            doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.textLight);
            doc.text('Firma del Cliente:', doc.page.margins.left, y, { width: sigWidth, align: 'center' });
            doc.text('Firma Autorizada:', doc.page.margins.left + pageWidth / 2 + 20, y, { width: sigWidth, align: 'center' });

            y += 45;

            const sig1X = doc.page.margins.left + 20;
            const sig2X = doc.page.margins.left + pageWidth / 2 + 40;
            const sigLineW = sigWidth - 20;

            doc.moveTo(sig1X, y).lineTo(sig1X + sigLineW, y).lineWidth(1.5).strokeColor(COLORS.text).stroke();
            doc.moveTo(sig2X, y).lineTo(sig2X + sigLineW, y).lineWidth(1.5).strokeColor(COLORS.text).stroke();

            y += 6;
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.textMuted);
            doc.text(String(cotizacion.nombre_cliente || ''), sig1X, y, { width: sigLineW, align: 'center' });
            doc.text('Frenos y Servicios del Valle', sig2X, y, { width: sigLineW, align: 'center' });

            // ============================================================
            // FOOTER
            // ============================================================
            const footerHeight = 45;
            const footerY = doc.page.height - doc.page.margins.bottom - footerHeight + 10;

            doc.save();
            doc.roundedRect(doc.page.margins.left, footerY, pageWidth, footerHeight, 6)
               .fill(COLORS.primaryDark);
            doc.restore();

            doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white);
            doc.text(`(c) ${new Date().getFullYear()} Frenos y Servicios del Valle`, doc.page.margins.left, footerY + 8, { width: pageWidth, align: 'center' });

            doc.font('Helvetica').fontSize(7).fillColor('#94A3B8');
            doc.text('Desarrollado por Erik Moreno | erikmoreno790@gmail.com | WhatsApp: 302 751 5585', doc.page.margins.left, footerY + 22, { width: pageWidth, align: 'center' });

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateQuotationPDF };
