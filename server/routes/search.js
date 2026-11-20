import { Router } from 'express';
import { permissionsForRole } from '../auth/access.js';
import { moduleOfResource } from '../auth/permissions.js';
import { resources } from '../resources/index.js';

const router = Router();

// GET /api/search?q=term&limit=5 -> { salespersons: [], parties: [], machines: [], quotations: [], events: [] }
router.get('/', async (req, res, next) => {
    try {
        const results = {};
        const term = String(req.query.q || '').trim();
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 100);
        const perms = await permissionsForRole(req.user.role);
        const names = Object.keys(resources).filter((n) => perms.has(`${moduleOfResource(n)}.view`));
        for (const name of Object.keys(resources)) results[name] = [];
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
