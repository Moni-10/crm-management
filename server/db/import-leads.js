// npm run import:leads -- "<folder with .xlsx files>"
// Loads every row of every sheet into `leads` exactly as it is in Excel (repeats included).
// The same import is available in the app under "Old Excel Data" > Import. Files already imported are skipped.
import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool.js';
import { importWorkbook } from '../lib/lead-import.js';

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
    console.error('Usage: npm run import:leads -- "<folder containing the .xlsx files>"');
    process.exit(1);
}
const files = fs.readdirSync(dir).filter((f) => /\.(xlsx|xls|csv)$/i.test(f) && !f.startsWith('~$')).sort();
if (files.length === 0) { console.error('No Excel files found in that folder.'); process.exit(1); }

let inserted = 0;
try {
    for (const file of files) {
        const results = await importWorkbook(pool, file, fs.readFileSync(path.join(dir, file)), { log: console.log });
        for (const r of results) {
            if (r.status === 'skipped') console.log(`skip ${file} [${r.sheet}]: ${r.reason}`);
            inserted += r.inserted;
        }
    }
    const [[total]] = await pool.query('SELECT COUNT(*) AS n FROM leads');
    console.log(`\nFinished. Inserted ${inserted} this run. The table now holds ${total.n} rows.`);
} catch (error) {
    console.error('Import failed:', error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
