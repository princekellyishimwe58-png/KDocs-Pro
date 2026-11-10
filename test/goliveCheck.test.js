const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'tools', 'golive-check.js');
const GUIDE = path.join(ROOT, 'docs', 'start-here.md');
const guide = fs.readFileSync(GUIDE, 'utf8');

// Runs the checker with no arguments: it must refuse before touching the
// network, so this stays fast and offline.
function runNoArgs() {
  try {
    const stdout = execFileSync(process.execPath, [TOOL], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

describe('Go-live checker', () => {
  test('refuses to run without a domain, and says how to use it', () => {
    const { code, stderr } = runNoArgs();
    assert.strictEqual(code, 2, 'should exit 2 when no domain is given');
    assert.match(stderr, /golive:check/, 'prints the command to run');
  });

  test('is wired into package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['golive:check'], 'npm run golive:check exists');
  });

  test('the steps it points at exist in the guide', () => {
    const source = fs.readFileSync(TOOL, 'utf8');
    const refs = source.match(/step (\d+) of docs\/start-here\.md/g) || [];
    assert.ok(refs.length > 0, 'the checker refers to the guide');
    for (const ref of refs) {
      const n = Number(ref.match(/step (\d+)/)[1]);
      assert.match(guide, new RegExp(`## Step ${n}\\.`), `guide has no "## Step ${n}." heading`);
    }
  });

  test('the guide is numbered without gaps, so "do step N" is never a dead end', () => {
    const steps = Array.from(guide.matchAll(/^## Step (\d+)\./gm), (m) => Number(m[1]));
    assert.ok(steps.length >= 15, `expected the full guide, found ${steps.length} steps`);
    steps.forEach((n, i) => assert.strictEqual(n, i + 1, `step numbering jumps at ${n}`));
  });

  test('the guide keeps the two warnings that prevent self-inflicted damage', () => {
    assert.match(guide, /do not disable|don't disable|Leave it ON/i, 'warns against disabling the Render subdomain');
    assert.match(guide, /buy backlinks/i, 'warns against buying links');
  });

  test('the guide tells the reader to verify before moving on', () => {
    assert.match(guide, /Do not move on until this is all PASS/i);
  });

  test('the guide names the variable and its exact format', () => {
    assert.match(guide, /`SITE_URL`/);
    assert.match(guide, /https:\/\/kdocspro\.co\.ke/);
  });
});
