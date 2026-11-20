// Create a login from the command line (replaces the old one-off make_admins.js scripts).
//   npm run user:create -- --email jane@example.com --name "Jane" --role admin [--password "..."]
// Without --password a random one is generated and printed once. Run on the server where .env points at the database.
import crypto from 'node:crypto';
import { hashPassword } from '../server/auth/password.js';
import { pool } from '../server/db/pool.js';
import { generateId, nowSql } from '../server/lib/mapping.js';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];

const email = String(args.email || '').trim().toLowerCase();
const name = String(args.name || '').trim();
const role = String(args.role || 'user');
if (!/^\S+@\S+\.\S+$/.test(email) || !name) {
    console.error('Usage: npm run user:create -- --email <email> --name "<name>" [--role admin|user|<custom role>] [--password <min 8 chars>]');
    process.exit(1);
}

try {
    const [roleRows] = await pool.query('SELECT id FROM roles WHERE slug = ?', [role]);
    if (roleRows.length === 0) throw new Error(`Role "${role}" does not exist. Run npm run migrate, or create it under Roles & permissions.`);
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) throw new Error(`A user with ${email} already exists.`);

    const generated = !args.password;
    const password = args.password || crypto.randomBytes(9).toString('base64url');
    if (password.length < 8) throw new Error('The password must be at least 8 characters.');
    const now = nowSql();
    await pool.query('INSERT INTO users SET ?', [{
        id: generateId(), name, email, password_hash: await hashPassword(password), role, active: 1, created_at: now, updated_at: now
    }]);
    console.log(`Created ${role} account for ${email}.`);
    if (generated) console.log(`Temporary password (shown once): ${password}`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
