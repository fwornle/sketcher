// Static server for the built web app: localhost only, SPA fallback, health endpoint.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

export const HEALTH_PATH = '/__sketcher/health';

/**
 * Create (not start) the server.
 * @param {{distDir: string, version: string}} options
 */
export function createServer({ distDir, version }) {
  const root = path.resolve(distDir);
  const indexFile = path.join(root, 'index.html');

  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }

    if (pathname === HEALTH_PATH) {
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.json'], 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ app: 'sketcher', version }));
      return;
    }

    const filePath = path.join(root, pathname);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    if (isFile(filePath)) {
      send(req, res, filePath, pathname.startsWith('/assets/'));
    } else if (path.extname(pathname) === '') {
      // Client-side routes (/about, ...) are answered by the app itself
      send(req, res, indexFile, false);
    } else {
      res.writeHead(404, { 'Content-Type': MIME_TYPES['.txt'] }).end('Not found');
    }
  });
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function send(req, res, filePath, immutable) {
  const type = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  // Hashed bundles never change; index.html must always be re-read to pick up a new build
  const cache = immutable ? 'public, max-age=31536000, immutable' : 'no-cache';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

/** Start listening on 127.0.0.1; resolves once bound, rejects on e.g. EADDRINUSE. */
export function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address().port);
    });
  });
}
