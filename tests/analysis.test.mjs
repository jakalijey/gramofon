// Song analysis: tempo, energy and brightness of an uploaded song pick the room's mood (ballad, normal, lively).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['gramofon-tempo.js', 'gramofon-analysis.js']) vm.runInContext(readFileSync(new URL('../site/engine/' + f, import.meta.url), 'utf8'), ctx);
const A = ctx.window.GramofonAnaliz;

test('mood classes', () => {
  assert.equal(A.turSec({ bpm: 80, yogunluk: 2, parlaklikHz: 1500, enerjiDb: -20 }), 'balad');
  assert.equal(A.turSec({ bpm: 120, yogunluk: 2, parlaklikHz: 2000, enerjiDb: -25 }), 'sakin');
  assert.equal(A.turSec({ bpm: 120, yogunluk: 3, parlaklikHz: 3000, enerjiDb: -8 }), 'sert');
  assert.equal(A.turSec({ bpm: 125, yogunluk: 3.5, parlaklikHz: 2200, enerjiDb: -15 }), 'hareketli');
  assert.equal(A.turSec({ bpm: 100, yogunluk: 3, parlaklikHz: 2200, enerjiDb: -15 }), 'pop');
});

function clicks(bpm, seconds, sr) {   // short decaying clicks on every beat
  const x = new Float32Array(sr * seconds), step = 60 / bpm;
  for (let t = 0.25; t < seconds; t += step) {
    const i0 = Math.round(t * sr);
    for (let k = 0; k < 400 && i0 + k < x.length; k++) x[i0 + k] = 0.8 * Math.sin(k * 0.9) * Math.exp(-k / 80);
  }
  return x;
}

test('a click track at 120 BPM is measured at 120 BPM', () => {
  const o = A.ornekler(clicks(120, 14, 22050), 22050);
  assert.ok(o, 'no result');
  assert.ok(Math.abs(o.bpm - 120) < 4, 'bpm ' + o.bpm);
  for (const k of ['sure', 'bpm', 'enerjiDb', 'parlaklikHz', 'yogunluk']) assert.ok(Number.isFinite(o[k]), k);
  assert.ok(['balad', 'normal', 'hareketli'].includes(o.hava));
});

test('a song shorter than five seconds is not analysed', () => {
  assert.equal(A.ornekler(clicks(120, 4, 22050), 22050), null);
});
