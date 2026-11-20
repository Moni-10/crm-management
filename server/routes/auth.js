import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/token.js';
import { presentUser } from '../auth/access.js';
import { findUserByEmail, findUserById, updatePassword } from '../auth/users.js';
import { pool } from '../db/pool.js';
import { HttpError, nowSql } from '../lib/mapping.js';

const router = Router();

// Very small login throttle: 8 failed attempts per 10 minutes per address + email.
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const throttleKey = (req, email) => `${req.ip}|${String(email).toLowerCase()}`;

function checkThrottle(key) {
    const entry = attempts.get(key);
    if (entry && entry.resetAt > Date.now() && entry.count >= MAX_ATTEMPTS) {
        throw new HttpError(429, 'Too many failed attempts. Try again in a few minutes');
    }
}

function recordFailure(key) {
    const entry = attempts.get(key);
    if (!entry || entry.resetAt <= Date.now()) {
        attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
    } else {
        entry.count += 1;
    }
}

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) throw new HttpError(400, 'Enter your email and password');

        const key = throttleKey(req, email);
        checkThrottle(key);

        const user = await findUserByEmail(email);
        const valid = user && user.active && await verifyPassword(String(password), user.password_hash);
        if (!valid) {
            recordFailure(key);
            throw new HttpError(401, 'Incorrect email or password');
        }
        attempts.delete(key);
        res.json({ token: signToken(user), user: await presentUser(user) });
    } catch (error) {
        next(error);
    }
});

router.get('/me', requireAuth, async (req, res, next) => {
    try {
        res.json({ user: await presentUser(req.user) });
    } catch (error) {
        next(error);
    }
});

router.put('/profile', requireAuth, async (req, res, next) => {
    try {
        const name = String(req.body?.name || '').trim();
        if (!name) throw new HttpError(400, 'Name is required');
        await pool.query('UPDATE users SET name = ?, updated_at = ? WHERE id = ?', [name, nowSql(), req.user.id]);
        res.json({ user: await presentUser(await findUserById(req.user.id)) });
    } catch (error) {
        next(error);
    }
});

router.post('/change-password', requireAuth, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) throw new HttpError(400, 'Enter your current and new password');
        if (String(newPassword).length < 8) throw new HttpError(400, 'The new password must be at least 8 characters');
        if (newPassword === currentPassword) throw new HttpError(400, 'Choose a password different from the current one');
        if (!(await verifyPassword(String(currentPassword), req.user.password_hash))) {
            throw new HttpError(400, 'Your current password is not correct');
        }

        await updatePassword(req.user.id, String(newPassword));
        const user = await findUserById(req.user.id);
        // Return a fresh token: the old one stops working once the password changes.
        res.json({ token: signToken(user), user: await presentUser(user) });
    } catch (error) {
        next(error);
    }
});

export default router;
