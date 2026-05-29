import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8764);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.join(ROOT_DIR, 'build');
const RUNTIME_DIR = path.join(ROOT_DIR, '.runtime');
const SKILL_FILE = path.join(ROOT_DIR, 'skills', 'mango-finance-receipt.skill');
const SKILL_ROOT = path.join(RUNTIME_DIR, 'mango-finance-receipt');
const SKILL_SCRIPT = path.join(SKILL_ROOT, 'scripts', 'render_deposit.mjs');
const OUTPUT_ROOT = path.join(SKILL_ROOT, 'output');
const CREATE_FILE_ROOT = path.join(ROOT_DIR, 'create_file');

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

    if (req.method === 'GET' && url.pathname.startsWith('/create-file/')) {
      await serveCreateFile(url.pathname, res);
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
  await fsp.mkdir(getMangoTmpDir(), { recursive: true });

  const requestFile = path.join(RUNTIME_DIR, 'requests', `deposit-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  await fsp.writeFile(requestFile, JSON.stringify(payload, null, 2), 'utf8');

  const output = await execNode(SKILL_SCRIPT, [requestFile], SKILL_ROOT);
  const webpPath = output.match(/WEBP:\s*(.+)/)?.[1]?.trim();
  const pdfPath = output.match(/PDF:\s*(.+)/)?.[1]?.trim();

  if (!webpPath || !pdfPath) {
    throw new Error(`Skill rendered but output paths were not found.\n${output}`);
  }

  const archivedWebpPath = await archiveGeneratedWebp(webpPath);

  return {
    imageUrl: toCreateFileUrl(archivedWebpPath),
    pdfUrl: toOutputUrl(pdfPath),
    webpName: path.basename(archivedWebpPath),
    pdfName: path.basename(pdfPath)
  };
}

async function archiveGeneratedWebp(webpPath) {
  const day = formatLocalDate(new Date());
  const dayDir = path.join(CREATE_FILE_ROOT, day);
  await fsp.mkdir(dayDir, { recursive: true });

  const targetPath = await getAvailableFilePath(dayDir, path.basename(webpPath));
  await fsp.copyFile(webpPath, targetPath);
  return targetPath;
}

async function getAvailableFilePath(dir, fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = path.join(dir, fileName);
  let index = 1;

  while (await fileExists(candidate)) {
    candidate = path.join(dir, `${base}_${index}${ext}`);
    index += 1;
  }

  return candidate;
}

async function fileExists(filePath) {
  return Boolean(await fsp.stat(filePath).catch(() => null));
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function ensureSkillExtracted() {
  const skillStat = await fsp.stat(SKILL_FILE).catch(() => null);
  if (!skillStat) throw new Error('Skill file not found: skills/mango-finance-receipt.skill');

  const marker = path.join(SKILL_ROOT, '.source-mtime');
  const markerValue = `${skillStat.mtimeMs}:chrome-runtime-patch-v9`;
  const currentMarker = await fsp.readFile(marker, 'utf8').catch(() => '');

  if (currentMarker === markerValue && fs.existsSync(SKILL_SCRIPT)) return;

  await fsp.rm(SKILL_ROOT, { recursive: true, force: true });
  await fsp.mkdir(RUNTIME_DIR, { recursive: true });
  execFileSync('unzip', ['-oq', SKILL_FILE, '-d', RUNTIME_DIR], { stdio: 'pipe' });
  await patchSkillChromeLookup();
  await fsp.writeFile(marker, markerValue, 'utf8');
}

async function patchSkillChromeLookup() {
  let source = await fsp.readFile(SKILL_SCRIPT, 'utf8');
  const patchedFindChrome = `function findChrome(){
  const envChrome = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envChrome) return envChrome;

  const candidates = process.platform === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
      ]
    : [
        '/snap/bin/chromium',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        'chromium',
        'chromium-browser',
        'google-chrome',
        'google-chrome-stable'
      ];

  for (const candidate of candidates){
    try{
      execFileSync(candidate, ['--version'], { stdio: 'pipe' });
      return candidate;
    }catch{}
  }

  return process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'google-chrome';
}`;

  source = replaceFunction(source, 'findChrome', patchedFindChrome);
  source = replaceFunction(
    source,
    'runChrome',
    `function runChrome(args){
  const chrome = findChrome();
  const serverArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    \`--user-data-dir=\${process.env.MANGO_TMP_DIR || os.tmpdir()}/chrome-profile\`
  ];
  const finalArgs = [...serverArgs.filter(arg => !args.includes(arg)), ...args];
  try{
    execFileSync(chrome, finalArgs, { stdio: 'pipe' });
  }catch(e){
    const stderr = e?.stderr ? String(e.stderr) : '';
    die(\`Chrome 渲染失败。请确认服务器已安装 Chrome/Chromium 且可被访问。当前路径：\${chrome}\\n\${stderr}\`);
  }
}`
  );
  source = replaceFunction(
    source,
    'convertToWebp',
    `function convertToWebp(inputPng, outputWebp){
  const cwebpPath = process.env.CWEBP_PATH || '/usr/bin/cwebp';
  const converters = [
    {
      name: cwebpPath,
      args: ['-quiet', '-q', '82', inputPng, '-o', outputWebp]
    },
    {
      name: '/usr/local/bin/cwebp',
      args: ['-quiet', '-q', '82', inputPng, '-o', outputWebp]
    },
    {
      name: 'cwebp',
      args: ['-quiet', '-q', '82', inputPng, '-o', outputWebp]
    },
    {
      name: 'magick',
      args: [inputPng, '-quality', '82', outputWebp]
    },
    {
      name: 'ffmpeg',
      args: ['-y', '-loglevel', 'error', '-i', inputPng, '-quality', '82', outputWebp]
    }
  ];

  const errors = [];
  for (const converter of converters){
    try{
      execFileSync(converter.name, converter.args, { stdio: 'pipe', env: process.env });
      return;
    }catch(e){
      const stderr = e?.stderr ? String(e.stderr).trim() : '';
      errors.push(\`\${converter.name}: \${stderr || e?.message || 'failed'}\`);
    }
  }

  die(\`WebP 转换失败。已尝试：\\n\${errors.join('\\n')}\`);
}`
  );
  source = source.replace(
    "const tmpHtml = path.join(os.tmpdir(), `${baseName}_${Date.now()}.html`);\n  const tmpPng = path.join(os.tmpdir(), `${baseName}_${Date.now()}.png`);",
    "const tmpBase = `mango_deposit_${Date.now()}_${Math.random().toString(16).slice(2)}`;\n  const tmpDir = process.env.MANGO_TMP_DIR || path.join(outDir, '_tmp');\n  await fs.mkdir(tmpDir, { recursive: true });\n  const tmpHtml = path.join(tmpDir, `${tmpBase}.html`);\n  const tmpPng = path.join(tmpDir, `${tmpBase}.png`);"
  );
  source = source.replace(
    "  convertToWebp(tmpPng, webpPath);",
    "  const pngStat = await fs.stat(tmpPng).catch(() => null);\n  if (!pngStat || !pngStat.isFile() || pngStat.size === 0) {\n    die(`Chrome 截图失败：未生成 PNG 文件：${tmpPng}`);\n  }\n\n  convertToWebp(tmpPng, webpPath);"
  );

  if (!source.includes('--no-sandbox') || !source.includes('CWEBP_PATH') || !source.includes('MANGO_TMP_DIR') || !source.includes('Chrome 截图失败')) {
    throw new Error('Failed to patch skill runtime');
  }

  await fsp.writeFile(SKILL_SCRIPT, source, 'utf8');
}

function replaceFunction(source, functionName, replacement) {
  const start = source.indexOf(`function ${functionName}(`);
  if (start === -1) {
    throw new Error(`Function not found in skill script: ${functionName}`);
  }

  const bodyStart = source.indexOf('{', start);
  if (bodyStart === -1) {
    throw new Error(`Function body not found in skill script: ${functionName}`);
  }

  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return `${source.slice(0, start)}${replacement}${source.slice(i + 1)}`;
    }
  }

  throw new Error(`Function end not found in skill script: ${functionName}`);
}

function execNode(script, args, cwd) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      CHROME_PATH: process.env.CHROME_PATH || findServerChromePath() || '',
      CWEBP_PATH: process.env.CWEBP_PATH || findServerExecutablePath('cwebp') || '',
      MANGO_TMP_DIR: getMangoTmpDir(),
      PATH: normalizePath(process.env.PATH)
    };

    execFile(process.execPath, [script, ...args], { cwd, env }, (error, stdout, stderr) => {
      const output = `${stdout || ''}${stderr || ''}`;
      if (error) {
        reject(new Error(output || error.message));
        return;
      }
      resolve(output);
    });
  });
}

function getMangoTmpDir() {
  if (process.env.MANGO_TMP_DIR) return process.env.MANGO_TMP_DIR;
  if ((process.env.CHROME_PATH || '').includes('/snap/bin/chromium')) {
    const home = process.env.HOME || '/root';
    return path.join(home, 'snap', 'chromium', 'common', 'mango-money-tmp');
  }
  return path.join(CREATE_FILE_ROOT, '_tmp');
}

function findServerExecutablePath(name) {
  const candidates = {
    cwebp: [
      '/usr/bin/cwebp',
      '/usr/local/bin/cwebp',
      '/opt/homebrew/bin/cwebp'
    ]
  }[name] || [];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return '';
}

function normalizePath(currentPath = '') {
  const requiredPaths = [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/snap/bin',
    '/opt/homebrew/bin'
  ];
  const parts = currentPath.split(':').filter(Boolean);

  for (const item of requiredPaths) {
    if (!parts.includes(item)) parts.push(item);
  }

  return parts.join(':');
}

function findServerChromePath() {
  const candidates = [
    '/snap/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return '';
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

async function serveCreateFile(pathname, res) {
  const relative = decodeURIComponent(pathname.replace(/^\/create-file\/?/, ''));
  const filePath = path.normalize(path.join(CREATE_FILE_ROOT, relative));

  if (!filePath.startsWith(CREATE_FILE_ROOT)) {
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

function toCreateFileUrl(filePath) {
  const relative = path.relative(CREATE_FILE_ROOT, filePath);
  return `/create-file/${relative.split(path.sep).map(encodeURIComponent).join('/')}`;
}
