'use strict';

/**
 * Pure-JS PDF organization tools, built on pdf-lib (no native deps).
 *
 * The feature cut follows what actually serves KDocs-Pro's phone-first
 * audience without heavy infrastructure:
 *  - Merge: combine several PDFs into one application pack (CV + cover
 *    letter + certificates is exactly how job applications are sent here).
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

const { PDFDocument, degrees } = require('pdf-lib');

// A PDF is treated like a free download: cheap individually, dangerous in
// bulk. The route-level rate limiter handles frequency; these caps handle
// size. 15 MB per file keeps phone photos converted earlier in check.
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_FILES = 12;

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

function toolName(op) {
  return { merge: 'merge', extract: 'extract', remove: 'remove', rotate: 'rotate' }[op] || 'other';
}

module.exports = {
  mergePdfs,
  extractPages,
  removePages,
  rotatePages,
  parsePageRanges,
  toolName,
  MAX_FILE_BYTES,
  MAX_FILES,
};
