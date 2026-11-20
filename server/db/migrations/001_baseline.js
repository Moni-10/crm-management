import fs from 'node:fs';

const schema = fs.readFileSync(new URL('./001_baseline.sql', import.meta.url), 'utf8');

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


// Baseline = the schema as of the first versioned release. Safe on databases that already have the tables.
export async function up(conn, { database }) {
    await conn.query(schema);
    await applyColumnUpgrades(conn, database);
}
