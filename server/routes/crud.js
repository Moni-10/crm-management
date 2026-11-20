import { Router } from 'express';
import { requirePermission } from '../auth/access.js';
import { moduleOfResource } from '../auth/permissions.js';
import { HttpError } from '../lib/mapping.js';
import { resources } from '../resources/index.js';

const router = Router();

const handler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

for (const [name, resource] of Object.entries(resources)) {
    const need = (action) => requirePermission(`${moduleOfResource(name)}.${action}`);
    router.get(`/${name}`, need('view'), handler(async (req, res) => {
        res.json(await resource.list());
    }));

    router.post(`/${name}/bulk`, need('import'), handler(async (req, res) => {
        const records = req.body?.records;
        if (!Array.isArray(records) || records.length === 0) {
            throw new HttpError(400, 'No records to import');
        }
        if (records.length > 5000) throw new HttpError(400, 'Too many rows (max 5000 per upload)');
        res.json(await resource.bulkCreate(records));
    }));

    router.get(`/${name}/:id`, need('view'), handler(async (req, res) => {
        const item = await resource.get(req.params.id);
        if (!item) throw new HttpError(404, 'Not found');
        res.json(item);
    }));

    router.post(`/${name}`, need('create'), handler(async (req, res) => {
        res.status(201).json(await resource.create(req.body || {}));
    }));

    router.put(`/${name}/:id`, need('edit'), handler(async (req, res) => {
        const item = await resource.update(req.params.id, req.body || {});
        if (!item) throw new HttpError(404, 'Not found');
        res.json(item);
    }));

    router.delete(`/${name}/:id`, need('delete'), handler(async (req, res) => {
        if (!(await resource.remove(req.params.id))) throw new HttpError(404, 'Not found');
        res.json({ success: true });
    }));
}

export default router;
