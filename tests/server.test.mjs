// The server starts from its local records (no storage needed) and keeps the Radio rules: members only, one entry
// per song, five songs a day per member. The ticket secret is made up for this run.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';

const SECRET = crypto.randomBytes(24).toString('hex');
const PORT = 18000 + Math.floor(Math.random() * 1000);
const SERVER = new URL('../server/server.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
let dir, srv;

const ticket = (user, seconds = 3600, secret = SECRET) => {
  const body = Buffer.from(JSON.stringify({ u: user, b: Math.floor(Date.now() / 1000) + seconds })).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', secret).update(body).digest('base64url');
};
const call = async (path, options = {}) => {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, options);
  return { status: r.status, body: await r.json().catch(() => null) };
};
const send = (seed, t) => call('/radyo/gonder', { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { 'x-bilet': t } : {}) }, body: JSON.stringify({ tohum: seed }) });

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'gramofon-test-'));
  const records = { 'odemeler.json': { txid: {}, teklif: {} }, 'bekleyenler.json': { liste: [] }, 'parmakizi.json': { kayitlar: {} }, 'radyo.json': { liste: [] },
    'dinlemeler.json': { olay: [] }, 'sanatcilar.json': { aylar: {}, odenen: [] }, 'raporlar.json': { liste: [] },
    'katalog-kopya.json': { sarkilar: [{ id: 's1', ad: 'Song One', sanatci: 'Artist', dosya: 's1.flac' }] } };
  for (const [f, v] of Object.entries(records)) writeFileSync(join(dir, f), JSON.stringify(v));
  srv = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(PORT), VERI_KLASORU: dir, DEPO_UC: 'http://127.0.0.1:9', DEPO_KOVA: 'test', DEPO_ERISIM: 'test', DEPO_GIZLI: 'test', GRAMOFON_BILET_SIRRI: SECRET },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error('server did not start')), 15000);
    srv.stdout.on('data', d => { if (String(d).includes(String(PORT))) { clearTimeout(t); ok(); } });
    srv.on('exit', c => { clearTimeout(t); fail(new Error('server exited with ' + c)); });
  });
});

after(() => {
  srv?.kill();
  rmSync(dir, { recursive: true, force: true });
});

test('public lists answer', async () => {
  const radio = await call('/radyo');
  assert.equal(radio.status, 200);
  assert.deepEqual(radio.body.liste, []);
  assert.equal(radio.body.gunluk, 5);
  assert.equal((await call('/bekleyenler')).status, 200);
  const pay = await call('/odeme/ayar');
  assert.equal(pay.status, 200);
  assert.equal(pay.body.aktif, false);
  assert.equal((await call('/no-such-path')).status, 404);
});

test('sending a radio song needs a valid membership ticket', async () => {
  assert.equal((await send(4242)).status, 401);
  assert.equal((await send(4242, ticket('a', -60))).status, 401);
  assert.equal((await send(4242, ticket('a', 3600, 'wrong-secret'))).status, 401);
});

test('a member sends a song once; it joins everyone\'s list', async () => {
  const r = await send(4242, ticket('a'));
  assert.equal(r.status, 200);
  assert.equal(r.body.sarki.tohum, 4242);
  const again = await send(4242, ticket('b'));
  assert.equal(again.status, 200);
  assert.equal(again.body.zaten, true);
  assert.deepEqual((await call('/radyo')).body.liste.map(x => x.tohum), [4242]);
});

test('seeds must be whole numbers in range', async () => {
  for (const seed of [0, 10000000, 1.5, 'x']) assert.equal((await send(seed, ticket('c'))).status, 400, String(seed));
});

test('five songs a day per member', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await send(7000 + i, ticket('d'))).status, 200);
  const sixth = await send(7005, ticket('d'));
  assert.equal(sixth.status, 429);
  assert.equal(sixth.body.sinir, 5);
  assert.equal((await send(7005, ticket('e'))).status, 200);
});

const play = (id, t) => call('/dinleme', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, bilet: t }) });
const MEMBER = 'bitcoincash:q' + 'z'.repeat(41);

test('a play needs a valid ticket and a song on the gramophone', async () => {
  assert.equal((await play('s1', 'x.y')).status, 401);
  assert.equal((await play('s1', ticket(MEMBER, -60))).status, 401);
  assert.equal((await play('no-such-song', ticket(MEMBER))).status, 404);
});

test('a play counts once; another one right after looks automated', async () => {
  const first = await play('s1', ticket(MEMBER));
  assert.equal(first.status, 200);
  assert.equal(first.body.sayildi, true);
  const again = await play('s1', ticket(MEMBER));
  assert.equal(again.body.sayildi, false);
  assert.equal(again.body.neden, 'hizli');
  const trial = await play('s1', ticket('deneme'));
  assert.equal(trial.body.sayildi, false);
  assert.equal(trial.body.neden, 'deneme');
});
