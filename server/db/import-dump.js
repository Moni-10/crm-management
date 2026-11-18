// Loads database/party_crm.sql (a full copy of the data) into MySQL:  npm run db:import
// WARNING: the dump drops and recreates the CRM tables, so anything already in them is replaced.
// Login accounts are not part of the dump; the first admin is created from .env when the app starts.
import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

const file = new URL('../../database/party_crm.sql', import.meta.url);

if (!fs.existsSync(file)) {
    console.error('database/party_crm.sql was not found.');
    process.exit(1);
}

const { database, ...serverConfig } = config.db;
const conn = await mysql.createConnection({ ...serverConfig, multipleStatements: true });
try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
    await conn.query(`USE \`${database}\``);
    await conn.query(fs.readFileSync(file, 'utf8'));
    const [[{ parties }]] = await conn.query('SELECT COUNT(*) AS parties FROM parties');
    const [[{ quotations }]] = await conn.query('SELECT COUNT(*) AS quotations FROM quotations');
    console.log(`Imported into "${database}": ${parties} parties, ${quotations} quotations (and the rest of the data).`);
} catch (error) {
    console.error('Import failed:', error.message);
    process.exitCode = 1;
} finally {
    await conn.end();
}
