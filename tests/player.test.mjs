// Player repeat modes (site/player.js): the player runs in a small fake browser (an Audio stand-in that fires "ended"),
// so the test checks which song comes next when a song ends on its own, for each mode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const kod = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site', 'player.js'), 'utf8');

function oynaticiKur(sarkiSayisi) {
  const sesler = [];
  class SahteSes {
    constructor() { this.dinleyici = {}; this.paused = true; this.ended = false; this.currentTime = 0; this.duration = 100; this._src = ''; sesler.push(this); }
    addEventListener(ad, f) { (this.dinleyici[ad] = this.dinleyici[ad] || []).push(f); }
    getAttribute(ad) { return ad === 'src' ? this._src : null; }
    set src(v) { this._src = v; this.ended = false; this.currentTime = 0; }
    get src() { return this._src; }
    play() { this.paused = false; (this.dinleyici.playing || []).forEach(f => f()); return Promise.resolve(); }
    pause() { this.paused = true; }
    bitir() { this.paused = true; this.ended = true; (this.dinleyici.pause || []).forEach(f => f()); (this.dinleyici.ended || []).forEach(f => f()); }
  }
  const window = { performance: { now: () => 0 } };
  const ortam = { window, Audio: SahteSes, navigator: {}, performance: window.performance, setInterval, clearInterval, setTimeout, Math, Number, isFinite };
  vm.createContext(ortam);
  vm.runInContext(kod, ortam);
  const O = window.GramofonOynatici;
  O.kur(Array.from({ length: sarkiSayisi }, (_, i) => ({ id: 's' + i, ad: 'Song ' + i, tur: 'dosya', dosya: 'https://example.test/' + i })));
  return { O, ses: () => sesler[0] };
}

test('repeat all (default): after the last song the playlist starts again', () => {
  const { O, ses } = oynaticiKur(3);
  assert.equal(O.tekrar(), 'hepsi');
  O.cal(0); ses().bitir(); ses().bitir();
  assert.equal(O.durum().dizin, 2);
  ses().bitir();
  assert.equal(O.durum().dizin, 0);
  assert.equal(O.durum().caliyor, true);
});

test('repeat one: the same song plays again when it ends', () => {
  const { O, ses } = oynaticiKur(3);
  O.tekrar('tek');
  O.cal(1); ses().bitir();
  assert.equal(O.durum().dizin, 1);
  assert.equal(O.durum().caliyor, true);
  O.sonraki();   // the next button still moves on
  assert.equal(O.durum().dizin, 2);
});

test('repeat off: the music stops after the last song, and play starts from the first', () => {
  const { O, ses } = oynaticiKur(3);
  O.tekrar('kapali');
  O.cal(1); ses().bitir();
  assert.equal(O.durum().dizin, 2);
  ses().bitir();
  assert.equal(O.durum().caliyor, false);
  O.devam();
  assert.equal(O.durum().dizin, 0);
  assert.equal(O.durum().caliyor, true);
});

test('repeat accepts only the three modes', () => {
  const { O } = oynaticiKur(2);
  assert.equal(O.tekrar('yanlis'), 'hepsi');
  assert.equal(O.tekrar('kapali'), 'kapali');
  assert.equal(O.durum().tekrar, 'kapali');
});
