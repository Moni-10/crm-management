import { Router } from 'express';
import { verifyPassword } from '../auth/password.js';
import { clearData, hasData, seedSampleData } from '../db/seed.js';
import { pool } from '../db/pool.js';
import { generateId, HttpError, nowSql } from '../lib/mapping.js';

// Admin-only data tools (mounted behind requireAuth + requireAdmin).
const router = Router();

router.get('/data-status', async (req, res, next) => {
    try {
        res.json({ hasData: await hasData() });
    } catch (error) {
        next(error);
    }
});

// Adds the demo data. Refuses when the database already has data so nothing is duplicated.
router.post('/sample-data', async (req, res, next) => {
    try {
        const counts = await seedSampleData();
        if (!counts) throw new HttpError(409, 'The database already has data. Clear it first to load the sample data');
        res.json({ counts });
    } catch (error) {
        next(error);
    }
});

// Deletes every CRM record (not the login accounts). Needs the admin's password as confirmation.
router.post('/clear-data', async (req, res, next) => {
    try {
        const password = String(req.body?.password || '');
        if (!password || !(await verifyPassword(password, req.user.password_hash))) {
            throw new HttpError(400, 'Your password is not correct');
        }
        await clearData();
        const now = nowSql();
        await pool.query('INSERT INTO activity SET ?', [{
            id: generateId(), type: 'system', description: `All data cleared by ${req.user.name}`, created_at: now, updated_at: now
        }]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
