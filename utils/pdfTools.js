'use strict';

/**
 * Pure-JS PDF organization tools, built on pdf-lib (no native deps).
 *
 * The feature cut follows what actually serves KDocs-Pro's phone-first
 * audience without heavy infrastructure:
 *  - Merge: combine several PDFs into one application pack (CV + cover
 *    letter + certificates is exactly how job applications are sent here).
 *  - Photos to PDF: the converter everyone actually needs here - ID copies,
 *    certificates, receipts and WhatsApp screenshots sent as one tidy PDF
 *    instead of a stack of loose images.
 *  - Extract / remove pages: clean up scanned or downloaded documents.
 *  - Rotate: fix pages that photographer sideways.
 *
 * Deliberately NOT here (from a survey of iLovePDF/Smallpdf's tools):
 *  - compress: real size reduction means re-encoding images = Ghostscript
 *    class binaries; a fake button would overpromise. Scans already go out
 *    at sensible sizes via utils/scanPdf.js.
 *  - Word/PDF<->Word, PDF->JPG, OCR: rasterizers/conversion engines are
 *    heavy, native-dependency territory for a small Express depoy.
 *  - protect/unlock: pdf-lib cannot encrypt; password handling is a
 *    support-ticket generator.
 *
 * All inputs are loaded explicitly as `ignoreEncryption: true` ONLY to be
 * able to detect the encrypted case - any encrypted file is REJECTED, never
 * processed (processing one would produce blank pages silently).
 */

const { PDFDocument, degrees, rgb } = require('pdf-lib');

// A PDF is treated like a free download: cheap individually, dangerous in
// bulk. The route-level rate limiter handles frequency; these caps handle
// size. 15 MB per file keeps phone photos converted earlier in check.
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_FILES = 12;

// Photo pages are smaller individually but people submit more of them, so the
// images tool gets its own (looser) file cap and a tighter per-image size.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 20;

// A4 in PDF points (72 per inch) - the same sheet size scan-to-PDF uses.
const A4 = [595.28, 841.89];

// Page-range syntax: "1-3,5" (1-based on purpose - it's what customers type).
// Returns unique, ascending 0-based indices; throws Error with a
// customer-readable message on anything malformed.
function parsePageRanges(spec, pageCount) {
  const raw = String(spec || '').trim();
  const out = [];
  if (!raw) return out;
  for (const part of raw.split(',')) {
    const chunk = part.trim();
    let start; let end;
    const range = chunk.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      start = Number(range[1]);
      end = Number(range[2]);
    } else {
      if (!/^\d+$/.test(chunk)) {
        throw new Error(`"${chunk}" is not a page number or range. Use page numbers like 1,3,7-9.`);
      }
      start = end = Number(chunk);
    }
    if (start < 1 || end < start) {
      throw new Error(`"${chunk}" is not a valid page range.`);
    }
    if (end > pageCount) {
      throw new Error(`This PDF has ${pageCount} page(s), so page ${end} does not exist.`);
    }
    for (let p = start; p <= end; p++) if (!out.includes(p - 1)) out.push(p - 1);
  }
  return out.sort((a, b) => a - b);
}

async function loadDoc(buffer) {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  if (doc.isEncrypted) {
    throw new Error(
      'This PDF is password-protected. Remove the password first (open it, share/export it again, or use "save as" without a password), then try here.'
    );
  }
  return doc;
}

// Merge: pages keep the upload order the customer chose in the picker.
async function mergePdfs(buffers) {
  if (buffers.length < 2) {
    throw new Error('Choose at least two PDFs to merge.');
  }
  if (buffers.length > MAX_FILES) {
    throw new Error(`Merge up to ${MAX_FILES} PDFs at once.`);
  }
  const out = await PDFDocument.create();
  let pageCount = 0;
  for (const buf of buffers) {
    const src = await loadDoc(buf);
    pageCount += src.getPageCount();
    if (pageCount > 500) {
      throw new Error('That would be more than 500 pages. Split very large packs into two files.');
    }
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return Buffer.from(await out.save({ useObjectStreams: true }));
}

// One PDF in, selected pages out as a new PDF (ascending).
async function extractPages(buffer, pageSpec) {
  const src = await loadDoc(buffer);
  const indices = parsePageRanges(pageSpec, src.getPageCount());
  if (!indices.length) throw new Error('Type the pages you want, e.g. 1,3,7-9.');
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return Buffer.from(await out.save({ useObjectStreams: true }));
}

// One PDF in, minus the named pages (at least one page must survive).
async function removePages(buffer, pageSpec) {
  const src = await loadDoc(buffer);
  const indices = parsePageRanges(pageSpec, src.getPageCount());
  if (!indices.length) throw new Error('Type the pages to remove, e.g. 2,5.');
  if (indices.length >= src.getPageCount()) {
    throw new Error('That would remove every page. Leave at least one.');
  }
  const out = await PDFDocument.create();
  const keep = src.getPageIndices().filter((i) => !indices.includes(i));
  const pages = await out.copyPages(src, keep);
  pages.forEach((p) => out.addPage(p));
  return Buffer.from(await out.save({ useObjectStreams: true }));
}

// Rotate all pages, or just the listed ones, by 90/180/270 degrees clockwise.
async function rotatePages(buffer, angleDeg, pageSpec) {
  if (![90, 180, 270].includes(Number(angleDeg))) {
    throw new Error('Rotation must be 90, 180 or 270 degrees.');
  }
  const src = await loadDoc(buffer);
  const count = src.getPageCount();
  const target = pageSpec
    ? new Set(parsePageRanges(pageSpec, count))
    : new Set(src.getPageIndices());
  if (pageSpec && !target.size) {
    throw new Error('Type the pages to rotate, or leave the box empty for all pages.');
  }
  src.getPages().forEach((page, i) => {
    if (target.has(i)) page.setRotation(degrees((page.getRotation().angle + Number(angleDeg)) % 360));
  });
  return Buffer.from(await src.save({ useObjectStreams: true }));
}

// Photo / screenshot -> PDF. Mime types are unreliable (WhatsApp, iOS and
// Android all disagree), so the real format is sniffed from magic bytes.
function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.slice(4, 12).toString('latin1').startsWith('ftyphei')) return 'heic';
  if (buf.slice(4, 8).toString('latin1') === 'ftyp') return 'heic';
  return null;
}

// pageSize: 'a4' (letterbox onto an A4 sheet, orientation follows the photo),
// 'a4-portrait' (force portrait), 'original' (page shaped like the photo).
// Every image becomes exactly one page, in picker order, so someone can
// arrange ID front / ID back / certificate by choosing them in that order.
async function imagesToPdf(files, pageSize = 'a4') {
  if (!files || files.length === 0) {
    throw new Error('Choose at least one photo first.');
  }
  if (files.length > MAX_IMAGES) {
    throw new Error(`Convert up to ${MAX_IMAGES} photos at once.`);
  }
  const mode = ['a4', 'a4-portrait', 'original'].includes(pageSize) ? pageSize : 'a4';
  const out = await PDFDocument.create();

  for (const file of files) {
    const kind = sniffImage(file.buffer);
    if (kind === 'heic') {
      throw new Error(
        'That photo is in iPhone (HEIC) format, which PDFs cannot hold directly. On your phone open Settings > Camera > Formats and pick "Most Compatible", or share the photo by email/WhatsApp and use the JPG copy.'
      );
    }
    if (kind === 'webp') {
      throw new Error(
        'That image is a WebP file. Save it as JPG or PNG first (screenshot it, or use "Save as" / "Export"), then try again.'
      );
    }
    if (!kind) {
      throw new Error('That file is not a JPG or PNG photo. Choose photos from your gallery or camera.');
    }

    // pdf-lib reads JPEG headers from the buffer's underlying ArrayBuffer
    // WITHOUT honouring byteOffset, and Node hands out pooled buffers whose
    // offset is rarely 0 - so a perfectly good phone photo can fail with
    // "SOI not found in JPEG". Handing it a standalone copy removes the
    // whole class of intermittent, upload-dependent failures.
    const standalone = new Uint8Array(file.buffer.length);
    standalone.set(file.buffer);

    let image;
    try {
      image = kind === 'jpg' ? await out.embedJpg(standalone) : await out.embedPng(standalone);
    } catch (err) {
      throw new Error(
        `Could not read "${file.originalname || 'that photo'}". Save it again as a normal JPG or PNG and retry.`
      );
    }
    const iw = image.width;
    const ih = image.height;

    let pageW; let pageH;
    if (mode === 'original') {
      // 96dpi screen pixels -> 72dpi PDF points, then capped so the sheet
      // still fits inside A4. Without the cap a modern 3000px phone photo
      // becomes an 80cm-wide page - unprintable and awkward to email. The
      // photo keeps its own shape either way.
      const raw = 0.75;
      const fitted = Math.min(A4[0] / iw, A4[1] / ih);
      const s = Math.min(raw, fitted);
      pageW = iw * s;
      pageH = ih * s;
    } else if (mode === 'a4-portrait') {
      pageW = A4[0]; pageH = A4[1];
    } else {
      const landscape = iw > ih;
      pageW = landscape ? A4[1] : A4[0];
      pageH = landscape ? A4[0] : A4[1];
    }

    const page = out.addPage([pageW, pageH]);
    // White backing so transparent PNGs and screenshots do not come out with
    // a black or grey page behind them.
    page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: rgb(1, 1, 1) });

    const scale = Math.min(pageW / iw, pageH / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    page.drawImage(image, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  return Buffer.from(await out.save({ useObjectStreams: true }));
}

function toolName(op) {
  return {
    merge: 'merge', extract: 'extract', remove: 'remove', rotate: 'rotate', images: 'photos',
  }[op] || 'other';
}

module.exports = {
  mergePdfs,
  extractPages,
  removePages,
  rotatePages,
  imagesToPdf,
  parsePageRanges,
  toolName,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
};
