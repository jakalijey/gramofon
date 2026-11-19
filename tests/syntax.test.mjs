// Every hand-written script parses: the site's classic scripts, the server and the payment layer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const BUILT = new Set(['site/payment/payment.js', 'site/engine/gramofon-core.js']);

function scripts(dir) {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = dir + '/' + name;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...scripts(rel));
    else if (/\.(m?js)$/.test(name) && !BUILT.has(rel)) out.push(rel);
  }
  return out;
}

const files = [...scripts('site'), ...scripts('server'), ...scripts('payment/src')];

test('there are scripts to check', () => {
  assert.ok(files.length >= 12, files.join(', '));
});

for (const file of files) {
  test('parses: ' + file, () => {
    const r = spawnSync(process.execPath, ['--check', join(ROOT, file)], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  });
}
