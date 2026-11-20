import { Router } from 'express';
import { hashPassword } from '../auth/password.js';
import { findUserByEmail } from '../auth/users.js';
import { pool } from '../db/pool.js';
import { logActivity } from '../lib/activity.js';
import { generateId, HttpError, nowSql } from '../lib/mapping.js';

// Mounted behind requireAuth + requirePermission('users.manage').
const router = Router();
const handler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const present = (u) => ({
    id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active, createdAt: u.created_at
});

async function assertRole(slug) {
    const [[role]] = await pool.query('SELECT id FROM roles WHERE slug = ?', [slug]);
    if (!role) throw new HttpError(400, 'Choose a valid role');
}

// Blocks changes that would leave the system with no active admin.
async function assertAnotherAdmin(excludingId) {
    const [[{ n }]] = await pool.query(
        "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id <> ?", [excludingId]
    );
    if (n === 0) throw new HttpError(400, 'There must be at least one active admin');
}

router.get('/', handler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY name');
    res.json(rows.map(present));
}));

router.post('/', handler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || 'user');
    if (!name) throw new HttpError(400, 'Name is required');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Enter a valid email');
    if (password.length < 8) throw new HttpError(400, 'The password must be at least 8 characters');
    await assertRole(role);
    if (await findUserByEmail(email)) throw new HttpError(409, 'A user with this email already exists');
    const now = nowSql();
    const id = generateId();
    await pool.query('INSERT INTO users SET ?', [{
        id, name, email, password_hash: await hashPassword(password), role, active: 1, created_at: now, updated_at: now
    }]);
    logActivity('user', `${req.user.name} created user ${email}`);
    const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    res.status(201).json(present(row));
}));

router.put('/:id', handler(async (req, res) => {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) throw new HttpError(404, 'User not found');
    const body = req.body || {};
    const update = { updated_at: nowSql() };

    if (body.name !== undefined) {
        update.name = String(body.name).trim();
        if (!update.name) throw new HttpError(400, 'Name is required');
    }
    if (body.role !== undefined && body.role !== user.role) {
        await assertRole(body.role);
        if (user.role === 'admin') await assertAnotherAdmin(user.id);
        update.role = body.role;
    }
    if (body.active !== undefined) {
        const active = body.active ? 1 : 0;
        if (!active) {
            if (user.id === req.user.id) throw new HttpError(400, 'You cannot disable your own account');
            if (user.role === 'admin') await assertAnotherAdmin(user.id);
        }
        update.active = active;
    }
    if (body.password) {
        if (String(body.password).length < 8) throw new HttpError(400, 'The password must be at least 8 characters');
        update.password_hash = await hashPassword(String(body.password)); // also signs the user out everywhere
    }
    await pool.query('UPDATE users SET ? WHERE id = ?', [update, user.id]);
    logActivity('user', `${req.user.name} updated user ${user.email}`);
    const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
    res.json(present(row));
}));

router.delete('/:id', handler(async (req, res) => {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) throw new HttpError(404, 'User not found');
    if (user.id === req.user.id) throw new HttpError(400, 'You cannot delete your own account');
    if (user.role === 'admin') await assertAnotherAdmin(user.id);
    await pool.query('DELETE FROM users WHERE id = ?', [user.id]);
    logActivity('user', `${req.user.name} deleted user ${user.email}`);
    res.json({ success: true });
}));

export default router;
