import { Router } from 'express';
import { permissionsForRole } from '../auth/access.js';
import { moduleOfResource } from '../auth/permissions.js';
import { resources } from '../resources/index.js';
import { searchEntries } from './old-excel.js';

const router = Router();

// Everything the global search can look in. `module` decides who may see the group.
const GROUPS = {
    ...Object.fromEntries(Object.entries(resources).map(([name, resource]) => [
        name, { module: moduleOfResource(name), run: (term, n) => resource.search(term, n) }
    ])),
    oldexcel: { module: 'oldexcel', run: searchEntries }
};

// GET /api/search?q=term&limit=5[&group=parties]
// -> { <group>: [items], more: { <group>: true } }
// `more` is true when a group has more matches than `limit` (one extra row is fetched to know this, no slow count).
// With `group` only that group is searched, so the client can ask for every group at once and show each as it arrives.
router.get('/', async (req, res, next) => {
    try {
        const term = String(req.query.q || '').trim().slice(0, 120);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 100);
        const perms = await permissionsForRole(req.user.role);
        const wanted = req.query.group ? [String(req.query.group)] : Object.keys(GROUPS);
        const names = wanted.filter((n) => GROUPS[n] && perms.has(`${GROUPS[n].module}.view`));

        const results = {};
        const more = {};
        for (const name of wanted) results[name] = [];
        await Promise.all(names.map(async (name) => {
            if (!term) return;
            try {
                const rows = await GROUPS[name].run(term, limit + 1);
                more[name] = rows.length > limit;
                results[name] = rows.slice(0, limit);
            } catch (error) {
                // One slow or broken group must not take the whole search down.
                console.error(`Search in ${name} failed:`, error.message);
            }
        }));
        res.json({ ...results, more });
    } catch (error) {
        next(error);
    }
});

export default router;
