// Permanent running numbers for big lists, and the Follow-up Log (the same kind of record as the old Excel sheets:
// who was followed up, when, about what, and what happened). Numbers only ever go up, so "lead no. 2345" always
// means the same lead, new records get the highest number and appear at the top.
export async function up(conn, { database }) {
    const [cols] = await conn.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'crm_leads' AND COLUMN_NAME = 'lead_no'", [database]);
    if (cols.length === 0) {
        await conn.query('ALTER TABLE crm_leads ADD COLUMN lead_no BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, ADD UNIQUE KEY uq_lead_no (lead_no)');
    }

    await conn.query(`CREATE TABLE IF NOT EXISTS followup_log (
        id VARCHAR(40) PRIMARY KEY,
        followup_no BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        lead_id VARCHAR(40) NULL,
        party_name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(150) NULL,
        mobile VARCHAR(30) NULL,
        email VARCHAR(150) NULL,
        machine VARCHAR(200) NULL,
        location VARCHAR(200) NULL,
        followup_date DATE NULL,
        next_followup_date DATE NULL,
        taken_by VARCHAR(150) NULL,
        outcome VARCHAR(40) NOT NULL DEFAULT 'Follow-up',
        notes TEXT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        search_text TEXT GENERATED ALWAYS AS
            (CONCAT_WS(' ', party_name, contact_person, mobile, email, machine, location, taken_by, outcome, notes)) STORED,
        UNIQUE KEY uq_followup_no (followup_no),
        KEY idx_fl_date (followup_date),
        KEY idx_fl_next (next_followup_date),
        KEY idx_fl_outcome (outcome, followup_no),
        KEY idx_fl_taken_by (taken_by, followup_no),
        KEY idx_fl_mobile (mobile),
        KEY idx_fl_lead (lead_id),
        CONSTRAINT fk_fl_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const [[role]] = await conn.query("SELECT id FROM roles WHERE slug = 'user'");
    if (role) await conn.query("INSERT IGNORE INTO role_permissions (role_id, permission) VALUES (?, 'followuplog.view')", [role.id]);
}
