import crypto from 'node:crypto';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { generateId, nowSql } from '../lib/mapping.js';
import { hashPassword } from './password.js';

// Changes whenever the password changes, so old login tokens stop working.
export const passwordVersion = (user) =>
    crypto.createHash('sha256').update(user.password_hash).digest('hex').slice(0, 16);

export async function findUserByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
    return rows[0] || null;
}

export async function findUserById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
}

export async function updatePassword(id, newPassword) {
    await pool.query('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [
        await hashPassword(newPassword),
        nowSql(),
        id
    ]);
}

// Creates the first admin from .env when there are no users yet.
export async function ensureAdminUser() {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
    if (total > 0) return;

    let { adminPassword } = config.auth;
    let generated = false;
    if (!adminPassword) {
        adminPassword = crypto.randomBytes(9).toString('base64url');
        generated = true;
    }
    const now = nowSql();
    await pool.query('INSERT INTO users SET ?', [{
        id: generateId(),
        name: config.auth.adminName,
        email: config.auth.adminEmail,
        password_hash: await hashPassword(adminPassword),
        role: 'admin',
        created_at: now,
        updated_at: now
    }]);
    console.log(`Created the first admin account: ${config.auth.adminEmail}`);
    if (generated) console.log(`ADMIN_PASSWORD was not set, so a temporary password was generated: ${adminPassword}`);
}
