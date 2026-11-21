// Shared by the web upload (routes/leads.js) and the command line (db/import-leads.js).
// Every row is stored exactly as it is in the sheet: no merging, no removing repeats, no cleaning of values.
import XLSX from 'xlsx';
import { refreshLeadFlags } from '../db/lead-flags.js';

const CHUNK = 2000;
const pad = (n) => String(n).padStart(2, '0');

// The Excel reader returns dates about 10 seconds early (a date-only 2026-08-12 arrives as 08-11 23:59:50),
// so dates are rounded to the nearest minute before use.
const roundToMinute = (d) => new Date(Math.round(d.getTime() / 60000) * 60000);

// Cell -> text exactly as Excel shows the value (numbers without ".0", dates as YYYY-MM-DD).
export function cellText(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'string') return v.replace(/\r\n/g, '\n'); // the reader turns line breaks into \r\n
    if (v instanceof Date && v.getFullYear() < 1900) {
        // time-only cell: the reader's offset for 1899 has odd seconds, so round the clock time to the minute
        const total = (v.getHours() * 60 + v.getMinutes() + (v.getSeconds() >= 30 ? 1 : 0)) % 1440;
        return `${pad(Math.floor(total / 60))}:${pad(total % 60)}:00`;
    }
    if (v instanceof Date) {
        const d = roundToMinute(v);
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        return time === '00:00:00' ? date : `${date} ${time}`;
    }
    return String(v);
}

const asLeadDate = (v) => {
    if (!(v instanceof Date)) return null;
    const d = roundToMinute(v);
    return d.getFullYear() >= 1900 ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : null;
};

// Search index only: every number inside the contact cell (digits only; +91 / leading 0 dropped from Indian mobiles).
export function phonesOf(text) {
    if (!text) return [];
    const found = new Set();
    for (const part of text.replace(/ /g, ' ').split(/[,;/\n]+|\s{2,}/)) {
        let d = part.replace(/\D/g, '');
        if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
        else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
        if (d.length >= 6 && d.length <= 20) found.add(d);
    }
    return [...found];
}

// Column positions: matched by header name when the header row has them (any order), otherwise the usual
// layout: sno, date, machine, location, coming, contact, email.
const HEADERS = {
    sno: /^(sno|slno|srno|serial\w*|no)$/, date: /^date/, machine: /^machine/, location: /^(location|city|state|place)/,
    coming: /^coming/, contact: /^(contact|mobile|phone|number)/, email: /^email/
};
function columnMap(header) {
    const names = header.map((h) => String(h ?? '').toLowerCase().replace(/[^a-z]/g, ''));
    const map = {};
    let matched = 0;
    for (const [key, re] of Object.entries(HEADERS)) {
        const i = names.findIndex((n) => re.test(n));
        if (i >= 0) { map[key] = i; matched += 1; }
    }
    if (matched >= 5 && new Set(Object.values(map)).size === matched) {
        return ['sno', 'date', 'machine', 'location', 'coming', 'contact', 'email'].map((k) => map[k] ?? -1);
    }
    return [0, 1, 2, 3, 4, 5, 6];
}

/**
 * Loads every sheet of a workbook into `leads`.
 * Returns [{ sheet, status: 'imported' | 'skipped', rows, inserted, reason? }].
 * A (file, sheet) pair that was already imported is skipped, so the same file is never loaded twice.
 */
export async function importWorkbook(pool, fileName, buffer, { log = () => {} } = {}) {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true });
    const conn = await pool.getConnection();
    const results = [];
    try {
        // Leftovers of an import that was interrupted earlier are removed first so row numbers never collide.
        const [stale] = await conn.query("SELECT id FROM import_batches WHERE status <> 'done'");
        if (stale.length) {
            await conn.query('DELETE FROM leads WHERE batch_id IN (?)', [stale.map((b) => b.id)]);
            await conn.query('DELETE FROM import_batches WHERE id IN (?)', [stale.map((b) => b.id)]);
        }

        for (const sheetName of wb.SheetNames) {
            const [done] = await conn.query("SELECT id FROM import_batches WHERE source_file = ? AND source_sheet = ? AND status = 'done'", [fileName, sheetName]);
            if (done.length) { results.push({ sheet: sheetName, status: 'skipped', rows: 0, inserted: 0, reason: 'This file was already imported. Remove it from the import list first to load it again.' }); continue; }

            const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: null, blankrows: true });
            const header = rows.shift() || [];
            const cols = columnMap(header);
            while (rows.length && rows[rows.length - 1].every((c) => c === null || c === '')) rows.pop();
            if (rows.length === 0) { results.push({ sheet: sheetName, status: 'skipped', rows: 0, inserted: 0, reason: 'The sheet has no data rows.' }); continue; }

            const [[{ last }]] = await conn.query("SELECT COALESCE(MAX(first_row + rows_read - 1), 0) AS last FROM import_batches WHERE source_sheet = ? AND status = 'done'", [sheetName]);
            const first = Number(last) + 1;
            const [b] = await conn.query(
                "INSERT INTO import_batches (source_file, source_sheet, first_row, rows_read, status, started_at) VALUES (?, ?, ?, ?, 'running', UTC_TIMESTAMP())",
                [fileName, sheetName, first, rows.length]
            );
            const batchId = b.insertId;
            const cell = (r, k) => (cols[k] >= 0 ? r[cols[k]] : null);
            let inserted = 0;

            for (let i = 0; i < rows.length; i += CHUNK) {
                const slice = rows.slice(i, i + CHUNK);
                const values = slice.map((r, k) => [
                    batchId, sheetName, first + i + k,
                    cellText(cell(r, 0)), cellText(cell(r, 1)), asLeadDate(cell(r, 1)),
                    cellText(cell(r, 2)), cellText(cell(r, 3)), cellText(cell(r, 4)), cellText(cell(r, 5)), cellText(cell(r, 6))
                ]);
                await conn.beginTransaction();
                try {
                    const now = new Date();
                    const [res] = await conn.query(
                        `INSERT INTO leads (batch_id, source_sheet, source_row, sno, date_text, lead_date, machine, location, coming, contact, email, created_at)
                         VALUES ?`, [values.map((v) => [...v, now])]
                    );
                    inserted += res.affectedRows;

                    const [ids] = await conn.query('SELECT id, source_row FROM leads WHERE batch_id = ? AND source_row BETWEEN ? AND ?', [batchId, first + i, first + i + slice.length - 1]);
                    const idByRow = new Map(ids.map((x) => [Number(x.source_row), x.id]));
                    const phoneRows = [];
                    for (const v of values) {
                        const id = idByRow.get(v[2]);
                        if (id) for (const p of phonesOf(v[9])) phoneRows.push([id, p]);
                    }
                    if (phoneRows.length) await conn.query('INSERT IGNORE INTO lead_phones (lead_id, phone) VALUES ?', [phoneRows]);
                    await conn.commit();
                } catch (error) {
                    await conn.rollback();
                    // Leave nothing half-loaded from this sheet.
                    await conn.query('DELETE FROM leads WHERE batch_id = ?', [batchId]);
                    await conn.query('DELETE FROM import_batches WHERE id = ?', [batchId]);
                    throw error;
                }
            }
            await conn.query("UPDATE import_batches SET rows_inserted = ?, status = 'done', finished_at = UTC_TIMESTAMP() WHERE id = ?", [inserted, batchId]);
            results.push({ sheet: sheetName, status: 'imported', rows: rows.length, inserted });
            log(`${fileName} [${sheetName}] entries ${first}-${first + rows.length - 1}: read ${rows.length}, inserted ${inserted}`);
        }
        if (results.some((r) => r.status === 'imported')) await refreshLeadFlags(conn);
        return results;
    } finally {
        conn.release();
    }
}
