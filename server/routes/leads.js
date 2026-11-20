import { Router } from 'express';
import { requirePermission } from '../auth/access.js';
import { pool } from '../db/pool.js';
import { HttpError } from '../lib/mapping.js';

// Leads = the imported Excel records (read-only). 300k+ rows, so searching, filtering and paging all happen in MySQL.
const router = Router();
const handler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const TEXT_COLS = ['l.machine', 'l.location', 'l.coming', 'l.email', 'l.date_text', 'l.contact', 'l.sno'];
const MAX_PAGE_SIZE = 200;
const SORTS = {
    source: 'l.id ASC',
    newest: 'l.id DESC',
    date: 'l.lead_date IS NULL, l.lead_date DESC, l.id ASC'
};
const like = (s) => `%${String(s).replace(/[\\%_]/g, '\\$&')}%`;
const flag = (v) => v === '1' || v === 'true';

// Every filter is optional. Search words must all match; a word of 6+ digits is looked up in the phone index.
function buildWhere(query) {
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
    // Leads whose number also appears on another row.
    if (flag(query.repeated)) where.push('l.has_repeat = 1');
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const toApi = (r) => ({
    id: Number(r.id), sheet: r.source_sheet, row: r.source_row, sno: r.sno, dateText: r.date_text, leadDate: r.lead_date,
    machine: r.machine, location: r.location, coming: r.coming, contact: r.contact, email: r.email
});

// Each phone of the given leads, with how many leads share that number.
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

// GET /api/leads/query?q=&sheet=&machine=&location=&coming=&email=yes|no&phone=yes|no&dateFrom=&dateTo=&hasDate=1&repeated=1&sort=&page=&pageSize=
router.get('/query', requirePermission('leads.view'), handler(async (req, res) => {
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 50, 1), MAX_PAGE_SIZE);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const order = SORTS[req.query.sort] || SORTS.source;
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

// GET /api/leads/export?<same filters> -> CSV of every matching lead (streamed in chunks)
router.get('/export', requirePermission('leads.export'), handler(async (req, res) => {
    const { sql, params } = buildWhere(req.query);
    const csv = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.write('﻿Sheet,Row,Sno,Date / tag,Machine,Location,Coming,Contact,Email\r\n');

    let lastId = 0;
    let closed = false;
    res.on('close', () => { closed = true; });
    for (;;) {
        const keyset = sql ? `${sql} AND l.id > ?` : 'WHERE l.id > ?';
        const [rows] = await pool.query(`SELECT l.* FROM leads l ${keyset} ORDER BY l.id ASC LIMIT 5000`, [...params, lastId]);
        if (rows.length === 0 || closed) break;
        res.write(rows.map((r) => [r.source_sheet, r.source_row, r.sno, r.date_text, r.machine, r.location, r.coming, r.contact, r.email].map(csv).join(',')).join('\r\n') + '\r\n');
        lastId = Number(rows[rows.length - 1].id);
    }
    res.end();
}));

// GET /api/leads/:id -> the lead, its phones, and the other rows that share one of its numbers
router.get('/:id', requirePermission('leads.view'), handler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) throw new HttpError(404, 'Lead not found');
    const [[row]] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!row) throw new HttpError(404, 'Lead not found');
    const lead = toApi(row);
    lead.phones = (await phonesFor([lead.id])).get(lead.id) || [];
    const [others] = await pool.query(
        `SELECT DISTINCT l.* FROM lead_phones p
         JOIN lead_phones q ON q.phone = p.phone AND q.lead_id <> p.lead_id
         JOIN leads l ON l.id = q.lead_id
         WHERE p.lead_id = ? ORDER BY l.id LIMIT 100`, [lead.id]
    );
    res.json({ ...lead, sameNumber: others.map(toApi) });
}));

export default router;
export { buildWhere };
