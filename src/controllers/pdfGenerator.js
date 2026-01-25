const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const path = require('path');

const generateQuotationPDF = async (cotizacion) => {
    // Leer el logo y convertirlo a base64
    let logoBase64 = '';
    try {
        const logoPath = path.join(__dirname, '../public/uploads/logo.png');
        console.log('Intentando cargar logo desde:', logoPath);
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            console.log('✓ Logo cargado correctamente');
        } else {
            console.warn('✗ Logo NO encontrado en:', logoPath);
        }
    } catch (e) {
        console.warn('No se pudo cargar el logo:', e.message);
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
            return dateStr;
        }
    };

    // Escape HTML para evitar problemas con caracteres especiales
    const escapeHtml = (text) => {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const itemsHtml = (cotizacion.items || []).map((item, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#F7FAFC' : '#FFFFFF'};">
            <td style="border:1px solid #E2E8F0;padding:10px;text-align:left;">${escapeHtml(item.descripcion)}</td>
            <td style="border:1px solid #E2E8F0;padding:10px;text-align:center;">${escapeHtml(item.cantidad)}</td>
            <td style="border:1px solid #E2E8F0;padding:10px;text-align:right;">${formatCurrency(item.precio_unitario)}</td>
            <td style="border:1px solid #E2E8F0;padding:10px;text-align:right;font-weight:600;">${formatCurrency(item.total)}</td>
        </tr>
    `).join('\n');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización ${cotizacion.id_cotizacion}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            color: #2D3748; 
            background: white;
            line-height: 1.6;
        }
        .container { max-width: 100%; margin: 0; }
        
        .header {
            background: linear-gradient(90deg, #1e293b 0%, #059669 100%);
            color: white;
            padding: 12px 18px;
            border-radius: 6px;
            margin-bottom: 12px;
        }
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header-logo {
            width: 50px;
            height: 50px;
            object-fit: contain;
            margin-right: 12px;
        }
        .header-left {
            display: flex;
            align-items: center;
        }
        .header-left-text h1 {
            font-size: 18px;
            margin-bottom: 3px;
            font-weight: 700;
            line-height: 1.2;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
        }
        .header-right {
            text-align: right;
            font-size: 9px;
            line-height: 1.3;
        }
        .header-right p { margin: 1px 0; }
        .company-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
        
        .client-info {
            background: #F7FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 12px 15px;
            margin-bottom: 15px;
        }
        .client-info h2 {
            font-size: 13px;
            color: #059669;
            margin-bottom: 8px;
            font-weight: 700;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .info-row {
            display: flex;
            font-size: 11px;
            line-height: 1.4;
        }
        .info-label {
            font-weight: 600;
            color: #4A5568;
            min-width: 100px;
        }
        .info-value {
            color: #1A202C;
        }
        
        .items-section h2 {
            font-size: 16px;
            color: #059669;
            margin-bottom: 12px;
            font-weight: 700;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            overflow: hidden;
        }
        thead {
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            color: white;
        }
        th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
        }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3), th:nth-child(4) { text-align: right; }
        td {
            padding: 10px;
            border: 1px solid #E2E8F0;
            font-size: 13px;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        .totals-box {
            width: 350px;
            background: #F7FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 20px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
        }
        .total-row.subtotal { border-bottom: 1px solid #CBD5E0; }
        .total-row.discount { color: #DC2626; }
        .total-row.final {
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            color: white;
            margin: 10px -20px -20px -20px;
            padding: 15px 20px;
            border-radius: 0 0 8px 8px;
            font-size: 18px;
            font-weight: 700;
        }
        
        .observations {
            background: #EFF6FF;
            border: 1px solid #BFDBFE;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 25px;
        }
        .observations h3 {
            font-size: 14px;
            color: #1E40AF;
            margin-bottom: 8px;
        }
        .observations p {
            font-size: 13px;
            color: #1E3A8A;
        }
        
        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin: 40px 0;
            padding-top: 30px;
            border-top: 1px solid #CBD5E0;
        }
        .signature-box {
            text-align: center;
        }
        .signature-box p {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 50px;
            color: #4A5568;
        }
        .signature-line {
            border-top: 2px solid #2D3748;
            padding-top: 8px;
        }
        .signature-line span {
            font-size: 12px;
            color: #718096;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.08;
            z-index: -1;
            pointer-events: none;
            text-align: center;
        }
        .watermark img {
            width: 400px;
            height: auto;
            filter: grayscale(100%);
        }
        .watermark-text {
            font-size: 180px;
            font-weight: 900;
            color: #059669;
        }
        
        .footer {
            background: linear-gradient(90deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            text-align: center;
            font-size: 9px;
            margin-top: 20px;
        }
        .footer p { margin: 2px 0; }
        .footer-divider {
            border-top: 1px solid rgba(255,255,255,0.2);
            margin: 6px 0;
        }
        .footer a {
            color: #10b981;
            text-decoration: none;
            font-weight: 600;
        }
        .footer .developer {
            color: #10b981;
            font-weight: 700;
            font-size: 11px;
        }
        .footer .contact-highlight {
            background: rgba(16, 185, 129, 0.15);
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
            margin: 2px;
            font-size: 10px;
        }
        
        @page { 
            size: A4;
            margin: 20mm;
        }
    </style>
</head>
<body>
    <div class="watermark">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo">` : '<div class="watermark-text">FSV</div>'}
    </div>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="header-left">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="header-logo">` : ''}
                    <div class="header-left-text">
                        <h1>Cotizacion #${cotizacion.id_cotizacion}</h1>
                        <span class="status-badge">${escapeHtml(cotizacion.estatus) || 'Pendiente'}</span>
                    </div>
                </div>
                <div class="header-right">
                    <p class="company-name">&#x1F527; Frenos y Servicios del Valle - Los Expertos</p>
                    <p>&#x1F4CD; Cra. 16 No. 23-35 Av Pastrana, Valledupar</p>
                    <p>&#x260E; +57 315 886 8625 | &#x2709; frenosyserviciosdelvalle@hotmail.com</p>
                </div>
            </div>
        </div>

        <div class="client-info">
            <h2>&#x1F464; Informacion del Cliente y Vehiculo</h2>
            <div class="info-grid">
                <div>
                    <div class="info-row">
                        <span class="info-label">Cliente:</span>
                        <span class="info-value">${escapeHtml(cotizacion.nombre_cliente)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">NIT/CC:</span>
                        <span class="info-value">${escapeHtml(cotizacion.nit_cc) || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Telefono:</span>
                        <span class="info-value">${escapeHtml(cotizacion.telefono) || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Placa:</span>
                        <span class="info-value" style="font-weight:700;background:#FEF3C7;padding:2px 8px;border-radius:4px;">${escapeHtml(cotizacion.placa)}</span>
                    </div>
                </div>
                <div>
                    <div class="info-row">
                        <span class="info-label">Vehiculo:</span>
                        <span class="info-value">${escapeHtml(cotizacion.vehiculo)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Kilometraje:</span>
                        <span class="info-value">${escapeHtml(cotizacion.kilometraje)} km</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Mecanico:</span>
                        <span class="info-value">${escapeHtml(cotizacion.nombre_mecanico)}</span>
                    </div>
                    ${cotizacion.segundo_mecanico ? `
                    <div class="info-row">
                        <span class="info-label">2do Mecanico:</span>
                        <span class="info-value">${escapeHtml(cotizacion.segundo_mecanico)}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="info-label">Fecha:</span>
                        <span class="info-value">${formatDate(cotizacion.fecha)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="items-section">
            <h2>&#x1F6E0; Productos y Servicios</h2>
            <table>
                <thead>
                    <tr>
                        <th>Descripcion</th>
                        <th>Cantidad</th>
                        <th>Precio Unitario</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#718096;">No hay productos o servicios registrados</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="totals-section">
            <div class="totals-box">
                <div class="total-row subtotal">
                    <span><strong>Subtotal:</strong></span>
                    <span><strong>${formatCurrency(cotizacion.subtotal)}</strong></span>
                </div>
                ${cotizacion.descuento && cotizacion.descuento > 0 ? `
                <div class="total-row discount">
                    <span><strong>Descuento:</strong></span>
                    <span><strong>-${formatCurrency(cotizacion.descuento)}</strong></span>
                </div>
                ` : ''}
                <div class="total-row final">
                    <span>TOTAL:</span>
                    <span>${formatCurrency(cotizacion.total)}</span>
                </div>
            </div>
        </div>

        ${cotizacion.observaciones ? `
        <div class="observations">
            <h3>&#x1F4AC; Observaciones:</h3>
            <p>${escapeHtml(cotizacion.observaciones)}</p>
        </div>
        ` : ''}

        <div class="signatures">
            <div class="signature-box">
                <p>Firma del Cliente:</p>
                <div class="signature-line">
                    <span>${escapeHtml(cotizacion.nombre_cliente)}</span>
                </div>
            </div>
            <div class="signature-box">
                <p>Firma Autorizada:</p>
                <div class="signature-line">
                    <span>Frenos y Servicios del Valle</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>&#xA9; ${new Date().getFullYear()} Frenos y Servicios del Valle</strong></p>
            <div class="footer-divider"></div>
            <p>Desarrollado por <span class="developer">&#x1F468;&#x200D;&#x1F4BB; Erik Moreno</span></p>
            <p>
                <span class="contact-highlight">
                    <a href="mailto:erikmoreno790@gmail.com">&#x2709; erikmoreno790@gmail.com</a>
                </span>
                <span class="contact-highlight">
                    <a href="https://wa.me/573027515585">&#x1F4AC; WhatsApp: 302 751 5585</a>
                </span>
            </p>
        </div>
    </div>
</body>
</html>
    `;

    // Detectar si estamos en entorno serverless (Vercel, Render, AWS Lambda, etc.)
    const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || 
                        process.env.VERCEL || 
                        process.env.RENDER ||
                        !fs.existsSync('/usr/bin/google-chrome') && !fs.existsSync('/usr/bin/chromium-browser');
    
    let browser;
    
    if (isServerless) {
        // Configuración para entornos serverless
        console.log('🌐 Lanzando Chromium en modo serverless...');
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    } else {
        // Configuración para desarrollo local
        console.log('💻 Lanzando Puppeteer en modo local...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ],
            // En local, intentar usar la instalación local de Chrome/Chromium
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });
    }
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true, 
        margin: { 
            top: '20mm', 
            right: '20mm', 
            bottom: '20mm', 
            left: '20mm' 
        },
        preferCSSPageSize: false
    });
    
    await browser.close();

    return pdfBuffer;
};

module.exports = { generateQuotationPDF };
