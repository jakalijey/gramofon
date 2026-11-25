// The member's only sign of time (site/membership.js): the "Gramofon" title. On the day you pay it is gold leaf,
// it loses a little colour every day (bronze in the middle of the month) and on day 30 it looks like dark iron.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const kod = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site', 'membership.js'), 'utf8');
const ortam = { window: {}, location: { hostname: 'gramofon.heylogram.com' } };
vm.createContext(ortam);
vm.runInContext(kod, ortam);
const U = ortam.window.GramofonUyelik;
const GUN = 86400000, SIMDI = Date.UTC(2026, 10, 25, 12);
const kalan = gun => U.yaldiz(new Date(SIMDI + gun * GUN), SIMDI);
const parlaklik = renk => { const [r, g, b] = renk.match(/\d+/g).map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

test('the day you pay, the title is gold leaf and glows', () => {
  const y = kalan(30);
  assert.equal(y.gun, 1);
  assert.equal(y.stil['--y2'], 'rgb(215,162,43)');
  assert.equal(y.stil['--y-isilti'], 'rgba(255,196,70,0.45)');
  assert.equal(y.stil['--y-pas'], '0.00');
});

test('on the last day it looks like dark iron, no glow', () => {
  const y = kalan(0.4);
  assert.equal(y.gun, 30);
  assert.equal(y.stil['--y2'], 'rgb(94,82,72)');
  assert.equal(y.stil['--y-isilti'], 'rgba(255,196,70,0.00)');
  assert.equal(y.stil['--y-pas'], '1.00');
});

test('every day of the month has its own step, and none is brighter than the day before', () => {
  let once = Infinity;
  for (let gun = 1; gun <= 30; gun++) {
    const y = kalan(30 - gun + 0.5);
    assert.equal(y.gun, gun);
    const p = parlaklik(y.stil['--y2']);
    assert.ok(p <= once, `day ${gun} is brighter than day ${gun - 1}`);
    once = p;
  }
});

test('the middle of the month is bronze', () => {
  assert.equal(kalan(30 - 17 + 0.5).stil['--y2'], 'rgb(156,102,50)');
});

test('outside the month the title stays at the ends, and without a membership there is no gilding', () => {
  assert.equal(kalan(45).gun, 1);
  assert.equal(kalan(-3).gun, 30);
  assert.equal(U.yaldiz(null), null);
});
