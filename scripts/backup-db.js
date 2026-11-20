// Full database backup with mysqldump (the right tool for 300k+ leads; the JSON backup in the app does not include them).
//   npm run db:backup            -> backups/<db>-<timestamp>.sql.gz
// Restore:  gunzip -c backups/<file>.sql.gz | mysql -u <user> -p <db>      (see DEPLOY.md)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { config } from '../server/config.js';

// Find mysqldump: MYSQLDUMP_PATH, then PATH, then the usual WAMP / XAMPP / Linux locations.
function findMysqldump() {
    const candidates = [process.env.MYSQLDUMP_PATH].filter(Boolean);
    for (const base of ['C:/wamp64/bin/mysql', 'C:/wamp64/bin/mariadb']) {
        if (fs.existsSync(base)) {
            for (const v of fs.readdirSync(base).sort().reverse()) candidates.push(`${base}/${v}/bin/mysqldump.exe`);
        }
    }
    candidates.push('C:/xampp/mysql/bin/mysqldump.exe', '/usr/bin/mysqldump', '/usr/local/bin/mysqldump');
    return candidates.find((c) => fs.existsSync(c)) || 'mysqldump'; // last resort: rely on PATH
}

const { host, port, user, password, database } = config.db;
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const dir = path.resolve('backups');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${database}-${stamp}.sql.gz`);

const child = spawn(findMysqldump(), [
    `--host=${host}`, `--port=${port}`, `--user=${user}`,
    '--single-transaction', '--quick', '--routines', '--default-character-set=utf8mb4', database
], { env: { ...process.env, MYSQL_PWD: password }, stdio: ['ignore', 'pipe', 'pipe'] });

let stderr = '';
child.stderr.on('data', (d) => { stderr += d; });
child.on('error', (e) => { console.error(`Could not run mysqldump (${e.message}). Set MYSQLDUMP_PATH in .env.`); process.exit(1); });
const out = fs.createWriteStream(file);
const written = new Promise((resolve) => out.on('finish', resolve));
const exited = new Promise((resolve) => child.on('close', resolve));
child.stdout.pipe(zlib.createGzip()).pipe(out);

const [code] = await Promise.all([exited, written]);
if (code !== 0) {
    fs.rmSync(file, { force: true });
    console.error(`Backup failed (exit ${code}): ${stderr.trim()}`);
    process.exit(1);
}
console.log(`Backup written: ${file} (${(fs.statSync(file).size / 1048576).toFixed(1)} MB)`);
