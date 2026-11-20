import { refreshLeadFlags } from '../lead-flags.js';

export async function up(conn, { database }) {
    const [cols] = await conn.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leads'", [database]
    );
    const have = new Set(cols.map((c) => c.COLUMN_NAME));
    if (!have.has('phone_count')) await conn.query('ALTER TABLE leads ADD COLUMN phone_count SMALLINT UNSIGNED NOT NULL DEFAULT 0, ADD KEY idx_lead_phone_count (phone_count)');
    if (!have.has('has_repeat')) await conn.query('ALTER TABLE leads ADD COLUMN has_repeat TINYINT(1) NOT NULL DEFAULT 0, ADD KEY idx_lead_repeat (has_repeat)');
    await refreshLeadFlags(conn);
}
