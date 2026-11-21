// One generated column that holds everything searchable about a lead (kept up to date by the database itself),
// so a search looks at one column instead of eight. Works on MySQL 5.7+/8 and MariaDB 10.2+.
export async function up(conn, { database }) {
    const [cols] = await conn.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'crm_leads' AND COLUMN_NAME = 'search_text'", [database]);
    if (cols.length === 0) {
        await conn.query(`ALTER TABLE crm_leads ADD COLUMN search_text TEXT GENERATED ALWAYS AS
            (CONCAT_WS(' ', company_name, contact_person, mobile, email, machine_interest, city, state, source, notes)) STORED`);
    }
}
