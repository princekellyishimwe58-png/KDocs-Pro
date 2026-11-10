const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const KIT = path.join(ROOT, 'docs', 'backlink-kit.md');
const TRACKER = path.join(ROOT, 'docs', 'backlink-tracker.csv');

const kit = fs.readFileSync(KIT, 'utf8');
const csv = fs.readFileSync(TRACKER, 'utf8');

// The copy block that follows a given bold label, so a field can never drift
// past the limit of the form it gets pasted into.
function copyBlock(label) {
  const re = new RegExp(`\\*\\*${label}\\*\\*[\\s\\S]*?\`\`\`\\r?\\n([\\s\\S]*?)\\r?\\n\`\`\``);
  const m = kit.match(re);
  assert.ok(m, `no copy block found for "${label}"`);
  return m[1];
}

function csvRows() {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0];
  return { header, rows: lines.slice(1) };
}

describe('Backlink kit: copy fits every form field', () => {
  const limits = [
    ['Name', 40, 'Product Hunt name field'],
    ['Tagline', 60, 'Product Hunt tagline'],
    ['Short description', 160, 'meta description / short bio'],
    ['Medium description', 300, 'most directory description fields'],
    ['Long description', 600, '"about your company" fields'],
    ['Show HN title', 80, 'Hacker News submission title'],
  ];

  for (const [label, limit, why] of limits) {
    test(`${label} fits ${why} (max ${limit})`, () => {
      const value = copyBlock(label);
      assert.ok(value.length > 0, `${label} is empty`);
      assert.ok(value.length <= limit, `${label} is ${value.length} chars, limit is ${limit}`);
      assert.strictEqual(value.trim(), value, `${label} has leading/trailing whitespace`);
    });
  }

  test('the name is the brand, spelled consistently', () => {
    assert.strictEqual(copyBlock('Name'), 'KDocs Pro');
  });

  test('tagline and short description name the brand or the audience', () => {
    assert.match(copyBlock('Tagline'), /Kenya/);
    assert.match(copyBlock('Short description'), /^KDocs Pro/);
  });

  test('no placeholder text survived into a field', () => {
    for (const label of ['Name', 'Tagline', 'Short description', 'Medium description', 'Long description', 'Show HN title']) {
      const v = copyBlock(label);
      assert.doesNotMatch(v, /\b(TODO|TBD|lorem|xxx|insert here)\b/i, `${label} has placeholder text`);
    }
  });

  test('Show HN title follows the required prefix', () => {
    assert.match(copyBlock('Show HN title'), /^Show HN: /);
  });

  test('the assets the kit tells you to upload exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public', 'logo.svg')), 'logo.svg exists');
    assert.ok(fs.existsSync(path.join(ROOT, 'public', 'og-image.jpg')), 'og-image.jpg exists');
  });
});

describe('Backlink kit: target list and tracker agree', () => {
  test('every tracker row is documented in the kit', () => {
    const { rows } = csvRows();
    for (const row of rows) {
      const url = row.split(',')[1];
      assert.ok(kit.includes(url), `${row.split(',')[0]} (${url}) is in the tracker but not the kit`);
    }
  });

  test('tracker rows are well formed', () => {
    const { header, rows } = csvRows();
    assert.strictEqual(header, 'target,url,type,status,submitted_on,live_url,notes');
    assert.ok(rows.length >= 15, `expected the tier 1 list, got ${rows.length} rows`);
    const allowed = new Set(['not started', 'blocked on domain', 'submitted', 'live', 'rejected']);
    for (const row of rows) {
      const cols = row.split(',');
      assert.strictEqual(cols.length, 7, `wrong column count: ${row}`);
      assert.ok(allowed.has(cols[3]), `unknown status "${cols[3]}" for ${cols[0]}`);
      assert.match(cols[1], /^https:\/\//, `${cols[0]} has no https url`);
    }
  });

  test('domain-gated targets are marked blocked, not queued', () => {
    const { rows } = csvRows();
    for (const name of ['SaaSHub', 'BetaList', 'G2']) {
      const row = rows.find((r) => r.startsWith(`${name},`));
      assert.ok(row, `${name} missing from the tracker`);
      assert.ok(row.includes('blocked on domain'), `${name} should be blocked until the custom domain exists`);
    }
  });

  // Target names in a tier table: the first bold cell of each row. Checking the
  // whole section would match prose mentions (Capterra's row references G2).
  function tierTargets(section) {
    // Tier 1 rows start with a rank (| 1 |), Tier 2 rows lead with the name.
    return Array.from(section.matchAll(/^\|\s*(?:\d+\s*\|\s*)?\*\*(.+?)\*\*/gm), (m) => m[1].trim());
  }

  test('the domain-gated three are documented after Tier 2, never in Tier 1', () => {
    const tier1 = kit.slice(kit.indexOf('### Tier 1'), kit.indexOf('### Tier 2'));
    const tier2 = kit.slice(kit.indexOf('### Tier 2'), kit.indexOf('### Deliberately'));
    assert.ok(tier2.length > 0, 'Tier 2 section exists');
    const now = tierTargets(tier1);
    const later = tierTargets(tier2);
    assert.ok(now.length >= 10, `expected the tier 1 table, got ${now.length} rows`);
    for (const name of ['SaaSHub', 'BetaList', 'G2']) {
      assert.ok(!now.some((t) => t.startsWith(name)), `${name} must not be listed as available now`);
      assert.ok(later.some((t) => t.startsWith(name)), `${name} should be documented in Tier 2`);
    }
  });

  test('ineligible and policy-forbidden options are recorded, not silently dropped', () => {
    const excluded = kit.slice(kit.indexOf('### Deliberately'));
    assert.match(excluded, /Google Business Profile/);
    assert.match(excluded, /AlternativeTo/);
    assert.match(excluded, /link scheme/i);
  });

  test('the kit states that most links are nofollow (no false promise)', () => {
    assert.match(kit, /nofollow/i);
  });
});
