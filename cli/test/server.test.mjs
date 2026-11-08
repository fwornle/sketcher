import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createServer, listen, HEALTH_PATH } from '../lib/server.mjs';

describe('static server', () => {
  let tmp, dist, server, port;

  before(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sketcher-test-'));
    dist = path.join(tmp, 'dist');
    fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Sketcher</title>');
    fs.writeFileSync(path.join(dist, 'assets', 'index-abc.js'), 'console.info(1)');
    fs.writeFileSync(path.join(dist, 'assets', 'index-abc.css'), 'body{}');
    fs.writeFileSync(path.join(dist, 'favicon.svg'), '<svg/>');
    fs.writeFileSync(path.join(tmp, 'secret.txt'), 'outside dist');
    server = createServer({ distDir: dist, version: '9.8.7' });
    port = await listen(server, 0);
  });

  after(() => {
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // fetch() normalises "..", so traversal checks use a raw request
  const raw = rawPath => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: rawPath }, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });

  it('serves index.html at / without caching', async () => {
    const res = await raw('/');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /^text\/html/);
    assert.equal(res.headers['cache-control'], 'no-cache');
    assert.match(res.body, /<title>Sketcher<\/title>/);
  });

  it('serves hashed assets with their MIME type and a long cache', async () => {
    const js = await raw('/assets/index-abc.js');
    assert.equal(js.status, 200);
    assert.match(js.headers['content-type'], /^text\/javascript/);
    assert.match(js.headers['cache-control'], /immutable/);
    const css = await raw('/assets/index-abc.css');
    assert.match(css.headers['content-type'], /^text\/css/);
    const svg = await raw('/favicon.svg');
    assert.equal(svg.headers['content-type'], 'image/svg+xml');
  });

  it('answers client-side routes with index.html', async () => {
    const res = await raw('/about');
    assert.equal(res.status, 200);
    assert.match(res.body, /<title>Sketcher<\/title>/);
  });

  it('returns 404 for a missing file that has an extension', async () => {
    const res = await raw('/assets/missing.js');
    assert.equal(res.status, 404);
  });

  it('refuses paths outside the dist directory', async () => {
    for (const p of ['/../secret.txt', '/%2e%2e/secret.txt', '/assets/..%2f..%2fsecret.txt']) {
      const res = await raw(p);
      assert.notEqual(res.body, 'outside dist', p);
      assert.ok([403, 404].includes(res.status), `${p} -> ${res.status}`);
    }
  });

  it('reports its version on the health endpoint', async () => {
    const res = await raw(HEALTH_PATH);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.body), { app: 'sketcher', version: '9.8.7' });
  });

  it('rejects methods other than GET and HEAD', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST' });
    assert.equal(res.status, 405);
  });
});
