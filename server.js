import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8764);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const RUNTIME_DIR = path.join(ROOT_DIR, '.runtime');
const SKILL_FILE = path.join(ROOT_DIR, 'skills', 'mango-finance-receipt.skill');
const SKILL_ROOT = path.join(RUNTIME_DIR, 'mango-finance-receipt');
const SKILL_SCRIPT = path.join(SKILL_ROOT, 'scripts', 'render_deposit.mjs');
const OUTPUT_ROOT = path.join(SKILL_ROOT, 'output');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'POST' && (url.pathname === '/api/preview' || url.pathname === '/api/generate')) {
      const payload = await readJsonBody(req);
      const result = await renderReceipt(payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/skill-output/')) {
      await serveSkillOutput(url.pathname, res);
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      await serveStatic(url.pathname, res, req.method === 'HEAD');
      return;
    }

    sendJson(res, { error: 'Method not allowed' }, 405);
  } catch (error) {
    sendJson(res, { error: error?.message || String(error) }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mango Money is running at http://localhost:${PORT}`);
});

async function renderReceipt(payload) {
  await ensureSkillExtracted();
  await fsp.mkdir(path.join(RUNTIME_DIR, 'requests'), { recursive: true });

  const requestFile = path.join(RUNTIME_DIR, 'requests', `deposit-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  await fsp.writeFile(requestFile, JSON.stringify(payload, null, 2), 'utf8');

  const output = await execNode(SKILL_SCRIPT, [requestFile], SKILL_ROOT);
  const webpPath = output.match(/WEBP:\s*(.+)/)?.[1]?.trim();
  const pdfPath = output.match(/PDF:\s*(.+)/)?.[1]?.trim();

  if (!webpPath || !pdfPath) {
    throw new Error(`Skill rendered but output paths were not found.\n${output}`);
  }

  return {
    imageUrl: toOutputUrl(webpPath),
    pdfUrl: toOutputUrl(pdfPath),
    webpName: path.basename(webpPath),
    pdfName: path.basename(pdfPath)
  };
}

async function ensureSkillExtracted() {
  const skillStat = await fsp.stat(SKILL_FILE).catch(() => null);
  if (!skillStat) throw new Error('Skill file not found: skills/mango-finance-receipt.skill');

  const marker = path.join(SKILL_ROOT, '.source-mtime');
  const markerValue = String(skillStat.mtimeMs);
  const currentMarker = await fsp.readFile(marker, 'utf8').catch(() => '');

  if (currentMarker === markerValue && fs.existsSync(SKILL_SCRIPT)) return;

  await fsp.rm(SKILL_ROOT, { recursive: true, force: true });
  await fsp.mkdir(RUNTIME_DIR, { recursive: true });
  execFileSync('unzip', ['-oq', SKILL_FILE, '-d', RUNTIME_DIR], { stdio: 'pipe' });
  await fsp.writeFile(marker, markerValue, 'utf8');
}

function execNode(script, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [script, ...args], { cwd }, (error, stdout, stderr) => {
      const output = `${stdout || ''}${stderr || ''}`;
      if (error) {
        reject(new Error(output || error.message));
        return;
      }
      resolve(output);
    });
  });
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error('Request body is too large');
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Invalid JSON body');
  }
}

async function serveStatic(pathname, res, headOnly = false) {
  const decodedPathname = decodeURIComponent(pathname);
  const cleanPath = decodedPathname === '/' ? '/index.html' : decodedPathname;
  const filePath = path.normalize(path.join(DIST_DIR, cleanPath));

  if (!filePath.startsWith(DIST_DIR)) {
    sendText(res, 'Forbidden', 403);
    return;
  }

  const stat = await fsp.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) {
    await sendFile(path.join(DIST_DIR, 'index.html'), res, headOnly);
    return;
  }

  await sendFile(filePath, res, headOnly);
}

async function serveSkillOutput(pathname, res) {
  const relative = decodeURIComponent(pathname.replace(/^\/skill-output\/?/, ''));
  const filePath = path.normalize(path.join(OUTPUT_ROOT, relative));

  if (!filePath.startsWith(OUTPUT_ROOT)) {
    sendText(res, 'Forbidden', 403);
    return;
  }

  await sendFile(filePath, res);
}

async function sendFile(filePath, res, headOnly = false) {
  const stat = await fsp.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) {
    sendText(res, 'Not found', 404);
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
    'Content-Length': stat.size
  });

  if (headOnly) {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, text, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text)
  });
  res.end(text);
}

function toOutputUrl(filePath) {
  const relative = path.relative(OUTPUT_ROOT, filePath);
  return `/skill-output/${relative.split(path.sep).map(encodeURIComponent).join('/')}`;
}
