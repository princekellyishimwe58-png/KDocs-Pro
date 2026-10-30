const PDFDocument = require('pdfkit');

// Scan-to-PDF converter. Each photographed page becomes one A4 sheet,
// letterboxed to preserve the photo's aspect ratio. Pages arrive as JPEG or
// PNG buffers (validated by routes/scan.js before they get here).
const A4 = [595.28, 841.89];

function buildScanPdf(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return Promise.reject(new Error('No pages supplied'));
  }
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    images.forEach((img, i) => {
      if (i > 0) doc.addPage();
      doc.image(img.buffer, 0, 0, { fit: A4, align: 'center', valign: 'center' });
    });

    doc.end();
  });
}

module.exports = { buildScanPdf, A4 };
