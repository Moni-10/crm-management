import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

// Columns added after the first release. Applied to both new and existing databases:
// [table, column, definition]
const COLUMN_UPGRADES = [
    ['salespersons', 'notes', 'TEXT NULL'],
    ['salespersons', 'whatsapp', 'VARCHAR(20) NULL'],
    ['salespersons', 'photo', 'MEDIUMTEXT NULL'],
    ['parties', 'alternative_names', 'VARCHAR(255) NULL'],
    ['parties', 'country', "VARCHAR(100) NOT NULL DEFAULT 'India'"],
    ['machines', 'purchase_status', "VARCHAR(20) NOT NULL DEFAULT 'Purchased'"],
    ['quotations', 'discount', 'DECIMAL(14,2) NOT NULL DEFAULT 0'],
    ['quotations', 'validity_date', 'DATE NULL'],
    ['quotations', 'warranty', 'TEXT NULL'],
    ['quotations', 'installation_terms', 'TEXT NULL'],
    ['quotations', 'bank_details', 'TEXT NULL'],
    ['events', 'event_time', 'VARCHAR(5) NULL'],
    ['events', 'salesperson_id', 'VARCHAR(40) NULL'],
    ['events', 'notes', 'TEXT NULL'],
    ['calls', 'nickname', 'VARCHAR(150) NULL'],
    ['calls', 'machine_number', 'VARCHAR(100) NULL'],
    ['calls', 'address', 'TEXT NULL'],
    ['calls', 'requirement', 'TEXT NULL']
];

async function applyColumnUpgrades(conn, database) {
    for (const [table, column, definition] of COLUMN_UPGRADES) {
        const [rows] = await conn.query(
            'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [database, table, column]
        );
        if (rows.length === 0) {
            await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        }
    }
}

// Keep the default salesperson records aligned with the Sales Department team.
// Existing IDs are preserved so parties already assigned to the sample records stay assigned.
async function syncDefaultSalesTeam(conn) {
    const renames = [
        ['Rahul Sharma', 'Jaspal', 'Jaspal', 'jaspal@mmw.in'],
        ['Amit Verma', 'Pooja', 'Pooja', 'pooja@mmw.in'],
        ['Priya Singh', 'Aman', 'Aman', 'aman@mmw.in'],
        ['Karan Malhotra', 'Neha Khan', 'Neha', 'neha.khan@mmw.in'],
        ['Sunita Rao', 'Neha Mishra', 'Neha', 'neha.mishra@mmw.in'],
        ['Vikram Chauhan', 'Muskan', 'Muskan', 'muskan@mmw.in']
    ];
    for (const [oldName, fullName, nickname, email] of renames) {
        await conn.query(
            'UPDATE salespersons SET full_name = ?, nickname = ?, email = ?, department = ?, updated_at = NOW() WHERE full_name = ?',
            [fullName, nickname, email, 'Sales', oldName]
        );
    }

    const additional = [
        ['team_sales_207', 'Rajwant', '9810011026', 'rajwant@mmw.in', 'EMP207'],
        ['team_sales_208', 'Renu', '9810011027', 'renu@mmw.in', 'EMP208'],
        ['team_sales_209', 'Satish', '9810011028', 'satish@mmw.in', 'EMP209'],
        ['team_sales_210', 'Swati', '9810011029', 'swati@mmw.in', 'EMP210'],
        ['team_sales_211', 'Uma', '9810011030', 'uma@mmw.in', 'EMP211']
    ];
    for (const [id, name, mobile, email, employeeId] of additional) {
        await conn.query(
            `INSERT INTO salespersons (id, full_name, nickname, mobile, email, department, employee_id, created_at, updated_at)
             SELECT ?, ?, ?, ?, ?, 'Sales', ?, NOW(), NOW()
             WHERE NOT EXISTS (SELECT 1 FROM salespersons WHERE full_name = ?)`,
            [id, name, name, mobile, email, employeeId, name]
        );
    }
}

// Creates the database and all tables if they do not exist yet, then upgrades older databases.
export async function migrate() {
    const { database, ...serverConfig } = config.db;
    const conn = await mysql.createConnection({ ...serverConfig, multipleStatements: true });
    try {
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
        await conn.query(`USE \`${database}\``);
        await conn.query(schema);
        await applyColumnUpgrades(conn, database);
        await syncDefaultSalesTeam(conn);
    } finally {
        await conn.end();
    }
}
