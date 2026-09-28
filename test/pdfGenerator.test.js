const { test, describe } = require('node:test');
const assert = require('node:assert');
const { generatePdf } = require('../utils/pdfGenerator');

function bufferToText(buf) {
  return buf.toString('latin1');
}

describe('generatePdf', () => {
  test('produces a valid PDF for a CV', async () => {
    const pdf = await generatePdf({
      docType: 'cv',
      templateKey: 'modern',
      fields: {
        fullName: 'Jane Wanjiru',
        summary: 'Experienced professional.',
        experience: 'managed teams',
        education: 'BCom',
        skills: 'Excel',
      },
      watermark: false,
    });
    const text = bufferToText(pdf);
    assert.ok(text.startsWith('%PDF-'), 'should start with %PDF- header');
    assert.ok(pdf.length > 1000, 'PDF should have real content');
  });

  test('produces a valid PDF for a letter type', async () => {
    const pdf = await generatePdf({
      docType: 'resignation',
      templateKey: 'classic',
      fields: {
        fullName: 'Jane Wanjiru',
        position: 'Clerk',
        companyName: 'Acme Ltd',
        lastDay: '30 July 2026',
      },
      watermark: false,
    });
    assert.ok(bufferToText(pdf).startsWith('%PDF-'));
  });

  test('falls back to the default template for unknown templateKey', async () => {
    const pdf = await generatePdf({
      docType: 'cv',
      templateKey: 'does-not-exist',
      fields: { fullName: 'X' },
      watermark: false,
    });
    assert.ok(bufferToText(pdf).startsWith('%PDF-'));
  });

  test('handles missing fields without throwing', async () => {
    const pdf = await generatePdf({ docType: 'cv', templateKey: 'modern', fields: {}, watermark: false });
    assert.ok(bufferToText(pdf).startsWith('%PDF-'));
  });

  test('watermarked preview also produces a valid PDF', async () => {
    const pdf = await generatePdf({
      docType: 'cover_letter',
      templateKey: 'minimal',
      fields: { fullName: 'Jane' },
      watermark: true,
    });
    assert.ok(bufferToText(pdf).startsWith('%PDF-'));
  });
});
