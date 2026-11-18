import { Router } from 'express';
import { resources } from '../resources/index.js';

const router = Router();

// GET /api/search?q=term&limit=5 -> { salespersons: [], parties: [], machines: [], quotations: [], events: [] }
router.get('/', async (req, res, next) => {
    try {
        const term = String(req.query.q || '').trim();
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 100);
        const results = {};
        const names = Object.keys(resources);
        const lists = await Promise.all(
            names.map((name) => (term ? resources[name].search(term, limit) : []))
        );
        names.forEach((name, i) => { results[name] = lists[i]; });
        res.json(results);
    } catch (error) {
        next(error);
    }
});

export default router;
