// npm run import:leads -- "<folder with .xlsx files>"
// Loads every row of every sheet into `leads` exactly as it is in Excel (repeats included).
// Safe to re-run: files already imported are skipped, and (sheet, row) is unique so nothing is duplicated.
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import XLSX from 'xlsx';
import { config } from '../config.js';
import { refreshLeadFlags } from './lead-flags.js';

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
    console.error('Usage: npm run import:leads -- "<folder containing the .xlsx files>"');
    process.exit(1);
}
const CHUNK = 2000;
const pad = (n) => String(n).padStart(2, '0');

// The Excel reader returns dates about 10 seconds early (a date-only 2026-08-12 arrives as 08-11 23:59:50),
// so dates are rounded to the nearest minute before use.
const roundToMinute = (d) => new Date(Math.round(d.getTime() / 60000) * 60000);

// Cell -> text exactly as Excel shows the value (numbers without ".0", dates as YYYY-MM-DD).
function cellText(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'string') return v.replace(/\r\n/g, '\n'); // the reader turns line breaks into \r\n; Excel text uses \n
    if (v instanceof Date && v.getFullYear() < 1900) {
        // time-only cell: the reader's offset for 1899 has odd seconds, so round the clock time to the minute
        const total = (v.getHours() * 60 + v.getMinutes() + (v.getSeconds() >= 30 ? 1 : 0)) % 1440;
        return `${pad(Math.floor(total / 60))}:${pad(total % 60)}:00`;
    }
    if (v instanceof Date) {
        v = roundToMinute(v);
        const date = `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
        const time = `${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`;
        if (v.getFullYear() < 1900) return time; // a time-only cell
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
function phonesOf(text) {
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

const { database, ...serverConfig } = config.db;
const conn = await mysql.createConnection({ ...serverConfig, database, dateStrings: true });
const files = fs.readdirSync(dir).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$')).sort();
if (files.length === 0) { console.error('No .xlsx files found in that folder.'); process.exit(1); }

// First file of a sheet starts at row 1; later files continue from the sheet's current row count.
const nextRow = new Map();
const [existing] = await conn.query("SELECT source_sheet, MAX(first_row + rows_read - 1) AS last FROM import_batches WHERE status = 'done' GROUP BY source_sheet");
for (const e of existing) nextRow.set(e.source_sheet, Number(e.last) + 1);

let grandRead = 0; let grandInserted = 0;
try {
    for (const file of files) {
        const wb = XLSX.read(fs.readFileSync(path.join(dir, file)), { type: 'buffer', cellDates: true, dense: true });
        for (const sheetName of wb.SheetNames) {
            const [done] = await conn.query("SELECT id FROM import_batches WHERE source_file = ? AND source_sheet = ? AND status = 'done'", [file, sheetName]);
            if (done.length) { console.log(`skip ${file} (already imported)`); continue; }

            const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: null, blankrows: true });
            rows.shift(); // header row
            while (rows.length && rows[rows.length - 1].every((c) => c === null || c === '')) rows.pop();

            const [unfinished] = await conn.query('SELECT first_row FROM import_batches WHERE source_file = ? AND source_sheet = ?', [file, sheetName]);
            const first = unfinished.length ? Number(unfinished[0].first_row) : (nextRow.get(sheetName) || 1);
            await conn.query('DELETE FROM import_batches WHERE source_file = ? AND source_sheet = ?', [file, sheetName]); // a failed earlier attempt
            const [b] = await conn.query(
                "INSERT INTO import_batches (source_file, source_sheet, first_row, rows_read, status, started_at) VALUES (?, ?, ?, ?, 'running', UTC_TIMESTAMP())",
                [file, sheetName, first, rows.length]
            );
            const batchId = b.insertId;
            let inserted = 0;

            for (let i = 0; i < rows.length; i += CHUNK) {
                const slice = rows.slice(i, i + CHUNK);
                const values = slice.map((r, k) => [
                    batchId, sheetName, first + i + k,
                    cellText(r[0]), cellText(r[1]), asLeadDate(r[1]),
                    cellText(r[2]), cellText(r[3]), cellText(r[4]), cellText(r[5]), cellText(r[6])
                ]);
                await conn.beginTransaction();
                const [res] = await conn.query(
                    `INSERT IGNORE INTO leads (batch_id, source_sheet, source_row, sno, date_text, lead_date, machine, location, coming, contact, email, created_at)
                     VALUES ?`,
                    [values.map((v) => [...v, new Date()])]
                );
                inserted += res.affectedRows;

                const lo = first + i; const hi = first + i + slice.length - 1;
                const [ids] = await conn.query('SELECT id, source_row FROM leads WHERE source_sheet = ? AND source_row BETWEEN ? AND ?', [sheetName, lo, hi]);
                const idByRow = new Map(ids.map((x) => [Number(x.source_row), x.id]));
                const phoneRows = [];
                values.forEach((v, k) => {
                    const id = idByRow.get(v[2]);
                    if (id) for (const p of phonesOf(v[9])) phoneRows.push([id, p]);
                });
                if (phoneRows.length) await conn.query('INSERT IGNORE INTO lead_phones (lead_id, phone) VALUES ?', [phoneRows]);
                await conn.commit();
            }

            await conn.query("UPDATE import_batches SET rows_inserted = ?, status = 'done', finished_at = UTC_TIMESTAMP() WHERE id = ?", [inserted, batchId]);
            nextRow.set(sheetName, first + rows.length);
            grandRead += rows.length; grandInserted += inserted;
            console.log(`${file} [${sheetName}] rows ${first}-${first + rows.length - 1}: read ${rows.length}, inserted ${inserted}`);
        }
    }
    if (grandInserted > 0) { console.log('Updating search helpers...'); await refreshLeadFlags(conn); }
    const [[total]] = await conn.query('SELECT COUNT(*) AS n FROM leads');
    console.log(`\nFinished. Read ${grandRead}, inserted ${grandInserted} this run. leads table now holds ${total.n} rows.`);
} catch (error) {
    await conn.rollback().catch(() => {});
    console.error('Import failed:', error.message, '\nRe-run the same command to continue; finished files are skipped.');
    process.exitCode = 1;
} finally {
    await conn.end();
}
