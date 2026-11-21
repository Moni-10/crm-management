// "Leads" = leads added by hand (table crm_leads), separate from the imported Excel records ("Old Excel Data").
// The Excel permissions move from leads.* to oldexcel.*; the default view-only role can view both.
export async function up(conn) {
    await conn.query(`CREATE TABLE IF NOT EXISTS crm_leads (
        id VARCHAR(40) PRIMARY KEY,
        company_name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(150) NULL,
        mobile VARCHAR(30) NULL,
        email VARCHAR(150) NULL,
        machine_interest VARCHAR(200) NULL,
        city VARCHAR(100) NULL,
        state VARCHAR(100) NULL,
        source VARCHAR(60) NOT NULL DEFAULT 'Manual',
        status VARCHAR(30) NOT NULL DEFAULT 'New',
        follow_up_date DATE NULL,
        assigned_salesperson VARCHAR(40) NULL,
        notes TEXT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_crmlead_company (company_name),
        INDEX idx_crmlead_mobile (mobile),
        INDEX idx_crmlead_status (status),
        INDEX idx_crmlead_followup (follow_up_date),
        CONSTRAINT fk_crmlead_salesperson FOREIGN KEY (assigned_salesperson)
            REFERENCES salespersons(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query("UPDATE role_permissions SET permission = REPLACE(permission, 'leads.', 'oldexcel.') WHERE permission LIKE 'leads.%'");
    const [[role]] = await conn.query("SELECT id FROM roles WHERE slug = 'user'");
    if (role) {
        for (const permission of ['leads.view', 'oldexcel.view']) {
            await conn.query('INSERT IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)', [role.id, permission]);
        }
    }
}
