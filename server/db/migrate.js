import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

const dir = new URL('./migrations/', import.meta.url);
const LOCK = 'crm_migrations';

// Migration files: NNN_name.js (export async function up(conn, { database })) or NNN_name.sql.
// Applied in file-name order, each recorded in schema_migrations so it only ever runs once.
const listFiles = () => fs.readdirSync(dir).filter((f) => /^\d+_.+\.(js|sql)$/.test(f)).sort();
const nameOf = (file) => file.replace(/\.(js|sql)$/, '');
// 001_baseline.sql is only read by 001_baseline.js; skip it as a migration of its own.
const migrationFiles = () => listFiles().filter((f) => !(f.endsWith('.sql') && listFiles().includes(`${nameOf(f)}.js`)));

async function connect() {
    const { database, ...serverConfig } = config.db;
    const conn = await mysql.createConnection({ ...serverConfig, multipleStatements: true });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
    await conn.query(`USE \`${database}\``);
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(190) PRIMARY KEY,
        applied_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    return { conn, database };
}

async function applied(conn) {
    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    return new Set(rows.map((r) => r.name));
}

// Returns [{ name, applied }] for every migration file.
export async function status() {
    const { conn } = await connect();
    try {
        const done = await applied(conn);
        return migrationFiles().map((f) => ({ name: nameOf(f), applied: done.has(nameOf(f)) }));
    } finally {
        await conn.end();
    }
}

// Applies every pending migration. Safe to run on every deploy; a second server running it waits on a lock.
export async function migrate({ log = console.log } = {}) {
    const { conn, database } = await connect();
    try {
        const [[{ got }]] = await conn.query('SELECT GET_LOCK(?, 60) AS got', [LOCK]);
        if (!got) throw new Error('Another migration is running; try again in a minute');
        const done = await applied(conn);
        let count = 0;
        for (const file of migrationFiles()) {
            const name = nameOf(file);
            if (done.has(name)) continue;
            log(`Applying ${name} ...`);
            if (file.endsWith('.sql')) {
                await conn.query(fs.readFileSync(new URL(file, dir), 'utf8'));
            } else {
                const mod = await import(new URL(file, dir).href);
                await mod.up(conn, { database });
            }
            await conn.query('INSERT INTO schema_migrations (name, applied_at) VALUES (?, UTC_TIMESTAMP())', [name]);
            count += 1;
        }
        log(count ? `Done: ${count} migration(s) applied.` : 'Database is up to date.');
        return count;
    } finally {
        await conn.query('SELECT RELEASE_LOCK(?)', [LOCK]).catch(() => {});
        await conn.end();
    }
}
