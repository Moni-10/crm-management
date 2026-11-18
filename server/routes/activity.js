import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

// GET /api/activity?limit=10 -> most recent changes, newest first
router.get('/', async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const [rows] = await pool.query('SELECT id, type, description, created_at FROM activity ORDER BY created_at DESC, id DESC LIMIT ?', [limit]);
        res.json(rows.map((row) => ({
            id: row.id,
            type: row.type,
            description: row.description,
            createdAt: `${String(row.created_at).replace(' ', 'T')}Z`
        })));
    } catch (error) {
        next(error);
    }
});

export default router;
