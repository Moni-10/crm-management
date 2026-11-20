import { Router } from 'express';
import { requirePermission } from '../auth/access.js';
import { logActivity } from '../lib/activity.js';
import { resources } from '../resources/index.js';

const router = Router();

// Full export: { exportedAt, salespersons: [], parties: [], ... }
router.get('/', requirePermission('backup.view'), async (req, res, next) => {
    try {
        const data = { exportedAt: new Date().toISOString() };
        for (const [name, resource] of Object.entries(resources)) {
            data[name] = await resource.list();
        }
        res.setHeader('Content-Disposition', 'attachment; filename="party-crm-backup.json"');
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// Import: records are upserted by id, so importing the same file twice is safe.
router.post('/import', requirePermission('backup.import'), async (req, res, next) => {
    try {
        const payload = req.body || {};
        const summary = {};
        for (const [name, resource] of Object.entries(resources)) {
            const records = Array.isArray(payload[name]) ? payload[name] : [];
            summary[name] = { imported: 0, failed: 0, errors: [] };
            for (const record of records) {
                try {
                    const updated = record.id ? await resource.update(record.id, record, { silent: true }) : null;
                    if (!updated) await resource.create(record, { silent: true });
                    summary[name].imported += 1;
                } catch (error) {
                    summary[name].failed += 1;
                    if (summary[name].errors.length < 5) summary[name].errors.push(error.message);
                }
            }
        }
        const total = Object.values(summary).reduce((sum, r) => sum + r.imported, 0);
        if (total > 0) logActivity('backup', `Restored ${total} records from a backup file`);
        res.json(summary);
    } catch (error) {
        next(error);
    }
});

export default router;
