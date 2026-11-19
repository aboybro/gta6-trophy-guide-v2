// Local-only static server for the guide, for trying it in a browser while
// building: `node serve.ts` serves app/ at http://localhost:8080 (or
// `--port <n>`). It serves files from app/ and nothing else, and sets the
// content type a browser needs for each suffix. Not part of the entry's app.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function pickPort() {
  const args = process.argv.slice(2);
  const at = args.indexOf('--port');
  const wanted = at === -1 ? 8080 : Number(args[at + 1]);
  return Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;
}

// Resolve a request path to a file under app/, refusing anything that
// escapes it (a `..` in the URL must never read outside the guide).
function resolveAppFile(pathname) {
  const file = resolve(join(appRoot, normalize(pathname)));
  if (file !== appRoot && !file.startsWith(appRoot + sep)) return null;
  return file;
}

function serveFile(file, response) {
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}

const port = pickPort();
createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolveAppFile(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }
  serveFile(file, response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Leonida Ledger is on http://localhost:${port}`);
});
