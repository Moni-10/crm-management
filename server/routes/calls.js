import { Router } from 'express';
import { requirePermission } from '../auth/access.js';
import { pool } from '../db/pool.js';
import { logActivity } from '../lib/activity.js';
import { HttpError, fromRow, generateId, nowSql, toRow } from '../lib/mapping.js';
import { callFields } from '../resources/calls.js';

// Calling Data is meant to hold very large sheets, so the page never loads every row:
// searching, filtering and paging all happen in MySQL. (Plain CRUD for single calls lives in routes/crud.js.)
const router = Router();
const handler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// Columns a search term is matched against: every word must appear in at least one of them.
const SEARCH_COLS = ['party_name', 'nickname', 'contact_person', 'mobile', 'whatsapp', 'email', 'city', 'address', 'machine_interest', 'machine_number', 'requirement', 'handled_by'];
const MAX_PAGE_SIZE = 5000;

// handledBy: names that count as one salesperson (full name + nickname), matched without case.
function buildWhere({ q, city, status, callType, date, handledBy = [] }) {
    const where = [];
    const params = [];
    const words = String(q || '').trim().split(/\s+/).filter(Boolean).slice(0, 6);
    for (const word of words) {
        const like = `%${word.replace(/[\\%_]/g, '\\$&')}%`;
        // Also finds calls by the nickname / alternative names saved on the party in Parties.
        // Explicit collation: the two tables can have different defaults (e.g. a MySQL 8 dump loaded into MariaDB).
        where.push(`(${SEARCH_COLS.map((c) => `\`${c}\` LIKE ?`).join(' OR ')}
            OR party_name COLLATE utf8mb4_unicode_ci IN (
                SELECT company_name COLLATE utf8mb4_unicode_ci FROM parties
                WHERE party_nickname LIKE ? OR alternative_names LIKE ?))`);
        SEARCH_COLS.forEach(() => params.push(like));
        params.push(like, like);
    }
    if (city) { where.push('city = ?'); params.push(city); }
    if (status) { where.push('status = ?'); params.push(status); }
    if (callType) { where.push('call_type = ?'); params.push(callType); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) { where.push('call_date = ?'); params.push(date); }
    if (handledBy.length) {
        where.push(`LOWER(TRIM(handled_by)) IN (${handledBy.map(() => '?').join(', ')})`);
        params.push(...handledBy);
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// GET /api/calls/query?q=&city=&status=&callType=&page=1&pageSize=50
// -> { items, total, page, pageSize, cities }
router.get('/query', requirePermission('calls.view'), handler(async (req, res) => {
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 50, 1), MAX_PAGE_SIZE);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    // ?salesperson=<id>: only the calls this salesperson handled (by full name or nickname).
    let handledBy = [];
    if (req.query.salesperson) {
        const [[person]] = await pool.query('SELECT full_name, nickname FROM salespersons WHERE id = ?', [req.query.salesperson]);
        if (!person) throw new HttpError(404, 'Salesperson not found');
        handledBy = [person.full_name, person.nickname].map((n) => String(n || '').trim().toLowerCase()).filter(Boolean);
    }
    const { sql, params } = buildWhere({ ...req.query, handledBy });

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM calls ${sql}`, params);
    const [rows] = await pool.query(
        `SELECT * FROM calls ${sql}
         ORDER BY call_date IS NULL, call_date DESC, call_time DESC, created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, (page - 1) * pageSize]
    );
    const [cityRows] = await pool.query(
        "SELECT DISTINCT city FROM calls WHERE city IS NOT NULL AND city <> '' ORDER BY city LIMIT 1000"
    );
    res.json({
        items: rows.map((row) => fromRow(callFields, row)),
        total: Number(total),
        page,
        pageSize,
        cities: cityRows.map((r) => r.city)
    });
}));

// POST /api/calls/import { records: [...] } -> { created, failed, errors: [{ row, message }] }
// Fast path for big Excel uploads: rows are validated, then written with one multi-row INSERT.
// The client sends large sheets in chunks; `offset` keeps reported row numbers relative to the whole sheet.
const IMPORT_COLS = callFields.map((f) => f.col);

router.post('/import', requirePermission('calls.import'), handler(async (req, res) => {
    const records = req.body?.records;
    const offset = Math.max(parseInt(req.body?.offset, 10) || 0, 0);
    if (!Array.isArray(records) || records.length === 0) throw new HttpError(400, 'No records to import');
    if (records.length > MAX_PAGE_SIZE) throw new HttpError(400, `Too many rows in one request (max ${MAX_PAGE_SIZE})`);

    const now = nowSql();
    const values = [];
    const errors = [];
    records.forEach((record, index) => {
        try {
            const row = toRow(callFields, record || {});
            if (!row.party_name) throw new HttpError(400, 'Party Name is empty');
            if (!row.call_type) row.call_type = 'Follow-up';
            if (!row.status) row.status = 'completed';
            values.push([generateId(), ...IMPORT_COLS.map((c) => row[c] ?? null), now, now]);
        } catch (error) {
            errors.push({ row: offset + index + 1, message: error.message });
        }
    });

    if (values.length > 0) {
        await pool.query(
            `INSERT INTO calls (id, ${IMPORT_COLS.map((c) => `\`${c}\``).join(', ')}, created_at, updated_at) VALUES ?`,
            [values]
        );
        logActivity('call', `Imported ${values.length} calls from Excel`);
    }
    res.json({ created: values.length, failed: errors.length, errors: errors.slice(0, 50) });
}));

export default router;
