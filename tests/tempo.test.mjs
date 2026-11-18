// Tempo: the gramophone finds the beat in a song's onset envelope (50 frames a second) so the girl dances on it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../site/cizim/gramofon-tempo.js', import.meta.url), 'utf8'), ctx);
const { coz } = ctx.window.GramofonTempo;

function envelope(bpm, seconds = 10, hz = 50) {
  const e = new Float32Array(seconds * hz), step = hz * 60 / bpm;
  for (let i = 0; i < e.length; i++) e[i] = 0.02 * ((i * 7919) % 13) / 13;   // a little steady noise
  for (let t = 0; t < e.length; t += step) e[Math.round(t)] = 1;
  return e;
}

for (const bpm of [80, 96, 120]) {
  test(`finds ${bpm} BPM`, () => {
    const r = coz(envelope(bpm), 50);
    assert.ok(r, 'no tempo found');
    assert.ok(Math.abs(60 / r.periyot - bpm) < bpm * 0.03, `found ${(60 / r.periyot).toFixed(1)} BPM`);
    assert.ok(r.guven > 0);
  });
}

test('fast songs may be counted at half tempo (the dance prefers 60-185 BPM, centred near 105)', () => {
  const found = 60 / coz(envelope(140), 50).periyot;
  assert.ok([140, 70].some(b => Math.abs(found - b) < b * 0.03), `found ${found.toFixed(1)} BPM`);
});

test('silence has no tempo', () => {
  assert.equal(coz(new Float32Array(500), 50), null);
});

test('less than three seconds is too short', () => {
  assert.equal(coz(envelope(120, 2), 50), null);
});
