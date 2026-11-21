// Indexes for the Leads list so searching, filtering and paging stay fast as the table grows to hundreds of thousands of rows.
export async function up(conn, { database }) {
    const [rows] = await conn.query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'crm_leads'", [database]);
    const have = new Set(rows.map((r) => r.INDEX_NAME));
    const wanted = [
        ['idx_crmlead_created', 'created_at'],
        ['idx_crmlead_status_created', 'status, created_at'],
        ['idx_crmlead_city', 'city'],
        ['idx_crmlead_state', 'state'],
        ['idx_crmlead_source', 'source']
    ];
    for (const [name, cols] of wanted) {
        if (!have.has(name)) await conn.query(`ALTER TABLE crm_leads ADD INDEX ${name} (${cols})`);
    }
}
