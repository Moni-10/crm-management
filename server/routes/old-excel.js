import express, { Router } from 'express';
import XLSX from 'xlsx';
import { requirePermission } from '../auth/access.js';
import { pool } from '../db/pool.js';
import { refreshLeadFlags } from '../db/lead-flags.js';
import { importWorkbook } from '../lib/lead-import.js';
import { logActivity } from '../lib/activity.js';
import { HttpError } from '../lib/mapping.js';

// "Old Excel Data": the imported Excel records (follow-ups). 300k+ rows are expected, so searching,
// filtering and paging all happen in MySQL. Rows are stored exactly as they were in the sheets.
const router = Router();
const handler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const TEXT_COLS = ['l.machine', 'l.location', 'l.coming', 'l.email', 'l.date_text', 'l.contact', 'l.sno'];
const MAX_PAGE_SIZE = 200;
// newest = the last entry of the Excel on top (follow-ups are added at the bottom of the sheet).
const SORTS = {
    newest: 'l.id DESC',
    source: 'l.id ASC',
    date: 'l.lead_date IS NULL, l.lead_date DESC, l.id DESC'
};
const like = (s) => `%${String(s).replace(/[\\%_]/g, '\\$&')}%`;
const flag = (v) => v === '1' || v === 'true';

// Every filter is optional. Search words must all match; a word of 6+ digits is looked up in the phone index.
export function buildWhere(query) {
    const where = [];
    const params = [];
    const words = String(query.q || '').trim().split(/\s+/).filter(Boolean).slice(0, 6);
    for (const word of words) {
        const digits = word.replace(/\D/g, '');
        if (digits.length >= 6 && digits.length === word.replace(/[\s+-]/g, '').length) {
            where.push('l.id IN (SELECT lead_id FROM lead_phones WHERE phone LIKE ?)');
            params.push(`%${digits}%`);
        } else {
            where.push(`(${TEXT_COLS.map((c) => `${c} LIKE ?`).join(' OR ')})`);
            TEXT_COLS.forEach(() => params.push(like(word)));
        }
    }
    if (query.sheet) { where.push('l.source_sheet = ?'); params.push(query.sheet); }
    if (/^\d+$/.test(String(query.batch || ''))) { where.push('l.batch_id = ?'); params.push(Number(query.batch)); }
    for (const [key, col] of [['machine', 'l.machine'], ['location', 'l.location'], ['coming', 'l.coming']]) {
        if (String(query[key] || '').trim()) { where.push(`${col} LIKE ?`); params.push(like(String(query[key]).trim())); }
    }
    if (query.email === 'yes') where.push("l.email IS NOT NULL AND TRIM(l.email) <> ''");
    if (query.email === 'no') where.push("(l.email IS NULL OR TRIM(l.email) = '')");
    if (query.phone === 'yes') where.push('l.phone_count > 0');
    if (query.phone === 'no') where.push('l.phone_count = 0');
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.dateFrom || ''))) { where.push('l.lead_date >= ?'); params.push(query.dateFrom); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.dateTo || ''))) { where.push('l.lead_date <= ?'); params.push(query.dateTo); }
    if (flag(query.hasDate)) where.push('l.lead_date IS NOT NULL');
    // Entries whose number also appears on another row.
    if (flag(query.repeated)) where.push('l.has_repeat = 1');
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const toApi = (r) => ({
    id: Number(r.id), sheet: r.source_sheet, row: r.source_row, sno: r.sno, dateText: r.date_text, leadDate: r.lead_date,
    machine: r.machine, location: r.location, coming: r.coming, contact: r.contact, email: r.email
});

// Each phone of the given entries, with how many entries share that number.
async function phonesFor(ids) {
    const map = new Map(ids.map((id) => [id, []]));
    if (ids.length === 0) return map;
    const [rows] = await pool.query(
        `SELECT p.lead_id, p.phone, (SELECT COUNT(*) FROM lead_phones x WHERE x.phone = p.phone) AS cnt
         FROM lead_phones p WHERE p.lead_id IN (?) ORDER BY p.phone`, [ids]
    );
    for (const r of rows) map.get(Number(r.lead_id))?.push({ phone: r.phone, count: Number(r.cnt) });
    return map;
}

// GET /api/leads/query?q=&sheet=&batch=&machine=&location=&coming=&email=yes|no&phone=yes|no&dateFrom=&dateTo=&hasDate=1&repeated=1&sort=&page=&pageSize=
router.get('/query', requirePermission('oldexcel.view'), handler(async (req, res) => {
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 50, 1), MAX_PAGE_SIZE);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const order = SORTS[req.query.sort] || SORTS.newest;
    const { sql, params } = buildWhere(req.query);

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l ${sql}`, params);
    const [rows] = await pool.query(
        `SELECT l.* FROM leads l ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]
    );
    const items = rows.map(toApi);
    const phones = await phonesFor(items.map((i) => i.id));
    items.forEach((i) => { i.phones = phones.get(i.id) || []; });
    const [sheets] = await pool.query('SELECT source_sheet AS name, COUNT(*) AS n FROM leads GROUP BY source_sheet ORDER BY source_sheet');
    res.json({ items, total: Number(total), page, pageSize, sheets: sheets.map((s) => ({ name: s.name, count: Number(s.n) })) });
}));

// GET /api/leads/export?<same filters>&format=xlsx|csv&sort= -> every matching entry, in the chosen order
const EXPORT_HEAD = ['Sno', 'Entry no.', 'Sheet', 'Date / tag', 'Machine', 'Location', 'Coming', 'Contact', 'Email'];
const exportRow = (r) => [r.sno, r.id, r.source_sheet, r.date_text, r.machine, r.location, r.coming, r.contact, r.email];
const MAX_XLSX_ROWS = 250000;

router.get('/export', requirePermission('oldexcel.export'), handler(async (req, res) => {
    const { sql, params } = buildWhere(req.query);
    const order = SORTS[req.query.sort] || SORTS.newest;

    if (req.query.format === 'xlsx') {
        const [rows] = await pool.query(`SELECT l.* FROM leads l ${sql} ORDER BY ${order} LIMIT ?`, [...params, MAX_XLSX_ROWS + 1]);
        if (rows.length > MAX_XLSX_ROWS) {
            throw new HttpError(400, `More than ${MAX_XLSX_ROWS.toLocaleString('en-IN')} entries match. Narrow the filters, or export as CSV.`);
        }
        const sheet = XLSX.utils.aoa_to_sheet([EXPORT_HEAD, ...rows.map(exportRow)]);
        sheet['!cols'] = [8, 10, 18, 16, 30, 22, 18, 24, 30].map((wch) => ({ wch }));
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, 'Old Excel Data');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="old-excel-data.xlsx"');
        res.end(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
        return;
    }

    const csv = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="old-excel-data.csv"');
    res.write(`﻿${EXPORT_HEAD.join(',')}\r\n`);
    // Keyset paging by id keeps memory flat for any number of rows (newest = descending ids).
    const desc = req.query.sort !== 'source';
    let lastId = desc ? Number.MAX_SAFE_INTEGER : 0;
    let closed = false;
    res.on('close', () => { closed = true; });
    for (;;) {
        const keyset = `${sql ? `${sql} AND` : 'WHERE'} l.id ${desc ? '<' : '>'} ?`;
        const [rows] = await pool.query(
            `SELECT l.* FROM leads l ${keyset} ORDER BY l.id ${desc ? 'DESC' : 'ASC'} LIMIT 5000`, [...params, lastId]
        );
        if (rows.length === 0 || closed) break;
        res.write(`${rows.map((r) => exportRow(r).map(csv).join(',')).join('\r\n')}\r\n`);
        lastId = Number(rows[rows.length - 1].id);
    }
    res.end();
}));

// GET /api/leads/print?<same filters>&sort= -> the first 1000 matching entries for printing, plus the total
const MAX_PRINT = 1000;
router.get('/print', requirePermission('oldexcel.view'), handler(async (req, res) => {
    const { sql, params } = buildWhere(req.query);
    const order = SORTS[req.query.sort] || SORTS.newest;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l ${sql}`, params);
    const [rows] = await pool.query(`SELECT l.* FROM leads l ${sql} ORDER BY ${order} LIMIT ?`, [...params, MAX_PRINT]);
    res.json({ items: rows.map(toApi), total: Number(total), limit: MAX_PRINT });
}));

// GET /api/old-excel/template -> an empty Excel file in the format the import expects (header + two example rows)
router.get('/template', requirePermission('oldexcel.import'), (req, res) => {
    const sheet = XLSX.utils.aoa_to_sheet([
        ['sno.', 'date', 'machine', 'LOCATION', 'COMING', 'CONTACT', 'EMAIL ID'],
        [1, '2026-11-20', 'paper bag making machine', 'Delhi', 'neha mdm', '9810011000, 9810011001', 'example@mail.com'],
        [2, 'real 29-7', 'flexo printing machine', 'Gujarat', '', '9822227505', '']
    ]);
    sheet['!cols'] = [8, 14, 30, 16, 14, 26, 28].map((wch) => ({ wch }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Old Excel Data');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="old-excel-data-format.xlsx"');
    res.end(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
});

// POST /api/leads/import?name=<file name>   body = the raw Excel file -> { results: [{ sheet, status, rows, inserted }] }
router.post('/import', requirePermission('oldexcel.import'), express.raw({ type: () => true, limit: '400mb' }), handler(async (req, res) => {
    const name = String(req.query.name || '').split(/[\\/]/).pop().trim().slice(0, 240);
    if (!/\.(xlsx|xls|csv)$/i.test(name)) throw new HttpError(400, 'Choose an Excel file (.xlsx, .xls) or a .csv');
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, 'The file is empty');
    let results;
    try {
        results = await importWorkbook(pool, name, req.body);
    } catch (error) {
        throw new HttpError(400, `Could not read this file: ${error.message}`);
    }
    const inserted = results.reduce((n, r) => n + r.inserted, 0);
    if (inserted) logActivity('import', `${req.user.name} imported ${inserted.toLocaleString('en-IN')} entries from ${name} (Old Excel Data)`);
    res.json({ results });
}));

// GET /api/leads/batches -> what has been imported so far
router.get('/batches', requirePermission('oldexcel.view'), handler(async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM import_batches WHERE status = 'done' ORDER BY id DESC");
    res.json(rows.map((b) => ({
        id: b.id, file: b.source_file, sheet: b.source_sheet, firstEntry: b.first_row, entries: b.rows_inserted,
        importedAt: `${String(b.finished_at).replace(' ', 'T')}Z`
    })));
}));

// DELETE /api/leads/batches/:id -> removes that file's entries (e.g. to load a corrected file instead)
router.delete('/batches/:id', requirePermission('oldexcel.delete'), handler(async (req, res) => {
    const [[batch]] = await pool.query('SELECT * FROM import_batches WHERE id = ?', [req.params.id]);
    if (!batch) throw new HttpError(404, 'Import not found');
    await pool.query('DELETE FROM leads WHERE batch_id = ?', [batch.id]); // phone rows follow (cascade)
    await pool.query('DELETE FROM import_batches WHERE id = ?', [batch.id]);
    await refreshLeadFlags(pool);
    logActivity('import', `${req.user.name} removed the import of ${batch.source_file} (Old Excel Data)`);
    res.json({ success: true });
}));

// GET /api/old-excel/locate?number=<entry no.>&<same filters>&sort=newest|source&pageSize= -> { found, page, position }
router.get('/locate', requirePermission('oldexcel.view'), handler(async (req, res) => {
    const n = Number(req.query.number);
    if (!Number.isInteger(n) || n < 1) return res.json({ found: false });
    if (req.query.sort === 'date') throw new HttpError(400, 'Set the order to Newest first or Oldest first to jump to an entry number.');
    const size = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 50, 1), MAX_PAGE_SIZE);
    const { sql, params } = buildWhere(req.query);
    const glue = sql ? `${sql} AND` : 'WHERE';
    const [hit] = await pool.query(`SELECT 1 AS x FROM leads l ${glue} l.id = ? LIMIT 1`, [...params, n]);
    if (hit.length === 0) return res.json({ found: false });
    const oldestFirst = req.query.sort === 'source';
    const [[{ ahead }]] = await pool.query(`SELECT COUNT(*) AS ahead FROM leads l ${glue} l.id ${oldestFirst ? '<' : '>'} ?`, [...params, n]);
    return res.json({ found: true, page: Math.floor(Number(ahead) / size) + 1, position: Number(ahead) + 1 });
}));

// GET /api/leads/:id -> the entry, its phones, and the other entries that share one of its numbers
router.get('/:id', requirePermission('oldexcel.view'), handler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) throw new HttpError(404, 'Entry not found');
    const [[row]] = await pool.query(
        'SELECT l.*, b.source_file FROM leads l LEFT JOIN import_batches b ON b.id = l.batch_id WHERE l.id = ?', [req.params.id]
    );
    if (!row) throw new HttpError(404, 'Entry not found');
    const lead = { ...toApi(row), file: row.source_file };
    lead.phones = (await phonesFor([lead.id])).get(lead.id) || [];
    const [others] = await pool.query(
        `SELECT DISTINCT l.* FROM lead_phones p
         JOIN lead_phones q ON q.phone = p.phone AND q.lead_id <> p.lead_id
         JOIN leads l ON l.id = q.lead_id
         WHERE p.lead_id = ? ORDER BY l.id DESC LIMIT 100`, [lead.id]
    );
    res.json({ ...lead, sameNumber: others.map(toApi) });
}));

// Used by the global search box: the newest matching entries (the caller asks for one extra to know if there are more).
export async function searchEntries(term, limit) {
    const { sql, params } = buildWhere({ q: term });
    const [rows] = await pool.query(`SELECT l.* FROM leads l ${sql} ORDER BY l.id DESC LIMIT ?`, [...params, limit]);
    return rows.map(toApi);
}

export default router;
