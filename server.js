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
  deposit: 'djd',
  balance: 'wkd',
  statement: 'dzd'
};
const RECEIPT_LABELS = {
  deposit: '定金单',
  balance: '尾款单',
  statement: '对帐单'
};
const LEGACY_RECEIPT_DIR_NAMES = {
  deposit: '定金单',
  balance: '尾款单',
  statement: '对帐单'
};
const USER_TABLE = 'cw_ryb';
const USER_PERMISSIONS = ['administrator', 'fleet_manager', 'sales', 'finance'];
const PASSWORD_ENCRYPTION_PREFIX = 'aes-ecb:';
const FORMULA_VIEW_PREFIX = 'cw_formula_view_';
const CONFIG_TABLES = ['cw_table_view_config', 'cw_field_option_config', 'cw_formula_field_config'];
const DEFAULT_JSON_BODY_LIMIT = 1024 * 1024;
const MIDDLE_TABLE_JSON_BODY_LIMIT = 25 * 1024 * 1024;

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

    if (req.method === 'GET' && url.pathname === '/api/health') {
      const result = await getHealthStatus();
      sendJson(res, result, result.ok ? 200 : 500);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/middle-platform/tables') {
      const result = await listMiddlePlatformTables();
      sendJson(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/middle-platform/table-data') {
      const payload = await readJsonBody(req, MIDDLE_TABLE_JSON_BODY_LIMIT);
      const result = await saveMiddlePlatformTableData(payload);
      sendJson(res, result);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/table-management') {
      const result = await getTableManagementConfig();
      sendJson(res, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/table-management') {
      const payload = await readJsonBody(req);
      const result = await saveTableManagementConfig(payload);
      sendJson(res, result);
      return;
    }

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

    if (req.method === 'GET' && url.pathname === '/api/history-image') {
      await serveHistoryImage(url, res);
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

await ensureAppDirs();

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
      `INSERT INTO tp_djd (
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
      `INSERT INTO tp_wkd (
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
      `INSERT INTO tp_dzd (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
      values
    );
    return { ok: true, id: result.insertId };
  } finally {
    await conn.end();
  }
}

async function listHistoryImages() {
  const groups = await Promise.all(
    Object.entries(RECEIPT_DIR_NAMES).map(async ([type, dirName]) => {
      const label = RECEIPT_LABELS[type] || dirName;
      const dirNames = [dirName, LEGACY_RECEIPT_DIR_NAMES[type]].filter(Boolean);
      const items = [];
      const seen = new Set();

      for (const currentDirName of dirNames) {
        const typeDir = path.join(CREATE_FILE_ROOT, currentDirName);
        const dates = await fsp.readdir(typeDir, { withFileTypes: true }).catch(() => []);

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

            const dedupeKey = `${date}/${fileEntry.name}`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            const apiUrl = `/api/history-image?type=${encodeURIComponent(type)}&date=${encodeURIComponent(date)}&name=${encodeURIComponent(fileEntry.name)}`;
            items.push({
              type,
              label,
              date,
              name: fileEntry.name,
              size: stat.size,
              createdAt: stat.birthtime || stat.mtime,
              modifiedAt: stat.mtime,
              url: apiUrl,
              apiUrl
            });
          }
        }
      }

      items.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
      const dateGroups = [];
      const dateMap = new Map();
      for (const item of items) {
        if (!dateMap.has(item.date)) {
          const group = { date: item.date, count: 0, items: [] };
          dateMap.set(item.date, group);
          dateGroups.push(group);
        }
        const group = dateMap.get(item.date);
        group.items.push(item);
        group.count += 1;
      }
      return { type, label, count: items.length, items, dateGroups };
    })
  );

  return { ok: true, groups };
}

async function listMiddlePlatformTables() {
  const conn = await createMysqlConnection();
  try {
    await ensureTableViewConfigTable(conn);
    await ensureDefaultTableViewConfig(conn);
    await ensureFormulaFieldConfigTable(conn);

    const [configs] = await conn.execute(`
      SELECT table_name, table_label, visible_fields
      FROM cw_table_view_config
      WHERE is_visible = 1
      ORDER BY sort_order ASC, id ASC
    `);
    const schemaTables = await getSchemaTables(conn);
    const formulaConfigsByTable = await getFormulaConfigsByTable(conn, schemaTables);
    const tables = [];

    for (const config of configs) {
      const schemaTable = schemaTables.find(table => table.tableName === config.table_name);
      if (!schemaTable) continue;
      const formulaConfigs = formulaConfigsByTable.get(schemaTable.tableName) || [];
      const viewName = formulaConfigs.length
        ? await syncFormulaView(conn, schemaTable, formulaConfigs)
        : '';

      const allowedColumns = attachFormulaConfigsToColumns(schemaTable, formulaConfigs);
      const configuredFields = parseJsonArray(config.visible_fields);
      const visibleKeys = configuredFields.length
        ? configuredFields.filter(field => allowedColumns.some(column => column.key === field))
        : allowedColumns.map(column => column.key);
      const columns = allowedColumns.filter(column => visibleKeys.includes(column.key));
      if (!columns.length) continue;

      const primaryKeyColumn = getPrimaryKeyColumn(schemaTable);
      const selectColumns = primaryKeyColumn && !columns.some(column => column.key === primaryKeyColumn.key)
        ? [primaryKeyColumn, ...columns]
        : columns;
      const selectSql = selectColumns
        .map(column => formatSelectColumn(column))
        .join(', ');
      const orderSql = buildMiddleTableOrderSql(schemaTable.tableName, allowedColumns);
      const [rows] = await conn.query(`
        SELECT ${selectSql}
        FROM ${escapeIdentifier(viewName || schemaTable.tableName)}
        ${orderSql}
        LIMIT 500
      `);
      const hydratedRows = await attachFormulaRawValues(conn, schemaTable, primaryKeyColumn, formulaConfigs, rows);

      tables.push({
        key: schemaTable.tableName,
        label: config.table_label || schemaTable.tableComment || schemaTable.tableName,
        databaseName: schemaTable.tableName,
        viewName,
        primaryKey: primaryKeyColumn?.key || '',
        role: '',
        columns,
        rows: hydratedRows
      });
    }

    return { ok: true, tables };
  } finally {
    await conn.end();
  }
}

async function saveMiddlePlatformTableData(payload) {
  const tableName = String(payload.tableName || '').trim();
  const inserts = Array.isArray(payload.inserts) ? payload.inserts : [];
  const updates = Array.isArray(payload.updates) ? payload.updates : [];
  const deletes = Array.isArray(payload.deletes) ? payload.deletes : [];
  const operator = normalizeAuditUser(payload.operator);
  if (!tableName) throw new Error('缺少表名');
  if (!inserts.length && !updates.length && !deletes.length) return { ok: true, inserted: 0, updated: 0, deleted: 0 };

  const conn = await createMysqlConnection();
  try {
    const schemaTables = await getSchemaTables(conn);
    const schemaTable = schemaTables.find(table => table.tableName === tableName);
    if (!schemaTable) throw new Error(`表不存在或不允许编辑：${tableName}`);

    const primaryKeyColumn = getPrimaryKeyColumn(schemaTable);
    if (!primaryKeyColumn) throw new Error(`${schemaTable.tableComment || tableName} 没有主键，不能在线编辑`);

    const columnsByKey = new Map(schemaTable.columns.map(column => [column.key, column]));
    const formulaConfigs = await getFormulaConfigsForTable(conn, schemaTable);
    let inserted = 0;
    let updated = 0;
    let deleted = 0;
    const insertedIds = [];
    const updatedIds = [];
    const deletedIds = [];
    const errors = [];
    const operationLogs = [];

    await ensureMiddleOperationLogTable(conn);
    await conn.beginTransaction();

    for (let rowIndex = 0; rowIndex < inserts.length; rowIndex += 1) {
      const changes = inserts[rowIndex]?.changes && typeof inserts[rowIndex].changes === 'object'
        ? { ...inserts[rowIndex].changes }
        : {};
      applyServerFormulaChanges(schemaTable, formulaConfigs, changes, {}, { force: true });
      const fields = [];
      const values = [];

      for (const [field, rawValue] of Object.entries(changes)) {
        const column = columnsByKey.get(field);
        if (!column) {
          errors.push(`新增第 ${rowIndex + 1} 行：字段 ${field} 不存在`);
          continue;
        }
        if (!column.isEditable) {
          errors.push(`新增第 ${rowIndex + 1} 行：${column.label} 不允许编辑`);
          continue;
        }

        const normalized = normalizeMiddleCellValue(column, rawValue);
        if (normalized.error) {
          errors.push(`新增第 ${rowIndex + 1} 行 ${column.label}：${normalized.error}`);
          continue;
        }

        if (normalized.value !== '' && normalized.value !== null) {
          fields.push(field);
          values.push(normalized.value);
        }
      }

      if (!fields.length) {
        errors.push(`新增第 ${rowIndex + 1} 行至少填写一个字段`);
        continue;
      }

      const [result] = await conn.execute(
        `INSERT INTO ${escapeIdentifier(tableName)}
          (${fields.map(escapeIdentifier).join(', ')})
         VALUES (${fields.map(() => '?').join(', ')})`,
        values
      );
      inserted += result.affectedRows || 0;
      if (result.insertId) {
        insertedIds.push(result.insertId);
        operationLogs.push(buildMiddleOperationLog({
          operator,
          schemaTable,
          primaryKeyColumn,
          operationType: 'insert',
          primaryValue: result.insertId,
          changes
        }));
      }
    }

    const updateBaseRows = await getMiddleUpdateBaseRows(conn, schemaTable, primaryKeyColumn, updates, formulaConfigs);

    for (let rowIndex = 0; rowIndex < updates.length; rowIndex += 1) {
      const update = updates[rowIndex];
      const primaryValue = update?.primaryKey?.value;
      const changes = update?.changes && typeof update.changes === 'object' ? { ...update.changes } : {};

      if (primaryValue === undefined || primaryValue === null || String(primaryValue) === '') {
        errors.push(`第 ${rowIndex + 1} 行缺少主键，不能保存`);
        continue;
      }

      const setParts = [];
      const values = [];
      applyServerFormulaChanges(
        schemaTable,
        formulaConfigs,
        changes,
        updateBaseRows.get(String(primaryValue)) || {},
        { force: false }
      );

      for (const [field, rawValue] of Object.entries(changes)) {
        const column = columnsByKey.get(field);
        if (!column) {
          errors.push(`字段 ${field} 不存在`);
          continue;
        }
        if (!column.isEditable) {
          errors.push(`${column.label} 不允许编辑`);
          continue;
        }

        const normalized = normalizeMiddleCellValue(column, rawValue);
        if (normalized.error) {
          errors.push(`${column.label}：${normalized.error}`);
          continue;
        }

        setParts.push(`${escapeIdentifier(field)} = ?`);
        values.push(normalized.value);
      }

      if (setParts.length) {
        values.push(primaryValue);
        const [result] = await conn.execute(
          `UPDATE ${escapeIdentifier(tableName)}
           SET ${setParts.join(', ')}
           WHERE ${escapeIdentifier(primaryKeyColumn.key)} = ?`,
          values
        );
        updated += result.affectedRows || 0;
        if (result.affectedRows) {
          updatedIds.push(primaryValue);
          operationLogs.push(buildMiddleOperationLog({
            operator,
            schemaTable,
            primaryKeyColumn,
            operationType: 'update',
            primaryValue,
            changes
          }));
        }
      }
    }

    const deleteBaseRows = await getMiddleDeleteBaseRows(conn, schemaTable, primaryKeyColumn, deletes);

    for (let rowIndex = 0; rowIndex < deletes.length; rowIndex += 1) {
      const primaryValue = deletes[rowIndex]?.primaryKey?.value;
      if (primaryValue === undefined || primaryValue === null || String(primaryValue) === '') {
        errors.push(`删除第 ${rowIndex + 1} 行缺少主键`);
        continue;
      }

      const [result] = await conn.execute(
        `DELETE FROM ${escapeIdentifier(tableName)}
         WHERE ${escapeIdentifier(primaryKeyColumn.key)} = ?`,
        [primaryValue]
      );
      deleted += result.affectedRows || 0;
      if (result.affectedRows) {
        deletedIds.push(primaryValue);
        operationLogs.push(buildMiddleOperationLog({
          operator,
          schemaTable,
          primaryKeyColumn,
          operationType: 'delete',
          primaryValue,
          changes: { before: deleteBaseRows.get(String(primaryValue)) || {} }
        }));
      }
    }

    if (errors.length) {
      await conn.rollback();
      const error = new Error(errors.join('\n'));
      error.statusCode = 400;
      throw error;
    }

    await insertMiddleOperationLogs(conn, operationLogs);
    await conn.commit();
    return {
      ok: true,
      tableName,
      tableLabel: schemaTable.tableComment || tableName,
      primaryKey: primaryKeyColumn.key,
      inserted,
      updated,
      deleted,
      insertedIds,
      updatedIds,
      deletedIds
    };
  } catch (error) {
    await conn.rollback?.().catch?.(() => {});
    throw error;
  } finally {
    await conn.end();
  }
}

async function getTableManagementConfig() {
  const conn = await createMysqlConnection();
  try {
    await ensureTableViewConfigTable(conn);
    await ensureFieldOptionConfigTable(conn);
    await ensureFormulaFieldConfigTable(conn);
    await ensureDefaultTableViewConfig(conn);
    const schemaTables = await getSchemaTables(conn);
    const formulaConfigsByTable = await getFormulaConfigsByTable(conn, schemaTables);
    const [configs] = await conn.execute(`
      SELECT table_name, table_label, is_visible, visible_fields, sort_order
      FROM cw_table_view_config
      ORDER BY sort_order ASC, id ASC
    `);
    const configMap = new Map(configs.map(config => [config.table_name, config]));

    const tables = schemaTables.map((table, index) => {
      const config = configMap.get(table.tableName);
      const visibleFields = parseJsonArray(config?.visible_fields);
      const configuredVisibleFields = visibleFields.filter(field => !isSystemTableField(field));
      return {
        tableName: table.tableName,
        tableLabel: config?.table_label || table.tableComment || table.tableName,
        tableComment: table.tableComment || '',
        isVisible: Boolean(config?.is_visible),
        sortOrder: Number(config?.sort_order ?? index + 1),
        visibleFields: config
          ? configuredVisibleFields
          : getConfigurableTableFields(table),
        columns: attachFormulaConfigsToColumns(table, formulaConfigsByTable.get(table.tableName) || [])
      };
    });

    return { ok: true, tables };
  } finally {
    await conn.end();
  }
}

async function saveTableManagementConfig(payload) {
  const tables = Array.isArray(payload.tables) ? payload.tables : [];
  const conn = await createMysqlConnection();
  try {
    await ensureTableViewConfigTable(conn);
    await ensureFieldOptionConfigTable(conn);
    await ensureFormulaFieldConfigTable(conn);
    const schemaTables = await getSchemaTables(conn);
    const schemaMap = new Map(schemaTables.map(table => [table.tableName, table]));

    for (let index = 0; index < tables.length; index += 1) {
      const item = tables[index];
      const schemaTable = schemaMap.get(String(item.tableName || ''));
      if (!schemaTable) continue;

      const allowedFields = new Set(getConfigurableTableFields(schemaTable));
      const visibleFields = Array.isArray(item.visibleFields)
        ? item.visibleFields.filter(field => allowedFields.has(field))
        : [];
      const tableLabel = String(item.tableLabel || schemaTable.tableComment || schemaTable.tableName).trim();
      const isVisible = item.isVisible ? 1 : 0;
      const sortOrder = Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1;

      await conn.execute(
        `INSERT INTO cw_table_view_config (
          table_name,
          table_label,
          is_visible,
          visible_fields,
          sort_order
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          table_label = VALUES(table_label),
          is_visible = VALUES(is_visible),
          visible_fields = VALUES(visible_fields),
          sort_order = VALUES(sort_order)`,
        [
          schemaTable.tableName,
          tableLabel,
          isVisible,
          JSON.stringify(visibleFields),
          sortOrder
        ]
      );

      const schemaColumnsByKey = new Map(schemaTable.columns.map(column => [column.key, column]));
      const submittedColumns = Array.isArray(item.columns) ? item.columns : [];
      for (const column of submittedColumns) {
        const schemaColumn = schemaColumnsByKey.get(String(column.key || ''));
        if (!schemaColumn) continue;
        const inferredFieldKind = normalizeFieldKind(column.fieldKind) || inferFieldKind(schemaColumn);
        const submittedFieldKind = shouldPersistFieldKind(inferredFieldKind) ? inferredFieldKind : '';

        if (isConfigurableSelectColumn(schemaColumn) || isConfigurableOptionColumn(schemaColumn) || column.optionConfig) {
          const rawOptions = Array.isArray(column.selectOptions) && column.selectOptions.length
            ? column.selectOptions
            : column.enumValues;
          const options = uniqueStrings(Array.isArray(rawOptions) ? rawOptions : []);
          const optionConfig = normalizeSubmittedOptionConfig(column.optionConfig);

          if (optionConfig.type === 'table') {
            if (!schemaMap.has(optionConfig.sourceTableName)) {
              throw new Error(`字段 ${schemaColumn.columnComment || schemaColumn.key} 的选项来源表不存在`);
            }
            const sourceTable = schemaMap.get(optionConfig.sourceTableName);
            if (!sourceTable.columns.some(sourceColumn => sourceColumn.key === optionConfig.sourceColumnName)) {
              throw new Error(`字段 ${schemaColumn.columnComment || schemaColumn.key} 的选项来源字段不存在`);
            }
            await conn.execute(
              `INSERT INTO cw_field_option_config (
	                table_name,
	                column_name,
	                options_json,
	                option_source_type,
	                source_table_name,
	                source_column_name,
	                field_kind
	              ) VALUES (?, ?, NULL, 'table', ?, ?, ?)
	              ON DUPLICATE KEY UPDATE
	                options_json = VALUES(options_json),
	                option_source_type = VALUES(option_source_type),
	                source_table_name = VALUES(source_table_name),
	                source_column_name = VALUES(source_column_name),
	                field_kind = VALUES(field_kind)`,
	              [schemaTable.tableName, schemaColumn.key, optionConfig.sourceTableName, optionConfig.sourceColumnName, submittedFieldKind]
	            );
	          } else if (!options.length) {
	            await saveFieldKindOnlyConfig(conn, schemaTable.tableName, schemaColumn.key, submittedFieldKind);
	          } else {
	            await conn.execute(
	              `INSERT INTO cw_field_option_config (
	                table_name,
	                column_name,
	                options_json,
	                option_source_type,
	                source_table_name,
	                source_column_name,
	                field_kind
	              ) VALUES (?, ?, ?, 'static', '', '', ?)
	              ON DUPLICATE KEY UPDATE
	                options_json = VALUES(options_json),
	                option_source_type = VALUES(option_source_type),
	                source_table_name = VALUES(source_table_name),
	                source_column_name = VALUES(source_column_name),
	                field_kind = VALUES(field_kind)`,
	              [schemaTable.tableName, schemaColumn.key, JSON.stringify(options), submittedFieldKind]
	            );
	          }
        } else {
          await saveFieldKindOnlyConfig(conn, schemaTable.tableName, schemaColumn.key, submittedFieldKind);
        }

        await saveFormulaColumnConfig(conn, schemaTable, schemaColumn, column.formulaConfig, schemaMap);
      }

      const savedFormulaConfigs = await getFormulaConfigsForTable(conn, schemaTable);
      if (savedFormulaConfigs.length) {
        await syncFormulaView(conn, schemaTable, savedFormulaConfigs);
      } else {
        await dropFormulaView(conn, schemaTable.tableName);
      }
    }

    return { ok: true };
  } finally {
    await conn.end();
  }
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
    await ensureUserLoginLogTable(conn);
    const encryptedPassword = await encryptUserPassword(password);
    const [rows] = await conn.execute(
      `SELECT id, username, display_name AS displayName, permission FROM ${escapeIdentifier(USER_TABLE)} WHERE username = ? AND password = ? AND status = 1 LIMIT 1`,
      [username, encryptedPassword]
    );

    if (!rows.length) {
      const error = new Error('账号或密码错误，或账号未启用');
      error.statusCode = 401;
      throw error;
    }

    const user = rows[0];
    await conn.execute(
      `INSERT INTO user_login_log (user_id, username, display_name, permission)
       VALUES (?, ?, ?, ?)`,
      [user.id || null, user.username || '', user.displayName || '', user.permission || '']
    );

    return {
      ok: true,
      user
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
      FROM ${escapeIdentifier(USER_TABLE)}
      WHERE status = 1
      ORDER BY id DESC`
    );
    return {
      ok: true,
      users: await Promise.all(rows.map(async user => ({
        ...user,
        password: await decryptUserPassword(user.password)
      })))
    };
  } finally {
    await conn.end();
  }
}

async function createUser(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  const displayName = String(payload.displayName || '').trim();
  const contact = String(payload.contact || '').trim();
  const permission = USER_PERMISSIONS.includes(payload.permission)
    ? payload.permission
    : 'finance';

  if (!username) throw new Error('账号不能为空');
  if (!password) throw new Error('初始密码不能为空');
  if (password.length < 6) throw new Error('初始密码至少 6 位');
  const encryptedPassword = await encryptUserPassword(password);

  const conn = await createMysqlConnection();
  try {
    await ensureUserOptionalColumns(conn);
    const [existing] = await conn.execute(
      `SELECT id FROM ${escapeIdentifier(USER_TABLE)} WHERE username = ? AND status = 1 LIMIT 1`,
      [username]
    );
    if (existing.length) throw new Error('账号已存在');

    const [result] = await conn.execute(
      `INSERT INTO ${escapeIdentifier(USER_TABLE)} (
        username,
        password,
        status,
        display_name,
        contact,
        permission
      ) VALUES (?, ?, 1, ?, ?, ?)`,
      [username, encryptedPassword, displayName, contact, permission]
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
  const encryptedPassword = await encryptUserPassword(password);

  const conn = await createMysqlConnection();
  try {
    const [result] = await conn.execute(
      `UPDATE ${escapeIdentifier(USER_TABLE)} SET password = ? WHERE id = ? AND status = 1`,
      [encryptedPassword, id]
    );
    if (!result.affectedRows) throw new Error('账号不存在或已删除');
    return { ok: true };
  } finally {
    await conn.end();
  }
}

async function getPasswordEncryptionConfig() {
  const config = await readAppConfig();
  const encryption = config.passwordEncryption || {};
  return {
    algorithm: encryption.algorithm || 'aes-128-ecb',
    padding: encryption.padding || 'pkcs7',
    key: encryption.key || ''
  };
}

async function encryptUserPassword(password) {
  const encryption = await getPasswordEncryptionConfig();
  const key = Buffer.from(encryption.key, 'utf8');
  const cipher = crypto.createCipheriv(encryption.algorithm, key, null);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([
    cipher.update(String(password), 'utf8'),
    cipher.final()
  ]);
  return `${PASSWORD_ENCRYPTION_PREFIX}${encrypted.toString('base64')}`;
}

async function decryptUserPassword(password) {
  const value = String(password || '');
  if (!value.startsWith(PASSWORD_ENCRYPTION_PREFIX)) return value;

  const encryption = await getPasswordEncryptionConfig();
  const key = Buffer.from(encryption.key, 'utf8');
  const encrypted = Buffer.from(value.slice(PASSWORD_ENCRYPTION_PREFIX.length), 'base64');
  const decipher = crypto.createDecipheriv(encryption.algorithm, key, null);
  decipher.setAutoPadding(true);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('utf8');
}

async function deleteUser(id) {
  if (!id) throw new Error('账号 ID 无效');

  const conn = await createMysqlConnection();
  try {
    const [result] = await conn.execute(
      `UPDATE ${escapeIdentifier(USER_TABLE)} SET status = 0 WHERE id = ? AND status = 1`,
      [id]
    );
    if (!result.affectedRows) throw new Error('账号不存在或已删除');
    return { ok: true };
  } finally {
    await conn.end();
  }
}

async function getPushConfig() {
  return {
    ok: true,
    webhook: await readWecomWebhook()
  };
}

async function savePushConfig(payload) {
  const webhook = String(payload.webhook || '').trim();
  if (webhook && !/^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=/.test(webhook)) {
    throw new Error('企业微信 Webhook 地址格式不正确');
  }

  const savedWebhook = await writeWecomWebhook(webhook);
  return { ok: true, webhook: savedWebhook };
}

async function pushGeneratedImageToWecom(payload) {
  const fileDate = String(payload.fileDate || '').trim();
  const fileName = String(payload.fileName || '').trim();
  if (!fileDate || !fileName) throw new Error('缺少要推送的图片信息，请重新生成图片');

  const webhook = await readWecomWebhook();
  if (!webhook) throw new Error('请先配置企业微信 Webhook 地址');

  const imagePath = await resolveCreateFilePath(fileDate, fileName);
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

async function resolveCreateFilePath(fileDate, fileName) {
  const safeDate = decodePathRelative(fileDate);
  const safeName = decodePathRelative(fileName);
  const existingPath = await resolveExistingCreateFile(path.join(safeDate, safeName));
  if (existingPath) return existingPath;
  return resolveCreateFileCandidate(path.join(safeDate, safeName));
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
  const [columns] = await conn.execute(`SHOW COLUMNS FROM ${escapeIdentifier(USER_TABLE)}`);
  const names = new Set(columns.map(column => column.Field));

  if (!names.has('display_name')) {
    await conn.execute(`ALTER TABLE ${escapeIdentifier(USER_TABLE)} ADD COLUMN display_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '姓名/显示名' AFTER username`);
  }

  if (!names.has('contact')) {
    await conn.execute(`ALTER TABLE ${escapeIdentifier(USER_TABLE)} ADD COLUMN contact VARCHAR(100) NOT NULL DEFAULT '' COMMENT '联系方式' AFTER display_name`);
  }

  if (!names.has('permission')) {
    await conn.execute(`ALTER TABLE ${escapeIdentifier(USER_TABLE)} ADD COLUMN permission ENUM('administrator','fleet_manager','sales','finance') NOT NULL DEFAULT 'finance' COMMENT '权限' AFTER status`);
    return;
  }

  const permissionColumn = columns.find(column => column.Field === 'permission');
  const permissionType = String(permissionColumn?.Type || '');
  const hasAllRoles = USER_PERMISSIONS.every(permission => permissionType.includes(`'${permission}'`));
  const hasLegacyPersonnel = permissionType.includes("'personnel'");

  if (!hasAllRoles || hasLegacyPersonnel) {
    await conn.execute(`ALTER TABLE ${escapeIdentifier(USER_TABLE)} MODIFY COLUMN permission ENUM('administrator','personnel','fleet_manager','sales','finance') NOT NULL DEFAULT 'finance' COMMENT '权限'`);
    await conn.execute(`UPDATE ${escapeIdentifier(USER_TABLE)} SET permission = 'finance' WHERE permission = 'personnel' OR permission IS NULL OR permission = ''`);
    await conn.execute(`ALTER TABLE ${escapeIdentifier(USER_TABLE)} MODIFY COLUMN permission ENUM('administrator','fleet_manager','sales','finance') NOT NULL DEFAULT 'finance' COMMENT '权限'`);
  }
}

async function ensureUserLoginLogTable(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS user_login_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
    user_id BIGINT NULL COMMENT '用户ID',
    username VARCHAR(100) NOT NULL DEFAULT '' COMMENT '账号',
    display_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '姓名/显示名',
    permission VARCHAR(50) NOT NULL DEFAULT '' COMMENT '权限',
    INDEX idx_login_time (login_time),
    INDEX idx_username (username)
  ) DEFAULT CHARSET=utf8mb4 COMMENT='用户登录日志'`);
}

async function ensureMiddleOperationLogTable(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS middle_operation_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    operation_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    user_id BIGINT NULL COMMENT '用户ID',
    username VARCHAR(100) NOT NULL DEFAULT '' COMMENT '账号',
    display_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '姓名/显示名',
    table_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '数据库表名',
    table_label VARCHAR(100) NOT NULL DEFAULT '' COMMENT '表显示名',
    operation_type ENUM('insert','update','delete') NOT NULL COMMENT '操作类型',
    primary_key_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '主键字段名',
    primary_key_value VARCHAR(100) NOT NULL DEFAULT '' COMMENT '主键值',
    change_json JSON NULL COMMENT '变更内容',
    INDEX idx_operation_time (operation_time),
    INDEX idx_user_table (username, table_name),
    INDEX idx_table_pk (table_name, primary_key_value)
  ) DEFAULT CHARSET=utf8mb4 COMMENT='中台操作日志'`);
}

function normalizeAuditUser(value = {}) {
  return {
    userId: value.id === undefined || value.id === null || value.id === '' ? null : Number(value.id),
    username: String(value.username || '').trim(),
    displayName: String(value.displayName || value.display_name || '').trim()
  };
}

function buildMiddleOperationLog({ operator, schemaTable, primaryKeyColumn, operationType, primaryValue, changes }) {
  return {
    userId: Number.isFinite(operator.userId) ? operator.userId : null,
    username: operator.username || '',
    displayName: operator.displayName || '',
    tableName: schemaTable.tableName,
    tableLabel: schemaTable.tableComment || schemaTable.tableName,
    operationType,
    primaryKeyName: primaryKeyColumn.key,
    primaryKeyValue: String(primaryValue ?? ''),
    changeJson: changes && Object.keys(changes).length ? JSON.stringify(changes) : null
  };
}

async function insertMiddleOperationLogs(conn, logs) {
  if (!logs.length) return;
  await conn.execute(
    `INSERT INTO middle_operation_log (
      user_id,
      username,
      display_name,
      table_name,
      table_label,
      operation_type,
      primary_key_name,
      primary_key_value,
      change_json
    ) VALUES ${logs.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    logs.flatMap(log => [
      log.userId,
      log.username,
      log.displayName,
      log.tableName,
      log.tableLabel,
      log.operationType,
      log.primaryKeyName,
      log.primaryKeyValue,
      log.changeJson
    ])
  );
}

async function ensureTableViewConfigTable(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS cw_table_view_config (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    table_name VARCHAR(100) NOT NULL COMMENT '数据库表名',
    table_label VARCHAR(100) NOT NULL DEFAULT '' COMMENT '表中文显示名',
    is_visible TINYINT NOT NULL DEFAULT 0 COMMENT '是否在中台显示：0不显示，1显示',
    visible_fields JSON NULL COMMENT '中台显示字段列表',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '显示排序',
    UNIQUE KEY uk_table_name (table_name)
  ) DEFAULT CHARSET=utf8mb4 COMMENT='中台表格显示配置'`);
}

async function ensureFieldOptionConfigTable(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS cw_field_option_config (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    table_name VARCHAR(100) NOT NULL COMMENT '数据库表名',
    column_name VARCHAR(100) NOT NULL COMMENT '数据库字段名',
    options_json JSON NULL COMMENT '字段选项配置',
    UNIQUE KEY uk_table_column (table_name, column_name)
  ) DEFAULT CHARSET=utf8mb4 COMMENT='字段选项配置'`);
  const [columns] = await conn.execute(`SHOW COLUMNS FROM cw_field_option_config`);
  const names = new Set(columns.map(column => column.Field));
  if (!names.has('option_source_type')) {
    await conn.execute(`ALTER TABLE cw_field_option_config ADD COLUMN option_source_type ENUM('static','table') NOT NULL DEFAULT 'static' COMMENT '选项来源类型' AFTER options_json`);
  }
  if (!names.has('source_table_name')) {
    await conn.execute(`ALTER TABLE cw_field_option_config ADD COLUMN source_table_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '来源表名' AFTER option_source_type`);
  }
  if (!names.has('source_column_name')) {
    await conn.execute(`ALTER TABLE cw_field_option_config ADD COLUMN source_column_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '来源字段名' AFTER source_table_name`);
  }
  if (!names.has('field_kind')) {
    await conn.execute(`ALTER TABLE cw_field_option_config ADD COLUMN field_kind VARCHAR(20) NOT NULL DEFAULT '' COMMENT '字段类型标签' AFTER source_column_name`);
  }
}

async function ensureFormulaFieldConfigTable(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS cw_formula_field_config (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    table_name VARCHAR(100) NOT NULL COMMENT '数据库表名',
    column_name VARCHAR(100) NOT NULL COMMENT '数据库字段名',
    expression TEXT NULL COMMENT '公式表达式',
    dependencies_json JSON NULL COMMENT '公式依赖字段',
    is_enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
    UNIQUE KEY uk_table_column (table_name, column_name)
  ) DEFAULT CHARSET=utf8mb4 COMMENT='公式字段配置'`);
}

async function ensureDefaultTableViewConfig(conn) {
  const schemaTables = await getSchemaTables(conn);

  for (let index = 0; index < schemaTables.length; index += 1) {
    const table = schemaTables[index];
    await conn.execute(
      `INSERT IGNORE INTO cw_table_view_config (
        table_name,
        table_label,
        is_visible,
        visible_fields,
        sort_order
      ) VALUES (?, ?, 1, ?, ?)`,
      [
        table.tableName,
        table.tableComment || table.tableName,
        JSON.stringify(getConfigurableTableFields(table)),
        index + 1
      ]
    );
  }
}

function isSystemTableField(field) {
  return ['id', 'create_time', 'update_time', 'status'].includes(String(field || ''));
}

function getConfigurableTableFields(table) {
  return (table.columns || [])
    .map(column => column.key)
    .filter(field => !isSystemTableField(field));
}

async function getSchemaTables(conn) {
  await ensureFieldOptionConfigTable(conn);
  await ensureFormulaFieldConfigTable(conn);
  const configTablePlaceholders = CONFIG_TABLES.map(() => '?').join(', ');
  const [tableRows] = await conn.execute(`
    SELECT TABLE_NAME AS tableName, TABLE_COMMENT AS tableComment
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      AND (TABLE_NAME LIKE 'cw\\_%' OR TABLE_NAME LIKE 'tp\\_%')
      AND TABLE_NAME NOT IN (${configTablePlaceholders})
    ORDER BY TABLE_NAME
  `, CONFIG_TABLES);

  const [columnRows] = await conn.execute(`
    SELECT
      TABLE_NAME AS tableName,
      COLUMN_NAME AS columnName,
      COLUMN_COMMENT AS columnComment,
      DATA_TYPE AS dataType,
      COLUMN_TYPE AS columnType,
      IS_NULLABLE AS isNullable,
      COLUMN_KEY AS columnKey,
      EXTRA AS extra,
      ORDINAL_POSITION AS ordinalPosition
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND (TABLE_NAME LIKE 'cw\\_%' OR TABLE_NAME LIKE 'tp\\_%')
      AND TABLE_NAME NOT IN (${configTablePlaceholders})
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `, CONFIG_TABLES);

  const wecomSelectOptions = await getWecomSelectOptionsByDbField();
  const configuredFieldOptions = await getConfiguredFieldOptionsByDbField(conn);
  const tableCommentByName = new Map(tableRows.map(table => [table.tableName, table.tableComment || '']));
  const columnsByTable = new Map();
  for (const column of columnRows) {
    if (!columnsByTable.has(column.tableName)) columnsByTable.set(column.tableName, []);
    const parsedEnumValues = parseEnumValues(column.columnType);
    const configuredFieldOption = configuredFieldOptions.get(`${column.tableName}::${column.columnName}`) || {};
    const configuredOptions = configuredFieldOption.options || [];
    const enumValues = parsedEnumValues.length && configuredOptions.length ? configuredOptions : parsedEnumValues;
    const selectOptions = getSelectOptionsForColumn(
      wecomSelectOptions,
      tableCommentByName.get(column.tableName),
      column.columnComment || column.columnName
    );
    const finalSelectOptions = configuredOptions.length ? configuredOptions : selectOptions;
    columnsByTable.get(column.tableName).push({
      key: column.columnName,
      label: column.columnComment || column.columnName,
      dataType: column.dataType,
      columnType: column.columnType,
      enumValues,
      selectOptions: finalSelectOptions.length ? finalSelectOptions : enumValues,
      optionConfig: configuredFieldOption.optionConfig || { type: 'static', sourceTableName: '', sourceColumnName: '' },
      fieldKind: configuredFieldOption.fieldKind || inferFieldKind({
        ...column,
        enumValues,
        selectOptions: finalSelectOptions.length ? finalSelectOptions : enumValues
      }),
      isNullable: column.isNullable === 'YES',
      columnKey: column.columnKey || '',
      extra: column.extra || '',
      isEditable: isEditableMiddleColumn(column),
      ordinalPosition: column.ordinalPosition
    });
  }

  return tableRows.map(table => ({
    tableName: table.tableName,
    tableComment: table.tableComment || '',
    columns: columnsByTable.get(table.tableName) || []
  }));
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getWecomSelectOptionsByDbField() {
  const filePath = path.join(RUNTIME_DIR, 'wecom_select_fields.json');
  const raw = await fsp.readFile(filePath, 'utf8').catch(() => '');
  if (!raw) return new Map();

  let fields = [];
  try {
    fields = JSON.parse(raw);
  } catch {
    return new Map();
  }

  const optionsByField = new Map();
  for (const field of fields) {
    if (field.sheet_visible === false) continue;
    const options = uniqueStrings((field.options || []).map(option => option.name || option.text || option.value || option.label || option));
    if (!options.length) continue;
    const tableName = cleanWecomSheetTitle(field.sheet_title || '');
    const key = `${normalizeSchemaLabel(tableName)}::${normalizeSchemaLabel(field.field_title || '')}`;
    optionsByField.set(key, options);
  }
  return optionsByField;
}

async function getConfiguredFieldOptionsByDbField(conn) {
  await ensureFieldOptionConfigTable(conn);
  const [rows] = await conn.execute(`
    SELECT
      table_name,
      column_name,
	      options_json,
	      option_source_type,
	      source_table_name,
	      source_column_name,
	      field_kind
	    FROM cw_field_option_config
  `);
  const configByField = new Map();
  for (const row of rows) {
    const optionConfig = {
      type: row.option_source_type === 'table' ? 'table' : 'static',
      sourceTableName: row.source_table_name || '',
      sourceColumnName: row.source_column_name || ''
    };
    const options = optionConfig.type === 'table'
      ? await getTableColumnOptions(conn, optionConfig.sourceTableName, optionConfig.sourceColumnName)
      : uniqueStrings(parseJsonArray(row.options_json));
	    configByField.set(`${row.table_name}::${row.column_name}`, {
	      options,
	      optionConfig,
	      fieldKind: normalizeFieldKind(row.field_kind)
	    });
  }
  return configByField;
}

async function getTableColumnOptions(conn, tableName, columnName) {
  if (!isSafeDbIdentifier(tableName) || !isSafeDbIdentifier(columnName)) return [];
  const [rows] = await conn.query(`
    SELECT DISTINCT ${escapeIdentifier(columnName)} AS value
    FROM ${escapeIdentifier(tableName)}
    WHERE ${escapeIdentifier(columnName)} IS NOT NULL
      AND CAST(${escapeIdentifier(columnName)} AS CHAR) <> ''
      ${tableName === USER_TABLE ? 'AND status = 1' : ''}
    ORDER BY ${escapeIdentifier(columnName)} ASC
    LIMIT 1000
  `);
  return uniqueStrings(rows.map(row => row.value));
}

function isSafeDbIdentifier(value) {
  return /^[a-zA-Z0-9_]+$/.test(String(value || ''));
}

function normalizeFieldKind(value) {
  const kind = String(value || '').trim();
  return ['single', 'multi', 'text', 'date', 'image', 'file', 'relation', 'calc'].includes(kind) ? kind : '';
}

function shouldPersistFieldKind(kind) {
  return Boolean(kind) && !['text', 'date'].includes(kind);
}

function inferFieldKind(column) {
  const dataType = String(column?.dataType || '').toLowerCase();
  const columnType = String(column?.columnType || '').toLowerCase();
  const text = `${column?.columnName || ''} ${column?.columnComment || ''}`.toLowerCase();
  if (isImageLikeFieldText(text)) return 'image';
  if (isFileLikeFieldText(text)) return 'file';
  if (dataType === 'json' || columnType === 'json') return 'multi';
  if (column?.enumValues?.length || column?.selectOptions?.length) return 'single';
  if (['date', 'datetime', 'timestamp'].includes(dataType)) return 'date';
  return 'text';
}

function isImageLikeFieldText(text) {
  return ['image', 'img', 'photo', 'photos', 'picture', 'pictures', '图片', '照片', '影像'].some(token => text.includes(token));
}

function isFileLikeFieldText(text) {
  return ['file', 'attachment', 'attachments', '文件', '附件', '凭证', '票据', '保单'].some(token => text.includes(token));
}

async function getFormulaConfigsByTable(conn, schemaTables) {
  await ensureFormulaFieldConfigTable(conn);
  const [rows] = await conn.execute(`
    SELECT table_name, column_name, expression, dependencies_json, is_enabled
    FROM cw_formula_field_config
    WHERE is_enabled = 1
  `);
  const schemaByTable = new Map(schemaTables.map(table => [table.tableName, table]));
  const configsByTable = new Map();

  for (const row of rows) {
    const schemaTable = schemaByTable.get(row.table_name);
    if (!schemaTable) continue;
    const schemaColumn = schemaTable.columns.find(column => column.key === row.column_name);
    if (!schemaColumn) continue;
    const config = normalizeFormulaConfig(row);
    if (!config.expression) continue;
    if (!configsByTable.has(row.table_name)) configsByTable.set(row.table_name, []);
    configsByTable.get(row.table_name).push({
      ...config,
      columnName: row.column_name
    });
  }

  return configsByTable;
}

async function getFormulaConfigsForTable(conn, schemaTable) {
  const configsByTable = await getFormulaConfigsByTable(conn, [schemaTable]);
  return configsByTable.get(schemaTable.tableName) || [];
}

function normalizeFormulaConfig(rowOrConfig) {
  const expression = String(rowOrConfig?.expression || '').trim();
  const dependenciesJson = rowOrConfig?.dependencies_json ?? rowOrConfig?.dependenciesJson;
  return {
    expression,
    dependencies: parseFormulaDependencies(dependenciesJson),
    isEnabled: rowOrConfig?.is_enabled === undefined ? rowOrConfig?.isEnabled !== false : Boolean(rowOrConfig.is_enabled)
  };
}

function parseFormulaDependencies(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function attachFormulaConfigsToColumns(table, formulaConfigs) {
  const configByColumn = new Map(formulaConfigs.map(config => [config.columnName, config]));
  return table.columns.map(column => {
    const config = configByColumn.get(column.key);
    if (!config) return column;
    return {
      ...column,
      fieldKind: column.fieldKind || 'calc',
      formulaConfig: {
        expression: config.expression,
        dependencies: config.dependencies,
        isEnabled: true
      }
    };
  });
}

async function saveFormulaColumnConfig(conn, schemaTable, schemaColumn, submittedConfig, schemaMap = new Map()) {
  const expression = String(submittedConfig?.expression || '').trim();
  const shouldDelete = !submittedConfig || submittedConfig.isEnabled === false || !expression;

  if (shouldDelete) {
    await conn.execute(
      `DELETE FROM cw_formula_field_config WHERE table_name = ? AND column_name = ?`,
      [schemaTable.tableName, schemaColumn.key]
    );
    return;
  }

  const dependencies = extractFormulaDependencies(expression);
  validateFormulaDependencies(schemaTable, schemaColumn, dependencies, schemaMap);
  validateFormulaExpressionText(expression);

  await conn.execute(
    `INSERT INTO cw_formula_field_config (
      table_name,
      column_name,
      expression,
      dependencies_json,
      is_enabled
    ) VALUES (?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
      expression = VALUES(expression),
      dependencies_json = VALUES(dependencies_json),
      is_enabled = VALUES(is_enabled)`,
    [schemaTable.tableName, schemaColumn.key, expression, JSON.stringify(dependencies)]
  );
}

function validateFormulaExpressionText(expression) {
  const withoutTokens = expression.replace(/\{[^{}]+\}/g, '');
  if (/[^0-9+\-*/().,\s]/.test(withoutTokens)) {
    throw new Error('公式只能包含字段、数字、加减乘除和括号');
  }
}

function extractFormulaDependencies(expression) {
  const dependencies = [];
  const seen = new Set();
  const tokenPattern = /\{([^{}]+)\}/g;
  let match;
  while ((match = tokenPattern.exec(expression))) {
    const dependency = parseFormulaToken(match[1]);
    const key = `${dependency.tableName || 'this'}::${dependency.columnName}::${dependency.aggregate || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dependencies.push(dependency);
  }
  return dependencies;
}

function parseFormulaToken(token) {
  const parts = String(token || '').split('.').map(part => part.trim()).filter(Boolean);
  if (parts.length === 1) {
    return { scope: 'current', tableName: '', columnName: parts[0], aggregate: '' };
  }
  if (parts.length === 2 && parts[0] === 'this') {
    return { scope: 'current', tableName: '', columnName: parts[1], aggregate: '' };
  }
  if (parts.length === 3) {
    return { scope: 'table', tableName: parts[0], columnName: parts[1], aggregate: parts[2] };
  }
  throw new Error(`公式字段引用格式无效：{${token}}`);
}

function validateFormulaDependencies(schemaTable, schemaColumn, dependencies, schemaMap = new Map()) {
  const currentColumns = new Set(schemaTable.columns.map(column => column.key));
  const allowedAggregates = new Set(['sum', 'avg', 'count', 'max', 'min', 'first']);
  if (!dependencies.length) {
    throw new Error('公式至少需要引用一个字段');
  }

  for (const dependency of dependencies) {
    if (dependency.scope === 'current') {
      if (!currentColumns.has(dependency.columnName)) {
        throw new Error(`公式引用了不存在的本表字段：${dependency.columnName}`);
      }
      if (dependency.columnName === schemaColumn.key) {
        throw new Error('公式字段不能引用自己');
      }
      continue;
    }

    if (!allowedAggregates.has(dependency.aggregate)) {
      throw new Error(`其他表字段必须选择聚合方式：${dependency.tableName}.${dependency.columnName}`);
    }
    const foreignTable = schemaMap.get(dependency.tableName);
    if (!foreignTable) {
      throw new Error(`公式引用了不存在的其他表：${dependency.tableName}`);
    }
    if (!foreignTable.columns.some(column => column.key === dependency.columnName)) {
      throw new Error(`公式引用了不存在的其他表字段：${dependency.tableName}.${dependency.columnName}`);
    }
  }
}

async function syncFormulaView(conn, schemaTable, formulaConfigs) {
  const viewName = getFormulaViewName(schemaTable.tableName);
  const formulaByColumn = new Map(formulaConfigs.map(config => [config.columnName, config]));
  const selectParts = schemaTable.columns.map(column => {
    const config = formulaByColumn.get(column.key);
    if (!config) return `base.${escapeIdentifier(column.key)} AS ${escapeIdentifier(column.key)}`;
    const expressionSql = buildFormulaSqlExpression(schemaTable, config.expression);
    const emptyCheck = `base.${escapeIdentifier(column.key)} IS NULL OR CAST(base.${escapeIdentifier(column.key)} AS CHAR) = ''`;
    return `IF(${emptyCheck}, ${expressionSql}, base.${escapeIdentifier(column.key)}) AS ${escapeIdentifier(column.key)}`;
  });

  await conn.query(`
    CREATE OR REPLACE VIEW ${escapeIdentifier(viewName)} AS
    SELECT ${selectParts.join(', ')}
    FROM ${escapeIdentifier(schemaTable.tableName)} base
  `);

  return viewName;
}

async function dropFormulaView(conn, tableName) {
  await conn.query(`DROP VIEW IF EXISTS ${escapeIdentifier(getFormulaViewName(tableName))}`);
}

async function attachFormulaRawValues(conn, schemaTable, primaryKeyColumn, formulaConfigs, rows) {
  if (!formulaConfigs.length || !primaryKeyColumn || !rows.length) return rows;
  const formulaColumns = formulaConfigs.map(config => config.columnName);
  const ids = rows
    .map(row => row[primaryKeyColumn.key])
    .filter(value => value !== undefined && value !== null && String(value) !== '');
  if (!ids.length) return rows;

  const rawSelect = [primaryKeyColumn.key, ...formulaColumns]
    .map(columnName => escapeIdentifier(columnName))
    .join(', ');
  const [rawRows] = await conn.query(
    `SELECT ${rawSelect}
     FROM ${escapeIdentifier(schemaTable.tableName)}
     WHERE ${escapeIdentifier(primaryKeyColumn.key)} IN (${ids.map(() => '?').join(', ')})`,
    ids
  );
  const rawById = new Map(rawRows.map(row => [String(row[primaryKeyColumn.key]), row]));

  return rows.map(row => {
    const raw = rawById.get(String(row[primaryKeyColumn.key]));
    if (!raw) return row;
    const formulaRaw = {};
    for (const columnName of formulaColumns) {
      formulaRaw[columnName] = raw[columnName];
    }
    return {
      ...row,
      __formulaRaw: formulaRaw
    };
  });
}

function getFormulaViewName(tableName) {
  const safe = String(tableName || '').replace(/[^a-zA-Z0-9_]/g, '_');
  return `${FORMULA_VIEW_PREFIX}${safe}`;
}

function buildFormulaSqlExpression(schemaTable, expression) {
  validateFormulaExpressionText(expression);
  return expression.replace(/\{([^{}]+)\}/g, (_, token) => {
    const dependency = parseFormulaToken(token);
    if (dependency.scope === 'current') {
      if (!schemaTable.columns.some(column => column.key === dependency.columnName)) {
        throw new Error(`公式引用了不存在的本表字段：${dependency.columnName}`);
      }
      return `COALESCE(base.${escapeIdentifier(dependency.columnName)}, 0)`;
    }
    return buildFormulaAggregateSql(dependency);
  });
}

function buildFormulaAggregateSql(dependency) {
  const tableName = escapeIdentifier(dependency.tableName);
  const columnName = escapeIdentifier(dependency.columnName);
  if (dependency.aggregate === 'count') {
    return `(SELECT COUNT(${columnName}) FROM ${tableName})`;
  }
  if (dependency.aggregate === 'sum') {
    return `(SELECT COALESCE(SUM(${columnName}), 0) FROM ${tableName})`;
  }
  if (dependency.aggregate === 'avg') {
    return `(SELECT COALESCE(AVG(${columnName}), 0) FROM ${tableName})`;
  }
  if (dependency.aggregate === 'max') {
    return `(SELECT COALESCE(MAX(${columnName}), 0) FROM ${tableName})`;
  }
  if (dependency.aggregate === 'min') {
    return `(SELECT COALESCE(MIN(${columnName}), 0) FROM ${tableName})`;
  }
  if (dependency.aggregate === 'first') {
    return `(SELECT ${columnName} FROM ${tableName} LIMIT 1)`;
  }
  throw new Error(`未知公式聚合方式：${dependency.aggregate}`);
}

async function getMiddleUpdateBaseRows(conn, schemaTable, primaryKeyColumn, updates, formulaConfigs) {
  if (!formulaConfigs.length || !updates.length) return new Map();
  const ids = uniqueStrings(
    updates
      .map(update => update?.primaryKey?.value)
      .filter(value => value !== undefined && value !== null && String(value) !== '')
      .map(String)
  );
  if (!ids.length) return new Map();

  const [rows] = await conn.query(
    `SELECT *
     FROM ${escapeIdentifier(schemaTable.tableName)}
     WHERE ${escapeIdentifier(primaryKeyColumn.key)} IN (${ids.map(() => '?').join(', ')})`,
    ids
  );
  return new Map(rows.map(row => [String(row[primaryKeyColumn.key]), row]));
}

async function getMiddleDeleteBaseRows(conn, schemaTable, primaryKeyColumn, deletes) {
  if (!deletes.length) return new Map();
  const ids = uniqueStrings(
    deletes
      .map(item => item?.primaryKey?.value)
      .filter(value => value !== undefined && value !== null && String(value) !== '')
      .map(String)
  );
  if (!ids.length) return new Map();

  const [rows] = await conn.query(
    `SELECT *
     FROM ${escapeIdentifier(schemaTable.tableName)}
     WHERE ${escapeIdentifier(primaryKeyColumn.key)} IN (${ids.map(() => '?').join(', ')})`,
    ids
  );
  return new Map(rows.map(row => [String(row[primaryKeyColumn.key]), row]));
}

function applyServerFormulaChanges(schemaTable, formulaConfigs, changes, baseRow = {}, options = {}) {
  if (!formulaConfigs.length) return;
  for (const config of formulaConfigs) {
    if (!config.columnName || Object.prototype.hasOwnProperty.call(changes, config.columnName)) continue;
    const dependencies = config.dependencies?.length ? config.dependencies : extractFormulaDependencies(config.expression);
    const currentDependencies = dependencies.filter(dependency => dependency.scope === 'current');
    const hasChangedDependency = currentDependencies.some(dependency =>
      Object.prototype.hasOwnProperty.call(changes, dependency.columnName)
    );
    if (!options.force && !hasChangedDependency) continue;
    if (dependencies.some(dependency => dependency.scope !== 'current')) continue;

    const row = { ...baseRow, ...changes };
    const value = evaluateCurrentRowFormula(schemaTable, config.expression, row);
    if (value !== '') changes[config.columnName] = value;
  }
}

function evaluateCurrentRowFormula(schemaTable, expression, row) {
  validateFormulaExpressionText(expression);
  const currentColumns = new Set(schemaTable.columns.map(column => column.key));
  const safeExpression = expression.replace(/\{([^{}]+)\}/g, (_, token) => {
    const dependency = parseFormulaToken(token);
    if (dependency.scope !== 'current' || !currentColumns.has(dependency.columnName)) return '0';
    return String(toFormulaNumber(row[dependency.columnName]));
  });
  if (/[^0-9+\-*/().,\s]/.test(safeExpression)) return '';
  try {
    const value = Function(`"use strict"; return (${safeExpression});`)();
    if (!Number.isFinite(Number(value))) return '';
    return Number(Number(value).toFixed(2));
  } catch {
    return '';
  }
}

function toFormulaNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const normalized = String(value).replace(/,/g, '').trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function getSelectOptionsForColumn(optionsByField, tableComment, columnComment) {
  const key = `${normalizeSchemaLabel(tableComment || '')}::${normalizeSchemaLabel(columnComment || '')}`;
  return optionsByField.get(key) || [];
}

function cleanWecomSheetTitle(value) {
  return String(value || '')
    .replace(/（.*?）|\(.*?\)/g, '')
    .replace(/车辆维修成本表/g, '维修成本表')
    .replace(/保险&续费记录/g, '保险续费记录')
    .trim();
}

function normalizeSchemaLabel(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[：:，,。；;、（）()[\]【】&]/g, '')
    .replace(/台帐/g, '台账')
    .replace(/帐/g, '账')
    .replace(/对帐/g, '对账')
    .replace(/车辆维修成本表/g, '维修成本表')
    .replace(/车辆异常ing/g, '车辆异常')
    .replace(/保险续费记录/g, '保险续费记录')
    .replace(/保险续费记录/g, '保险续费记录')
    .replace(/车队长是填写完成/g, '车队长是否填写完成')
    .replace(/表$/, '')
    .toLowerCase();
}

function uniqueStrings(values) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

function isConfigurableSelectColumn(column) {
  if (column?.enumValues?.length) return true;
  return column?.dataType === 'json' && Array.isArray(column.selectOptions) && column.selectOptions.length > 0;
}

function isConfigurableOptionColumn(column) {
  return ['varchar', 'char', 'text', 'mediumtext', 'longtext'].includes(String(column?.dataType || '').toLowerCase());
}

function normalizeSubmittedOptionConfig(config) {
  if (config?.type === 'table') {
    return {
      type: 'table',
      sourceTableName: String(config.sourceTableName || '').trim(),
      sourceColumnName: String(config.sourceColumnName || '').trim()
    };
  }
  return { type: 'static', sourceTableName: '', sourceColumnName: '' };
}

async function saveFieldKindOnlyConfig(conn, tableName, columnName, fieldKind) {
  if (!fieldKind) return;
  await conn.execute(
    `INSERT INTO cw_field_option_config (
      table_name,
      column_name,
      options_json,
      option_source_type,
      source_table_name,
      source_column_name,
      field_kind
    ) VALUES (?, ?, NULL, 'static', '', '', ?)
    ON DUPLICATE KEY UPDATE
      field_kind = VALUES(field_kind)`,
    [tableName, columnName, fieldKind]
  );
}

function parseEnumValues(columnType) {
  const raw = String(columnType || '');
  if (!raw.startsWith('enum(')) return [];
  const body = raw.slice(5, -1);
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === "'" && body[index - 1] !== '\\') {
      quoted = !quoted;
      if (!quoted) {
        values.push(current.replace(/\\'/g, "'"));
        current = '';
      }
      continue;
    }
    if (quoted) current += char;
  }

  return values;
}

function isEditableMiddleColumn(column) {
  const key = column.columnName;
  const extra = String(column.extra || '').toLowerCase();
  if (column.columnKey === 'PRI') return false;
  if (extra.includes('auto_increment') || extra.includes('generated')) return false;
  if (['id', 'create_time', 'update_time'].includes(key)) return false;
  return true;
}

function getPrimaryKeyColumn(schemaTable) {
  return schemaTable.columns.find(column => column.columnKey === 'PRI')
    || schemaTable.columns.find(column => column.key === 'id')
    || null;
}

function normalizeMiddleCellValue(column, rawValue) {
  if (['image', 'file'].includes(column.fieldKind)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return column.isNullable ? { value: null } : { value: JSON.stringify([]) };
    }
    if (typeof rawValue === 'string') {
      const value = rawValue.trim();
      if (!value) return column.isNullable ? { value: null } : { value: JSON.stringify([]) };
      try {
        JSON.parse(value);
        return { value };
      } catch {
        return { value: JSON.stringify([{ name: value.split('/').pop() || value, url: value }]) };
      }
    }
    return { value: JSON.stringify(rawValue) };
  }

  if (column.dataType === 'json' && !isJsonSelectColumn(column)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return column.isNullable ? { value: null } : { value: JSON.stringify([]) };
    }
    if (typeof rawValue === 'string') {
      const value = rawValue.trim();
      if (!value) return column.isNullable ? { value: null } : { value: JSON.stringify([]) };
      try {
        JSON.parse(value);
        return { value };
      } catch {
        return { value: JSON.stringify([value]) };
      }
    }
    return { value: JSON.stringify(rawValue) };
  }

  const value = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
  if (value === '') {
    return column.isNullable ? { value: null } : { value: '' };
  }

  if (column.enumValues?.length && !column.enumValues.includes(value)) {
    return { error: `只能选择：${column.enumValues.join('、')}` };
  }

  if (isJsonSelectColumn(column)) {
    const values = parseSubmittedMultiSelectValue(rawValue);
    const invalid = values.filter(item => !column.selectOptions.includes(item));
    if (invalid.length) return { error: `只能选择：${column.selectOptions.join('、')}` };
    if (!values.length) return column.isNullable ? { value: null } : { value: JSON.stringify([]) };
    return { value: JSON.stringify(values) };
  }

  if (isSingleSelectColumn(column) && !column.selectOptions.includes(value)) {
    return { error: `只能选择：${column.selectOptions.join('、')}` };
  }

  if (['int', 'bigint', 'smallint', 'mediumint', 'tinyint'].includes(column.dataType)) {
    if (!/^-?\d+$/.test(value)) return { error: '只能填写整数' };
    return { value: Number(value) };
  }

  if (['decimal', 'float', 'double'].includes(column.dataType)) {
    if (!/^-?\d+(\.\d+)?$/.test(value)) return { error: '只能填写数字' };
    return { value };
  }

  if (column.dataType === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: '日期格式必须是 YYYY-MM-DD' };
    return { value };
  }

  if (['datetime', 'timestamp'].includes(column.dataType)) {
    if (!/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(value)) {
      return { error: '时间格式必须是 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss' };
    }
    return { value };
  }

  return { value };
}

function isJsonSelectColumn(column) {
  return column?.dataType === 'json' && Array.isArray(column.selectOptions) && column.selectOptions.length > 0;
}

function isSingleSelectColumn(column) {
  if (!Array.isArray(column?.selectOptions) || !column.selectOptions.length) return false;
  return column.dataType !== 'json' && !column.enumValues?.length;
}

function parseSubmittedMultiSelectValue(value) {
  if (Array.isArray(value)) return uniqueStrings(value);
  if (value === undefined || value === null || value === '') return [];

  const text = String(value).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return uniqueStrings(parsed);
  } catch {}
  return uniqueStrings(text.split(/[,，、;；\n\r]+/g));
}

function formatSelectColumn(column) {
  const name = escapeIdentifier(column.key);
  if (['date', 'datetime', 'timestamp'].includes(column.dataType)) {
    const format = column.dataType === 'date' ? '%Y-%m-%d' : '%Y-%m-%d %H:%i:%s';
    return `DATE_FORMAT(${name}, '${format}') AS ${name}`;
  }
  return name;
}

function buildMiddleTableOrderSql(tableName, columns) {
  const columnKeys = new Set(columns.map(column => column.key));
  if (tableName === 'cw_cxcsb' && columnKeys.has('vehicle_id')) {
    return 'ORDER BY vehicle_id + 0, vehicle_id, plate_number';
  }
  if (tableName === 'cw_ndlrb' && columnKeys.has('rq')) {
    return 'ORDER BY rq ASC, id ASC';
  }
  if (columnKeys.has('create_time') && columnKeys.has('id')) return 'ORDER BY create_time ASC, id ASC';
  if (columnKeys.has('create_time')) return 'ORDER BY create_time ASC';
  if (columnKeys.has('id')) return 'ORDER BY id ASC';
  return '';
}

function escapeIdentifier(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

async function ensureStatementTable(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS tp_dzd (
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

async function readWecomWebhook() {
  const config = await readAppConfig();
  return String(config.wecom?.webhook || '').trim();
}

async function writeWecomWebhook(webhook) {
  const config = await readAppConfig();
  config.wecom = {
    ...(config.wecom || {}),
    webhook
  };
  await writeAppConfig(config);
  return readWecomWebhook();
}

async function ensureAppDirs() {
  await fsp.mkdir(RUNTIME_DIR, { recursive: true });
  await fsp.mkdir(path.join(CREATE_FILE_ROOT, '_tmp'), { recursive: true });
  await Promise.all(
    Object.values(RECEIPT_DIR_NAMES).map(dirName =>
      fsp.mkdir(path.join(CREATE_FILE_ROOT, dirName), { recursive: true })
    )
  );
}

async function getHealthStatus() {
  const checks = {};

  checks.build = {
    ok: fs.existsSync(path.join(DIST_DIR, 'index.html')),
    path: path.relative(ROOT_DIR, DIST_DIR)
  };

  checks.appConfig = {
    ok: fs.existsSync(path.join(ROOT_DIR, 'app_config.json'))
  };

  try {
    const config = await readAppConfig();
    const mysqlConfig = config.mysql || {};
    checks.mysqlConfig = {
      ok: Boolean(mysqlConfig.host && mysqlConfig.database && mysqlConfig.user),
      host: mysqlConfig.host || '',
      port: mysqlConfig.port || 3306,
      database: mysqlConfig.database || ''
    };
    checks.wecomConfig = {
      ok: true,
      configured: Boolean(config.wecom?.webhook)
    };
  } catch (error) {
    checks.mysqlConfig = { ok: false, error: error?.message || String(error) };
    checks.wecomConfig = { ok: true, configured: false };
  }

  checks.skills = Object.fromEntries(
    Object.entries(SKILLS).map(([type, skill]) => [
      type,
      {
        ok: fs.existsSync(skill.file),
        file: path.relative(ROOT_DIR, skill.file)
      }
    ])
  );

  checks.createFileDirs = Object.fromEntries(
    Object.entries(RECEIPT_DIR_NAMES).map(([type, dirName]) => {
      const dirPath = path.join(CREATE_FILE_ROOT, dirName);
      return [
        type,
        {
          ok: fs.existsSync(dirPath),
          path: path.relative(ROOT_DIR, dirPath)
        }
      ];
    })
  );

  checks.runtime = {
    ok: fs.existsSync(RUNTIME_DIR),
    path: path.relative(ROOT_DIR, RUNTIME_DIR)
  };

  checks.chrome = {
    ok: Boolean(findExecutable(process.env.CHROME_PATH, [
      '/snap/bin/chromium',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ]))
  };

  checks.webpConverter = {
    ok: Boolean(findExecutable(process.env.CWEBP_PATH, [
      '/usr/bin/cwebp',
      '/usr/local/bin/cwebp',
      '/opt/homebrew/bin/cwebp'
    ]))
  };

  const ok = Object.values(checks).every(check => {
    if (check && typeof check === 'object' && 'ok' in check) return check.ok;
    if (check && typeof check === 'object') {
      return Object.values(check).every(item => !item || typeof item !== 'object' || item.ok !== false);
    }
    return true;
  });

  return {
    ok,
    service: 'mango-money',
    port: PORT,
    host: HOST,
    checks
  };
}

function findExecutable(preferred, candidates) {
  const allCandidates = [preferred, ...candidates].filter(Boolean);
  for (const candidate of allCandidates) {
    try {
      execFileSync('test', ['-x', candidate], { stdio: 'ignore' });
      return candidate;
    } catch {}
  }
  return '';
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
  const markerValue = `${skillStat.mtimeMs}:${skill.patchRuntime ? 'chrome-runtime-patch-v14-font-embed' : 'runtime-v2-font-embed'}`;
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

async function readJsonBody(req, limit = DEFAULT_JSON_BODY_LIMIT) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error(`请求内容过大，当前接口限制 ${formatByteSize(limit)}`);
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function formatByteSize(bytes) {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
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
  const filePath = await resolveExistingCreateFile(relative);

  if (!filePath) {
    sendText(res, 'Not found', 404);
    return;
  }

  const safeRelative = path.relative(CREATE_FILE_ROOT, filePath);
  if (safeRelative.startsWith('..') || path.isAbsolute(safeRelative)) {
    sendText(res, 'Forbidden', 403);
    return;
  }

  await sendFile(filePath, res);
}

async function serveHistoryImage(url, res) {
  const type = String(url.searchParams.get('type') || '').trim();
  const date = String(url.searchParams.get('date') || '').trim();
  const name = String(url.searchParams.get('name') || '').trim();

  if (!RECEIPT_DIR_NAMES[type] || !date || !name) {
    sendText(res, 'Not found', 404);
    return;
  }

  const candidates = [
    path.join(CREATE_FILE_ROOT, RECEIPT_DIR_NAMES[type], date, name),
    path.join(CREATE_FILE_ROOT, LEGACY_RECEIPT_DIR_NAMES[type] || '', date, name)
  ];

  for (const candidate of candidates) {
    const filePath = path.normalize(candidate);
    const relative = path.relative(CREATE_FILE_ROOT, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
    const stat = await fsp.stat(filePath).catch(() => null);
    if (stat?.isFile()) {
      await sendFile(filePath, res);
      return;
    }
  }

  sendText(res, 'Not found', 404);
}

async function resolveExistingCreateFile(relative) {
  const candidates = getCreateFileCandidates(relative);
  for (const candidate of candidates) {
    const stat = await fsp.stat(candidate).catch(() => null);
    if (stat?.isFile()) return candidate;
  }
  return '';
}

function resolveCreateFileCandidate(relative) {
  const candidates = getCreateFileCandidates(relative);
  if (!candidates.length) throw new Error('图片路径无效');
  return candidates[0];
}

function getCreateFileCandidates(relative) {
  const cleanRelative = path.normalize(relative);
  const direct = path.normalize(path.join(CREATE_FILE_ROOT, cleanRelative));
  const safeRelative = path.relative(CREATE_FILE_ROOT, direct);
  if (safeRelative.startsWith('..') || path.isAbsolute(safeRelative)) return [];

  const parts = cleanRelative.split(path.sep).filter(Boolean);
  const candidates = [direct];

  if (parts.length === 3) {
    const [typeDir, date, fileName] = parts;
    const legacyTypeDir = Object.entries(RECEIPT_DIR_NAMES).find(([, value]) => value === typeDir)?.[0];
    if (legacyTypeDir && LEGACY_RECEIPT_DIR_NAMES[legacyTypeDir]) {
      candidates.push(path.join(CREATE_FILE_ROOT, LEGACY_RECEIPT_DIR_NAMES[legacyTypeDir], date, fileName));
    }
    const newTypeDir = Object.entries(LEGACY_RECEIPT_DIR_NAMES).find(([, value]) => value === typeDir)?.[0];
    if (newTypeDir && RECEIPT_DIR_NAMES[newTypeDir]) {
      candidates.push(path.join(CREATE_FILE_ROOT, RECEIPT_DIR_NAMES[newTypeDir], date, fileName));
    }
  }

  if (parts.length === 2) {
    const [date, fileName] = parts;
    for (const typeDir of [...Object.values(RECEIPT_DIR_NAMES), ...Object.values(LEGACY_RECEIPT_DIR_NAMES)]) {
      candidates.push(path.join(CREATE_FILE_ROOT, typeDir, date, fileName));
    }
  }

  return candidates;
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
