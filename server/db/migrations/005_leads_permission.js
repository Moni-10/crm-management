// The default view-only "user" role can see Leads (read-only) like every other module.
export async function up(conn) {
    const [[role]] = await conn.query("SELECT id FROM roles WHERE slug = 'user'");
    if (role) await conn.query("INSERT IGNORE INTO role_permissions (role_id, permission) VALUES (?, 'leads.view')", [role.id]);
}
