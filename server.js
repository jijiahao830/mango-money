import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8764);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.join(ROOT_DIR, 'build');
const RUNTIME_DIR = path.join(ROOT_DIR, '.runtime');
const SKILLS = {
  deposit: {
    file: path.join(ROOT_DIR, 'skills', 'mango-finance-deposit-receipt.skill'),
    root: path.join(RUNTIME_DIR, 'mango-finance-deposit-receipt'),
    scriptName: 'render_deposit.mjs',
    patchRuntime: true
  },
  balance: {
    file: path.join(ROOT_DIR, 'skills', 'mango-finance-balance-receipt.skill'),
    root: path.join(RUNTIME_DIR, 'mango-finance-balance-receipt'),
    scriptName: 'render_balance.mjs',
    patchRuntime: false
  },
  statement: {
    file: path.join(ROOT_DIR, 'skills', 'mango-finance-statement-receipt.skill'),
    root: path.join(RUNTIME_DIR, 'mango-finance-statement-receipt'),
    scriptName: 'render_statement.mjs',
    patchRuntime: false
  }
};
const OUTPUT_ROOT = RUNTIME_DIR;
const CREATE_FILE_ROOT = path.join(ROOT_DIR, 'create_file');
const RECEIPT_DIR_NAMES = {
  deposit: '定金单',
  balance: '尾款单',
  statement: '对帐单'
};

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
      const result = await renderReceipt(payload, 'deposit');
      await sendGeneratedWebp(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/generate-balance') {
      const payload = await readJsonBody(req);
      const result = await renderReceipt(payload, 'balance');
      await sendGeneratedWebp(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/generate-statement') {
      const payload = await readJsonBody(req);
      const result = await renderReceipt(payload, 'statement');
      await sendGeneratedWebp(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const payload = await readJsonBody(req);
      const result = await loginUser(payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/users') {
      const result = await listUsers();
      sendJson(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/users') {
      const payload = await readJsonBody(req);
      const result = await createUser(payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'PATCH' && /^\/api\/users\/\d+\/password$/.test(url.pathname)) {
      const id = Number(url.pathname.match(/^\/api\/users\/(\d+)\/password$/)?.[1]);
      const payload = await readJsonBody(req);
      const result = await updateUserPassword(id, payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'DELETE' && /^\/api\/users\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.match(/^\/api\/users\/(\d+)$/)?.[1]);
      const result = await deleteUser(id);
      sendJson(res, result);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/push-config') {
      const result = await getPushConfig();
      sendJson(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/push-config') {
      const payload = await readJsonBody(req);
      const result = await savePushConfig(payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/push-wecom') {
      const payload = await readJsonBody(req);
      const result = await pushGeneratedImageToWecom(payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/djd-record') {
      const payload = await readJsonBody(req);
      const result = await saveDjdRecord(payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/wkd-record') {
      const payload = await readJsonBody(req);
      const result = await saveWkdRecord(payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/zd-record') {
      const payload = await readJsonBody(req);
      const result = await saveZdRecord(payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/history-images') {
      const result = await listHistoryImages();
      sendJson(res, result);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/skill-output/')) {
      await serveSkillOutput(url.pathname, res);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/create-file/')) {
      await serveCreateFile(url.pathname.replace(/^\/api/, ''), res);
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
    sendJson(res, { error: error?.message || String(error) }, error?.statusCode || 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mango Money is running at http://localhost:${PORT}`);
});

async function renderReceipt(payload, type = 'deposit') {
  const skill = getSkillConfig(type);
  await ensureSkillExtracted(type);
  await fsp.mkdir(path.join(RUNTIME_DIR, 'requests'), { recursive: true });
  await fsp.mkdir(getMangoTmpDir(), { recursive: true });

  const requestFile = path.join(RUNTIME_DIR, 'requests', `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  await fsp.writeFile(requestFile, JSON.stringify(payload, null, 2), 'utf8');

  const output = await execNode(skill.script, [requestFile], skill.root);
  const webpPath = output.match(/WEBP:\s*(.+)/)?.[1]?.trim();
  const pdfPath = output.match(/PDF:\s*(.+)/)?.[1]?.trim();

  if (!webpPath) {
    throw new Error(`Skill rendered but output paths were not found.\n${output}`);
  }

  const archivedWebpPath = await archiveGeneratedWebp(webpPath, type);
  if (pdfPath) await fsp.rm(pdfPath, { force: true });

  return {
    imagePath: archivedWebpPath,
    webpName: path.basename(archivedWebpPath),
    fileDate: path.relative(CREATE_FILE_ROOT, path.dirname(archivedWebpPath)).split(path.sep).join('/')
  };
}

async function saveDjdRecord(payload) {
  validateDjdPayload(payload);

  const mysqlConfig = await readMysqlConfig();
  const conn = await mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port || 3306,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database
  });

  try {
    const [result] = await conn.execute(
      `INSERT INTO cw_djd (
        create_user,
        customer_name,
        customer_id,
        car_model,
        order_id,
        rental_time,
        pickup_dropoff_method,
        deposit_amount,
        balance_amount,
        hold_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.createUser,
        payload.customerName,
        payload.customerId,
        payload.carModel,
        payload.orderId,
        payload.rentalTime,
        payload.pickupDropoffMethod,
        payload.depositAmount,
        payload.balanceAmount,
        normalizeMysqlDateTime(payload.holdUntil)
      ]
    );
    return { ok: true, id: result.insertId };
  } finally {
    await conn.end();
  }
}

async function saveWkdRecord(payload) {
  validateWkdPayload(payload);

  const mysqlConfig = await readMysqlConfig();
  const conn = await mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port || 3306,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database
  });

  try {
    const [result] = await conn.execute(
      `INSERT INTO cw_wkd (
        create_user,
        customer_name,
        customer_id,
        car_model,
        order_id,
        rental_time,
        pickup_dropoff_method,
        balance_amount,
        unit_price,
        payment_method,
        order_remark_line1,
        order_remark_line2,
        received_at,
        operator
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.createUser,
        payload.customerName,
        payload.customerId,
        payload.carModel,
        payload.orderId,
        payload.rentalTime,
        payload.pickupDropoffMethod,
        payload.balanceAmount,
        payload.unitPrice,
        payload.paymentMethod,
        payload.orderRemarkLine1 || '',
        payload.orderRemarkLine2 || '',
        normalizeMysqlDateTime(payload.receivedAt),
        payload.operator
      ]
    );
    return { ok: true, id: result.insertId };
  } finally {
    await conn.end();
  }
}

async function saveZdRecord(payload) {
  validateZdPayload(payload);

  const conn = await createMysqlConnection();
  try {
    await ensureStatementTable(conn);
    const fields = [
      'create_user',
      'customer_name',
      'order_id',
      'received_amount',
      'actual_consumption',
      'refundable_deposit',
      'car_rental_desc',
      'car_rental_amount',
      'overtime_desc',
      'overtime_amount',
      'fuel_desc',
      'fuel_amount',
      'other_desc',
      'other_amount',
      'consumption_note1',
      'consumption_note1_amount',
      'consumption_note2',
      'consumption_note2_amount',
      'consumption_note3',
      'consumption_note3_amount',
      'consumption_note4',
      'consumption_note4_amount',
      'consumption_note5',
      'consumption_note5_amount',
      'consumption_note6',
      'consumption_note6_amount',
      'car_model',
      'plate_number',
      'start_at',
      'return_at',
      'use_days',
      'start_mileage',
      'return_mileage',
      'actual_mileage',
      'start_fuel',
      'return_fuel',
      'refuel_amount',
      'check_scratch',
      'check_mark',
      'check_accident',
      'check_over_mileage',
      'check_overtime',
      'abnormal_note1',
      'abnormal_note2',
      'abnormal_note3',
      'abnormal_note4',
      'abnormal_note5',
      'abnormal_note6',
      'abnormal_note7',
      'abnormal_note8',
      'abnormal_note9',
      'vehicle_deposit',
      'violation_deposit'
    ];
    const values = [
      payload.createUser,
      payload.customerName,
      payload.orderId,
      payload.receivedAmount,
      payload.actualConsumption,
      payload.refundableDeposit,
      payload.carRentalDesc,
      payload.carRentalAmount,
      payload.overtimeDesc,
      payload.overtimeAmount,
      payload.fuelDesc,
      payload.fuelAmount,
      payload.otherDesc,
      payload.otherAmount,
      payload.consumptionNote1,
      payload.consumptionNote1Amount,
      payload.consumptionNote2,
      payload.consumptionNote2Amount,
      payload.consumptionNote3,
      payload.consumptionNote3Amount,
      payload.consumptionNote4,
      payload.consumptionNote4Amount,
      payload.consumptionNote5,
      payload.consumptionNote5Amount,
      payload.consumptionNote6,
      payload.consumptionNote6Amount,
      payload.carModel,
      payload.plateNumber,
      payload.startAt,
      payload.returnAt,
      payload.useDays,
      payload.startMileage,
      payload.returnMileage,
      payload.actualMileage,
      payload.startFuel,
      payload.returnFuel,
      payload.refuelAmount,
      payload.checkScratch,
      payload.checkMark,
      payload.checkAccident,
      payload.checkOverMileage,
      payload.checkOvertime,
      payload.abnormalNote1,
      payload.abnormalNote2,
      payload.abnormalNote3,
      payload.abnormalNote4,
      payload.abnormalNote5,
      payload.abnormalNote6,
      payload.abnormalNote7,
      payload.abnormalNote8,
      payload.abnormalNote9,
      payload.vehicleDeposit,
      payload.violationDeposit
    ].map(value => value === undefined || value === null ? '' : String(value));

    const [result] = await conn.execute(
      `INSERT INTO cw_dzd (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
      values
    );
    return { ok: true, id: result.insertId };
  } finally {
    await conn.end();
  }
}

async function listHistoryImages() {
  const groups = await Promise.all(
    Object.entries(RECEIPT_DIR_NAMES).map(async ([type, label]) => {
      const typeDir = path.join(CREATE_FILE_ROOT, label);
      const dates = await fsp.readdir(typeDir, { withFileTypes: true }).catch(() => []);
      const items = [];

      for (const dateEntry of dates) {
        if (!dateEntry.isDirectory()) continue;
        const date = dateEntry.name;
        const dateDir = path.join(typeDir, date);
        const files = await fsp.readdir(dateDir, { withFileTypes: true }).catch(() => []);

        for (const fileEntry of files) {
          if (!fileEntry.isFile() || path.extname(fileEntry.name).toLowerCase() !== '.webp') continue;
          const filePath = path.join(dateDir, fileEntry.name);
          const stat = await fsp.stat(filePath).catch(() => null);
          if (!stat?.isFile()) continue;

          const relativeParts = [label, date, fileEntry.name].map(encodeURIComponent);
          items.push({
            type,
            label,
            date,
            name: fileEntry.name,
            size: stat.size,
            createdAt: stat.birthtime || stat.mtime,
            modifiedAt: stat.mtime,
            url: `/create-file/${relativeParts.join('/')}`,
            apiUrl: `/api/create-file/${relativeParts.join('/')}`
          });
        }
      }

      items.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
      return { type, label, count: items.length, items };
    })
  );

  return { ok: true, groups };
}

async function loginUser(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');

  if (!username || !password) {
    throw new Error('请输入账号和密码');
  }

  const mysqlConfig = await readMysqlConfig();
  const conn = await mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port || 3306,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database
  });

  try {
    await ensureUserOptionalColumns(conn);
    const [rows] = await conn.execute(
      'SELECT id, username, display_name AS displayName, permission FROM cw_user WHERE username = ? AND password = ? AND status = 1 LIMIT 1',
      [username, password]
    );

    if (!rows.length) {
      const error = new Error('账号或密码错误，或账号未启用');
      error.statusCode = 401;
      throw error;
    }

    return {
      ok: true,
      user: rows[0]
    };
  } finally {
    await conn.end();
  }
}

async function listUsers() {
  const conn = await createMysqlConnection();
  try {
    await ensureUserOptionalColumns(conn);
    const [rows] = await conn.execute(
      `SELECT
        id,
        create_time AS createTime,
        username,
        password,
        status,
        display_name AS displayName,
        contact,
        permission
      FROM cw_user
      WHERE status = 1
      ORDER BY id DESC`
    );
    return { ok: true, users: rows };
  } finally {
    await conn.end();
  }
}

async function createUser(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  const displayName = String(payload.displayName || '').trim();
  const contact = String(payload.contact || '').trim();
  const permission = ['administrator', 'personnel'].includes(payload.permission)
    ? payload.permission
    : 'personnel';

  if (!username) throw new Error('账号不能为空');
  if (!password) throw new Error('初始密码不能为空');
  if (password.length < 6) throw new Error('初始密码至少 6 位');

  const conn = await createMysqlConnection();
  try {
    await ensureUserOptionalColumns(conn);
    const [existing] = await conn.execute(
      'SELECT id FROM cw_user WHERE username = ? AND status = 1 LIMIT 1',
      [username]
    );
    if (existing.length) throw new Error('账号已存在');

    const [result] = await conn.execute(
      `INSERT INTO cw_user (
        username,
        password,
        status,
        display_name,
        contact,
        permission
      ) VALUES (?, ?, 1, ?, ?, ?)`,
      [username, password, displayName, contact, permission]
    );
    return { ok: true, id: result.insertId };
  } finally {
    await conn.end();
  }
}

async function updateUserPassword(id, payload) {
  const password = String(payload.password || '');
  if (!id) throw new Error('账号 ID 无效');
  if (!password) throw new Error('新密码不能为空');

  const conn = await createMysqlConnection();
  try {
    const [result] = await conn.execute(
      'UPDATE cw_user SET password = ? WHERE id = ? AND status = 1',
      [password, id]
    );
    if (!result.affectedRows) throw new Error('账号不存在或已删除');
    return { ok: true };
  } finally {
    await conn.end();
  }
}

async function deleteUser(id) {
  if (!id) throw new Error('账号 ID 无效');

  const conn = await createMysqlConnection();
  try {
    const [result] = await conn.execute(
      'UPDATE cw_user SET status = 0 WHERE id = ? AND status = 1',
      [id]
    );
    if (!result.affectedRows) throw new Error('账号不存在或已删除');
    return { ok: true };
  } finally {
    await conn.end();
  }
}

async function getPushConfig() {
  const config = await readAppConfig();
  return {
    ok: true,
    webhook: config.wecom?.webhook || ''
  };
}

async function savePushConfig(payload) {
  const webhook = String(payload.webhook || '').trim();
  if (webhook && !/^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=/.test(webhook)) {
    throw new Error('企业微信 Webhook 地址格式不正确');
  }

  const config = await readAppConfig();
  config.wecom = {
    ...(config.wecom || {}),
    webhook
  };
  await writeAppConfig(config);
  return { ok: true };
}

async function pushGeneratedImageToWecom(payload) {
  const fileDate = String(payload.fileDate || '').trim();
  const fileName = String(payload.fileName || '').trim();
  if (!fileDate || !fileName) throw new Error('缺少要推送的图片信息，请重新生成图片');

  const config = await readAppConfig();
  const webhook = String(config.wecom?.webhook || '').trim();
  if (!webhook) throw new Error('请先配置企业微信 Webhook 地址');

  const imagePath = resolveCreateFilePath(fileDate, fileName);
  const stat = await fsp.stat(imagePath).catch(() => null);
  if (!stat || !stat.isFile()) throw new Error('未找到生成的图片文件，请重新生成后再推送');

  const jpgPath = await convertWebpToJpg(imagePath);
  try {
    const imageBuffer = await fsp.readFile(jpgPath);
    const body = {
      msgtype: 'image',
      image: {
        base64: imageBuffer.toString('base64'),
        md5: crypto.createHash('md5').update(imageBuffer).digest('hex')
      }
    };

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.errcode) {
      throw new Error(data.errmsg || `企业微信推送失败：${response.status}`);
    }
    return { ok: true };
  } finally {
    await fsp.rm(jpgPath, { force: true }).catch(() => {});
  }
}

function resolveCreateFilePath(fileDate, fileName) {
  const safeDate = decodePathRelative(fileDate);
  const safeName = decodePathRelative(fileName);
  const filePath = path.normalize(path.join(CREATE_FILE_ROOT, safeDate, safeName));
  const relative = path.relative(CREATE_FILE_ROOT, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('图片路径无效');
  }
  return filePath;
}

async function convertWebpToJpg(inputPath) {
  const tmpDir = getMangoTmpDir();
  await fsp.mkdir(tmpDir, { recursive: true });
  const converters = [
    {
      name: 'ffmpeg',
      makeArgs: outputPath => ['-y', '-loglevel', 'error', '-i', inputPath, '-frames:v', '1', '-q:v', '5', outputPath]
    },
    {
      name: 'ffmpeg',
      makeArgs: outputPath => ['-y', '-loglevel', 'error', '-i', inputPath, '-frames:v', '1', '-q:v', '9', outputPath]
    },
    {
      name: 'ffmpeg',
      makeArgs: outputPath => ['-y', '-loglevel', 'error', '-i', inputPath, '-frames:v', '1', '-q:v', '13', outputPath]
    },
    {
      name: 'magick',
      makeArgs: outputPath => [inputPath, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-quality', '82', outputPath]
    },
    {
      name: 'magick',
      makeArgs: outputPath => [inputPath, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-quality', '70', outputPath]
    },
    {
      name: 'convert',
      makeArgs: outputPath => [inputPath, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-quality', '82', outputPath]
    },
    {
      name: 'convert',
      makeArgs: outputPath => [inputPath, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-quality', '70', outputPath]
    }
  ];

  const errors = [];
  for (let index = 0; index < converters.length; index += 1) {
    const converter = converters[index];
    const outputPath = path.join(tmpDir, `${path.basename(inputPath, path.extname(inputPath))}-${Date.now()}-${index}.jpg`);
    try {
      execFileSync(converter.name, converter.makeArgs(outputPath), { stdio: 'pipe', env: { ...process.env, PATH: normalizePath(process.env.PATH) } });
      const stat = await fsp.stat(outputPath).catch(() => null);
      if (stat?.isFile() && stat.size > 0 && stat.size <= 2 * 1024 * 1024) return outputPath;
      if (stat?.isFile() && stat.size > 2 * 1024 * 1024) {
        errors.push(`${converter.name}: JPG 超过 2MB (${stat.size} bytes)`);
        await fsp.rm(outputPath, { force: true }).catch(() => {});
        continue;
      }
      errors.push(`${converter.name}: 未生成 JPG 文件`);
    } catch (error) {
      const stderr = error?.stderr ? String(error.stderr).trim() : '';
      errors.push(`${converter.name}: ${stderr || error?.message || '转换失败'}`);
    }
  }

  throw new Error(`图片转 JPG 失败。服务器需要安装 ffmpeg 或 ImageMagick。已尝试：\n${errors.join('\n')}`);
}

async function createMysqlConnection() {
  const mysqlConfig = await readMysqlConfig();
  return mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port || 3306,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database
  });
}

async function ensureUserOptionalColumns(conn) {
  const [columns] = await conn.execute('SHOW COLUMNS FROM cw_user');
  const names = new Set(columns.map(column => column.Field));

  if (!names.has('display_name')) {
    await conn.execute("ALTER TABLE cw_user ADD COLUMN display_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '姓名/显示名' AFTER username");
  }

  if (!names.has('contact')) {
    await conn.execute("ALTER TABLE cw_user ADD COLUMN contact VARCHAR(100) NOT NULL DEFAULT '' COMMENT '联系方式' AFTER display_name");
  }

  if (!names.has('permission')) {
    await conn.execute("ALTER TABLE cw_user ADD COLUMN permission ENUM('administrator','personnel') NOT NULL DEFAULT 'personnel' COMMENT '权限' AFTER status");
  }
}

async function ensureStatementTable(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS cw_dzd (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    create_user VARCHAR(100) NOT NULL DEFAULT '' COMMENT '创建人员',
    customer_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '客户姓名',
    order_id VARCHAR(100) NOT NULL DEFAULT '' COMMENT '订单编号',
    received_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '已收金额',
    actual_consumption VARCHAR(50) NOT NULL DEFAULT '' COMMENT '实际消费',
    refundable_deposit VARCHAR(50) NOT NULL DEFAULT '' COMMENT '应退金额',
    car_rental_desc VARCHAR(255) NOT NULL DEFAULT '' COMMENT '车辆租金说明',
    car_rental_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '车辆租金金额',
    overtime_desc VARCHAR(255) NOT NULL DEFAULT '' COMMENT '超时费用说明',
    overtime_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '超时费用金额',
    fuel_desc VARCHAR(255) NOT NULL DEFAULT '' COMMENT '补油费用说明',
    fuel_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '补油费用金额',
    other_desc VARCHAR(255) NOT NULL DEFAULT '' COMMENT '其他费用说明',
    other_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '其他费用金额',
    consumption_note1 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '消费说明1',
    consumption_note1_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '消费说明1金额',
    consumption_note2 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '消费说明2',
    consumption_note2_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '消费说明2金额',
    consumption_note3 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '消费说明3',
    consumption_note3_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '消费说明3金额',
    consumption_note4 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '消费说明4',
    consumption_note4_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '消费说明4金额',
    consumption_note5 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '消费说明5',
    consumption_note5_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '消费说明5金额',
    consumption_note6 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '消费说明6',
    consumption_note6_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '消费说明6金额',
    car_model VARCHAR(100) NOT NULL DEFAULT '' COMMENT '车型',
    plate_number VARCHAR(100) NOT NULL DEFAULT '' COMMENT '车牌',
    start_at VARCHAR(100) NOT NULL DEFAULT '' COMMENT '出车时间',
    return_at VARCHAR(100) NOT NULL DEFAULT '' COMMENT '回车时间',
    use_days VARCHAR(50) NOT NULL DEFAULT '' COMMENT '用车天数',
    start_mileage VARCHAR(50) NOT NULL DEFAULT '' COMMENT '出车公里',
    return_mileage VARCHAR(50) NOT NULL DEFAULT '' COMMENT '回车公里',
    actual_mileage VARCHAR(50) NOT NULL DEFAULT '' COMMENT '实际行驶',
    start_fuel VARCHAR(50) NOT NULL DEFAULT '' COMMENT '出车油量',
    return_fuel VARCHAR(50) NOT NULL DEFAULT '' COMMENT '回车油量',
    refuel_amount VARCHAR(50) NOT NULL DEFAULT '' COMMENT '补油量',
    check_scratch VARCHAR(10) NOT NULL DEFAULT '' COMMENT '新增磕碰',
    check_mark VARCHAR(10) NOT NULL DEFAULT '' COMMENT '新增划痕',
    check_accident VARCHAR(10) NOT NULL DEFAULT '' COMMENT '事故记录',
    check_over_mileage VARCHAR(10) NOT NULL DEFAULT '' COMMENT '超公里费用',
    check_overtime VARCHAR(10) NOT NULL DEFAULT '' COMMENT '超时费用',
    abnormal_note1 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '异常说明1',
    abnormal_note2 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '异常说明2',
    abnormal_note3 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '异常说明3',
    abnormal_note4 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '异常说明4',
    abnormal_note5 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '异常说明5',
    abnormal_note6 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '异常说明6',
    abnormal_note7 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '异常说明7',
    abnormal_note8 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '异常说明8',
    abnormal_note9 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '异常说明9',
    vehicle_deposit VARCHAR(50) NOT NULL DEFAULT '' COMMENT '车辆押金',
    violation_deposit VARCHAR(50) NOT NULL DEFAULT '' COMMENT '违章押金',
    INDEX idx_order_id (order_id),
    INDEX idx_create_time (create_time)
  ) DEFAULT CHARSET=utf8mb4 COMMENT='对帐单生成表'`);
}

async function readMysqlConfig() {
  const config = await readAppConfig();
  return config.mysql || {};
}

async function readAppConfig() {
  const configPath = path.join(ROOT_DIR, 'app_config.json');
  const raw = await fsp.readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

async function writeAppConfig(config) {
  const configPath = path.join(ROOT_DIR, 'app_config.json');
  await fsp.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function validateDjdPayload(payload) {
  const required = [
    'orderId',
    'createUser'
  ];

  const missing = required.filter(key => payload[key] === undefined || String(payload[key]).trim() === '');
  if (missing.length) {
    throw new Error(`缺少字段：${missing.join(', ')}`);
  }
}

function validateWkdPayload(payload) {
  const required = [
    'orderId',
    'createUser'
  ];

  const missing = required.filter(key => payload[key] === undefined || String(payload[key]).trim() === '');
  if (missing.length) {
    throw new Error(`缺少字段：${missing.join(', ')}`);
  }
}

function validateZdPayload(payload) {
  const required = [
    'orderId',
    'createUser'
  ];

  const missing = required.filter(key => payload[key] === undefined || String(payload[key]).trim() === '');
  if (missing.length) {
    throw new Error(`缺少字段：${missing.join(', ')}`);
  }
}

function normalizeMysqlDateTime(value) {
  const normalized = String(value || '').trim().replace(/\./g, '-');
  return normalized || null;
}

async function sendGeneratedWebp(res, result) {
  const stat = await fsp.stat(result.imagePath);
  res.writeHead(200, {
    'Content-Type': 'image/webp',
    'Content-Length': stat.size,
    'X-Filename': encodeURIComponent(result.webpName),
    'X-File-Date': encodeURIComponent(result.fileDate || ''),
    'Content-Disposition': `inline; filename*=UTF-8''${encodeRFC5987ValueChars(result.webpName)}`
  });
  fs.createReadStream(result.imagePath).pipe(res);
}

async function archiveGeneratedWebp(webpPath, type = 'deposit') {
  const day = formatLocalDate(new Date());
  const typeDir = RECEIPT_DIR_NAMES[type] || type;
  const dayDir = path.join(CREATE_FILE_ROOT, typeDir, day);
  await fsp.mkdir(dayDir, { recursive: true });

  const originalName = path.basename(webpPath);
  const targetPath = await getAvailableFilePath(dayDir, originalName);
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

function getSkillConfig(type) {
  const skill = SKILLS[type];
  if (!skill) throw new Error(`未知单据类型：${type}`);
  return {
    ...skill,
    script: path.join(skill.root, 'scripts', skill.scriptName)
  };
}

async function ensureSkillExtracted(type) {
  const skill = getSkillConfig(type);
  const skillStat = await fsp.stat(skill.file).catch(() => null);
  if (!skillStat) throw new Error(`Skill file not found: ${path.relative(ROOT_DIR, skill.file)}`);

  const marker = path.join(skill.root, '.source-mtime');
  const markerValue = `${skillStat.mtimeMs}:${skill.patchRuntime ? 'chrome-runtime-patch-v13' : 'runtime-v1'}`;
  const currentMarker = await fsp.readFile(marker, 'utf8').catch(() => '');

  if (currentMarker === markerValue && fs.existsSync(skill.script)) return;

  await fsp.rm(skill.root, { recursive: true, force: true });
  await fsp.mkdir(RUNTIME_DIR, { recursive: true });
  execFileSync('unzip', ['-oq', skill.file, '-d', RUNTIME_DIR], { stdio: 'pipe' });
  if (skill.patchRuntime) await patchSkillChromeLookup(skill);
  await fsp.writeFile(marker, markerValue, 'utf8');
}

async function patchSkillChromeLookup(skill) {
  const scriptPath = path.join(skill.root, 'scripts', skill.scriptName);
  let source = await fsp.readFile(scriptPath, 'utf8');
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
    ...(process.platform === 'darwin' ? [] : [\`--user-data-dir=\${process.env.MANGO_TMP_DIR || os.tmpdir()}/chrome-profile\`])
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
    "const baseName = sanitizeFilename(`定金单_${data.customerId}_${data.customerName}_${data.carModel}_${String(data.holdUntil).slice(0,10)}`);",
    "if (!data.orderId || String(data.orderId).trim() === '') die('orderId（订单编号）不能为空');\n  const baseName = sanitizeFilename(`djd_${data.orderId}_${String(data.holdUntil || new Date().toISOString().slice(0,10)).slice(0,10)}`);"
  );
  source = source.replace(
    "const tmpHtml = path.join(os.tmpdir(), `${baseName}_${Date.now()}.html`);\n  const tmpPng = path.join(os.tmpdir(), `${baseName}_${Date.now()}.png`);",
    "const tmpBase = `mango_deposit_${Date.now()}_${Math.random().toString(16).slice(2)}`;\n  const tmpDir = process.env.MANGO_TMP_DIR || path.join(outDir, '_tmp');\n  await fs.mkdir(tmpDir, { recursive: true });\n  const tmpHtml = path.join(tmpDir, `${tmpBase}.html`);\n  const tmpPng = path.join(tmpDir, `${tmpBase}.png`);"
  );
  source = source.replace(
    "  convertToWebp(tmpPng, webpPath);",
    "  const pngStat = await fs.stat(tmpPng).catch(() => null);\n  if (!pngStat || !pngStat.isFile() || pngStat.size === 0) {\n    die(`Chrome 截图失败：未生成 PNG 文件：${tmpPng}`);\n  }\n\n  convertToWebp(tmpPng, webpPath);"
  );

  if (!source.includes('--no-sandbox') || !source.includes('CWEBP_PATH') || !source.includes('MANGO_TMP_DIR') || !source.includes('Chrome 截图失败') || !source.includes('orderId（订单编号）不能为空') || source.includes('定金单_${data.customerId}')) {
    throw new Error('Failed to patch skill runtime');
  }

  await fsp.writeFile(scriptPath, source, 'utf8');
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
  if (process.platform === 'darwin') {
    return path.join(os.tmpdir(), 'mango-money-tmp');
  }
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
  const relative = decodePathRelative(pathname.replace(/^\/skill-output\/?/, ''));
  const filePath = path.normalize(path.join(OUTPUT_ROOT, relative));

  if (!filePath.startsWith(OUTPUT_ROOT)) {
    sendText(res, 'Forbidden', 403);
    return;
  }

  await sendFile(filePath, res);
}

async function serveCreateFile(pathname, res) {
  const relative = decodePathRelative(pathname.replace(/^\/create-file\/?/, ''));
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
    'Content-Length': stat.size,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeRFC5987ValueChars(path.basename(filePath))}`
  });

  if (headOnly) {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

function decodePathRelative(relativePath) {
  return relativePath
    .split('/')
    .filter(Boolean)
    .map(part => decodeURIComponent(part))
    .join(path.sep);
}

function encodeRFC5987ValueChars(value) {
  return encodeURIComponent(value)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A');
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
  return `/api/create-file/${relative.split(path.sep).map(encodeURIComponent).join('/')}`;
}
