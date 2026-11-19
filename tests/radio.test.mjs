// Radio-born artists: a song sent from the Radio gets a title, an artist and a drawn cover from its seed,
// the same in every browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
const start = src.indexOf('var KAPAK_RENK'), end = src.indexOf('function radyoParca');
assert.ok(start > 0 && end > start, 'radio identity code not found in site/app.js');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src.slice(start, end) + '\nthis.identity = radyoKimlik; this.brand = KAPAK_RENK; this.bad = KOTU;', ctx);

const BRAND_AND_INK = ['#D97706', '#0D9488', '#16A34A', '#7C3AED', '#1A0D2E', '#F5EFE1'];

test('the same seed gives the same song everywhere', () => {
  for (const seed of [13, 4242, 5592639, 9999999]) assert.deepEqual(ctx.identity(seed), ctx.identity(seed));
});

test('seeds that were already sent keep their names', () => {
  assert.equal(ctx.identity(4242).ad, 'Sunday Satellite');
  assert.equal(ctx.identity(4242).sanatci, 'Zetari Lumi');
  assert.equal(ctx.identity(5592639).ad, 'Gentle Garden');
  assert.equal(ctx.identity(5592639).sanatci, 'Nika Kode');
});

test('titles are two words, artists one or two', () => {
  for (let seed = 13; seed < 2013; seed++) {
    const { ad, sanatci } = ctx.identity(seed);
    assert.match(ad, /^[A-Z][a-z]+ [A-Z][a-z]+$/);
    assert.match(sanatci, /^[A-Z][a-z]+( [A-Z][a-z]+)?$/);
  }
});

test('artist names pass the word filter', () => {
  const seen = new Set();
  for (let seed = 13; seed < 20013; seed++) {
    const { sanatci } = ctx.identity(seed);
    seen.add(sanatci);
    for (const word of sanatci.toLowerCase().split(' ')) {
      assert.ok(!ctx.bad.test(word), `${seed}: ${sanatci}`);
      assert.ok(!/(..)\1/.test(word), `${seed}: ${sanatci}`);
    }
  }
  assert.ok(seen.size > 15000, 'too few different artists: ' + seen.size);
});

test('covers are small drawings in the brand colors', () => {
  for (const seed of [13, 777, 4242, 99999, 5592639]) {
    const k = ctx.identity(seed);
    assert.ok(k.kapak.startsWith('data:image/svg+xml,'));
    const svg = decodeURIComponent(k.kapak.slice('data:image/svg+xml,'.length));
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100">.*<\/svg>$/);
    assert.ok(svg.length < 4000, 'cover too large');
    for (const c of svg.match(/#[0-9a-f]{6}/gi)) assert.ok(BRAND_AND_INK.includes(c.toUpperCase()), c);
    assert.ok(ctx.brand.includes(k.renk));
  }
});
