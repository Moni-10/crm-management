// Roles and permissions. users.role holds the role slug. "admin" has every permission implicitly (no rows);
// "user" starts with view-only access until an admin grants more.
const USER_DEFAULTS = [
    'parties.view', 'salespersons.view', 'machines.view', 'quotations.view', 'calendar.view',
    'calls.view', 'followups.view', 'reports.view', 'company.view'
];

export async function up(conn, { database }) {
    await conn.query(`CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(40) NOT NULL,
        name VARCHAR(80) NOT NULL,
        description VARCHAR(255) NULL,
        is_system TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_role_slug (slug),
        UNIQUE KEY uq_role_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await conn.query(`CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT NOT NULL,
        permission VARCHAR(60) NOT NULL,
        PRIMARY KEY (role_id, permission),
        CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const [cols] = await conn.query(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'active'", [database]
    );
    if (cols.length === 0) await conn.query('ALTER TABLE users ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1');

    await conn.query(`INSERT IGNORE INTO roles (slug, name, description, is_system, created_at, updated_at) VALUES
        ('admin', 'Admin', 'Full access to everything, including users and roles', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
        ('user', 'User', 'View-only until an admin grants more', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())`);
    const [[userRole]] = await conn.query("SELECT id FROM roles WHERE slug = 'user'");
    for (const permission of USER_DEFAULTS) {
        await conn.query('INSERT IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)', [userRole.id, permission]);
    }
    // Any account with an unknown role falls back to the view-only role.
    await conn.query("UPDATE users SET role = 'user' WHERE role NOT IN (SELECT slug FROM roles)");
}
