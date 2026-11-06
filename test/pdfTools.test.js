const { test, describe } = require('node:test');
const assert = require('node:assert');
const zlib = require('zlib');
const { PDFDocument } = require('pdf-lib');
const {
  mergePdfs,
  extractPages,
  removePages,
  rotatePages,
  imagesToPdf,
  parsePageRanges,
} = require('../utils/pdfTools');

// Fixtures are built in-process so the suite has no binary files and no
// network: PDFs via pdf-lib itself, PNGs via a ~20-line encoder (node:zlib).
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// A flat coloured PNG of the requested pixel size - enough for pdf-lib to
// embed and for us to reason about page geometry.
function makePng(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const o = y * (width * 3 + 1) + 1 + x * 3;
      raw[o] = 0x30; raw[o + 1] = 0x64; raw[o + 2] = 0x90;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// A real 8x6 JPEG (encoded by Chrome, so it carries an ICC profile the way
// phone photos do) - keeps the fixture inside the test file instead of a
// binary blob in the repo.
const TINY_JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdC'
  + 'IFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAA'
  + 'AADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  + 'lkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAAB'
  + 'UAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAA'
  + 'AAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAA'
  + 'AAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBh'
  + 'cmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5V'
  + 'UwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQF'
  + 'BQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBD'
  + 'AQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4e'
  + 'Hh4eHh4eHh4eHh7/wAARCAAGAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAU'
  + 'EAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAABv/EABQRAQAAAAAAAAAAAAAA'
  + 'AAAAAAD/2gAMAwEAAhEDEQA/AIQA+DX/2Q==',
  'base64'
);

// Node pools small Buffers, so a Buffer's byteOffset is usually non-zero.
// pdf-lib's JPEG header parser ignored that offset and threw "SOI not found"
// - this reproduces the shape multer actually hands us.
const pooledJpg = () => Buffer.concat([Buffer.alloc(37, 0x00), TINY_JPG]).subarray(37);

async function makePdf(pages) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`page ${i + 1}`, { x: 40, y: 760, size: 14 });
  }
  return Buffer.from(await doc.save());
}

const A4 = [595.28, 841.89];
const isA4Sheet = (size) => [size.width, size.height]
  .sort((a, b) => a - b)
  .every((v, i) => Math.abs(v - [A4[0], A4[1]][i]) < 2);

describe('parsePageRanges', () => {
  test('reads single pages and ranges, 1-based', () => {
    assert.deepStrictEqual(parsePageRanges('1,3,7-9', 10), [0, 2, 6, 7, 8]);
  });

  test('dedupes and sorts', () => {
    assert.deepStrictEqual(parsePageRanges('5,1-2,2', 5), [0, 1, 4]);
  });

  test('rejects pages past the end with a readable message', () => {
    assert.throws(() => parsePageRanges('99', 2), /has 2 page\(s\)/);
  });

  test('rejects junk', () => {
    assert.throws(() => parsePageRanges('abc', 2), /not a page number/);
  });
});

describe('mergePdfs', () => {
  test('concatenates pages in upload order', async () => {
    const merged = await PDFDocument.load(await mergePdfs([await makePdf(2), await makePdf(3)]));
    assert.strictEqual(merged.getPageCount(), 5);
  });

  test('needs at least two files', async () => {
    const one = await makePdf(1);
    await assert.rejects(() => mergePdfs([one]), /at least two/i);
  });
});

describe('extract / remove / rotate', () => {
  test('extract keeps only the asked-for pages', async () => {
    const out = await PDFDocument.load(await extractPages(await makePdf(3), '2'));
    assert.strictEqual(out.getPageCount(), 1);
  });

  test('remove drops the asked-for pages', async () => {
    const out = await PDFDocument.load(await removePages(await makePdf(3), '2'));
    assert.strictEqual(out.getPageCount(), 2);
  });

  test('rotate turns the named pages only', async () => {
    const out = await PDFDocument.load(await rotatePages(await makePdf(2), 90, '1'));
    assert.strictEqual(out.getPage(0).getRotation().angle, 90);
    assert.strictEqual(out.getPage(1).getRotation().angle, 0);
  });

  test('rotate with no page list turns every page', async () => {
    const out = await PDFDocument.load(await rotatePages(await makePdf(2), 180));
    out.getPages().forEach((p) => assert.strictEqual(p.getRotation().angle, 180));
  });

  test('refuses to remove every page', async () => {
    const doc = await makePdf(2);
    await assert.rejects(() => removePages(doc, '1,2'), /at least one/i);
  });

  test('refuses angles that are not 90/180/270', async () => {
    const doc = await makePdf(1);
    await assert.rejects(() => rotatePages(doc, 45), /90, 180 or 270/);
  });
});

describe('imagesToPdf', () => {
  test('one page per photo, in order', async () => {
    const out = await PDFDocument.load(await imagesToPdf([
      { buffer: makePng(900, 600), originalname: 'id-front.png' },
      { buffer: TINY_JPG, originalname: 'cert.jpg' },
    ], 'a4'));
    assert.strictEqual(out.getPageCount(), 2);
  });

  test('embeds a JPEG held in a pooled buffer (non-zero byteOffset)', async () => {
    const out = await PDFDocument.load(await imagesToPdf(
      [{ buffer: pooledJpg(), originalname: 'photo.jpg' }], 'a4'
    ));
    assert.strictEqual(out.getPageCount(), 1);
  });

  test('a JPEG with an ICC profile still embeds', async () => {
    assert.strictEqual(TINY_JPG.slice(0, 2).toString('hex'), 'ffd8');
    const out = await PDFDocument.load(await imagesToPdf(
      [{ buffer: TINY_JPG, originalname: 'icc.jpg' }], 'a4'
    ));
    assert.strictEqual(out.getPageCount(), 1);
  });

  test('A4 mode uses an A4 sheet and follows the photo orientation', async () => {
    const out = await PDFDocument.load(await imagesToPdf(
      [{ buffer: makePng(900, 600), originalname: 'landscape.png' }], 'a4'
    ));
    const size = out.getPage(0).getSize();
    assert.ok(isA4Sheet(size), `expected A4, got ${size.width}x${size.height}`);
    assert.ok(size.width > size.height, 'landscape photo should get a landscape sheet');
  });

  test('a4-portrait forces upright pages', async () => {
    const out = await PDFDocument.load(await imagesToPdf(
      [{ buffer: makePng(900, 600), originalname: 'landscape.png' }], 'a4-portrait'
    ));
    const size = out.getPage(0).getSize();
    assert.ok(size.height > size.width);
  });

  test('original mode keeps the photo shape at 72dpi', async () => {
    const out = await PDFDocument.load(await imagesToPdf(
      [{ buffer: makePng(200, 100), originalname: 'photo.png' }], 'original'
    ));
    const size = out.getPage(0).getSize();
    assert.ok(Math.abs(size.width - 150) < 1, `expected 200*0.75=150, got ${size.width}`);
    assert.ok(Math.abs(size.height - 75) < 1);
  });

  test('rejects non-image uploads', async () => {
    await assert.rejects(
      () => imagesToPdf([{ buffer: Buffer.from('%PDF-1.4 nope'), originalname: 'x.pdf' }], 'a4'),
      /not a JPG or PNG/
    );
  });

  test('explains the HEIC and WebP cases instead of failing silently', async () => {
    const heic = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypheic'), Buffer.alloc(16)]);
    await assert.rejects(() => imagesToPdf([{ buffer: heic }], 'a4'), /HEIC/);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(16)]);
    await assert.rejects(() => imagesToPdf([{ buffer: webp }], 'a4'), /WebP/);
  });

  test('needs at least one photo', async () => {
    await assert.rejects(() => imagesToPdf([], 'a4'), /at least one photo/i);
  });
});
