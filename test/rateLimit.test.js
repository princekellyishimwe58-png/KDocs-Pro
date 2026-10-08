'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createSlidingWindow } = require('../middleware/rateLimit');

test('allows up to limit events inside the window, blocks beyond', () => {
  const w = createSlidingWindow({ windowMs: 60000, limit: 3 });
  let now = 1000000;
  assert.equal(w.record(now, 'k').allowed, true);
  assert.equal(w.record(now + 1, 'k').allowed, true);
  const third = w.record(now + 2, 'k');
  assert.equal(third.allowed, true);
  assert.equal(third.used, 3);
  assert.equal(third.remaining, 0);
  const fourth = w.record(now + 3, 'k');
  assert.equal(fourth.allowed, false);
  assert.equal(fourth.used, 3);
});

test('frees slots as events genuinely age out of the trailing window', () => {
  const w = createSlidingWindow({ windowMs: 60000, limit: 2 });
  const now = 1000000;
  assert.equal(w.record(now, 'k').allowed, true);
  assert.equal(w.record(now + 1, 'k').allowed, true);
  assert.equal(w.record(now + 59000, 'k').allowed, false);
  // first event (now) has just fallen out of the window
  assert.equal(w.record(now + 60001, 'k').allowed, true);
  assert.equal(w.record(now + 60002, 'k').allowed, false);
});

test('events straddling a fixed boundary are NOT under-counted (rolling, not fixed)', () => {
  const w = createSlidingWindow({ windowMs: 60000, limit: 3 });
  const now = 1000000;
  // 3 hits just before a would-be fixed boundary, 1 just after.
  w.record(now + 59997, 'k');
  w.record(now + 59998, 'k');
  w.record(now + 59999, 'k');
  // A fixed window would have reset here; sliding must still block.
  assert.equal(w.record(now + 60001, 'k').allowed, false);
});

test('keys are isolated', () => {
  const w = createSlidingWindow({ windowMs: 60000, limit: 1 });
  assert.equal(w.record(1000, 'a').allowed, true);
  assert.equal(w.record(1001, 'b').allowed, true);
  assert.equal(w.record(1002, 'a').allowed, false);
  assert.equal(w.record(1003, 'b').allowed, false);
});

test('resetAfterSeconds reflects the oldest surviving event', () => {
  const w = createSlidingWindow({ windowMs: 60000, limit: 1 });
  const now = 1000000;
  const r1 = w.record(now, 'k');
  assert.equal(r1.allowed, true);
  const r2 = w.record(now + 1000, 'k');
  assert.equal(r2.allowed, false);
  assert.equal(r2.resetAfterSeconds, 59);
});

test('sweep drops keys whose events have fully aged out', () => {
  const w = createSlidingWindow({ windowMs: 1000, limit: 2 });
  w.record(1000, 'gone');
  w.record(1001, 'gone');
  w.record(5000000, 'stays');
  w.sweep();
  assert.equal(w.size(), 1);
  assert.equal(w.record(5000001, 'stays').allowed, false);
});

test('prunes only the events that fell out, keeps the rest', () => {
  const w = createSlidingWindow({ windowMs: 60000, limit: 3 });
  const now = 1000000;
  w.record(now, 'k');
  w.record(now + 30000, 'k');
  w.record(now + 59000, 'k');
  // now has aged out; the other two still block (limit 3, 2 used -> allowed)
  const r = w.record(now + 60001, 'k');
  assert.equal(r.allowed, true);
  assert.equal(r.used, 3);
  assert.equal(w.record(now + 60002, 'k').allowed, false);
});
