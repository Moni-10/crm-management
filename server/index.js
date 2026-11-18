import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { pool } from './db/pool.js';
import { ensureAdminUser } from './auth/users.js';
import { requireAdmin, requireAuth } from './auth/middleware.js';
import activityRoutes from './routes/activity.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import callsRoutes from './routes/calls.js';
import backupRoutes from './routes/backup.js';
import { ensureCompanyRow, readCompany, updateCompany } from './routes/company.js';
import crudRoutes from './routes/crud.js';
import searchRoutes from './routes/search.js';

const app = express();

// Behind nginx / Caddy / IIS the real client address comes from X-Forwarded-For (needed for the login throttle).
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', async (req, res, next) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: config.db.database });
    } catch (error) {
        next(error);
    }
});

// Public: health check and login. Everything below requireAuth needs a valid login token.
app.use('/api/auth', authRoutes);
app.get('/api/company', readCompany);
app.use('/api', requireAuth);
app.put('/api/company', requireAdmin, updateCompany);

app.use('/api/backup', backupRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/admin', requireAdmin, adminRoutes);
app.use('/api/calls', callsRoutes); // paged search + fast Excel import; must come before the generic /calls/:id routes
app.use('/api', crudRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Production: serve the built web app (npm run build) from the same server, so one process does everything.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
        if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
        return res.sendFile(path.join(distDir, 'index.html'));
    });
}

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    const status = error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
    if (status === 500) console.error(error);
    const message = error.code === 'ER_DUP_ENTRY' ? 'A record with this value already exists' : error.message;
    res.status(status).json({ error: message });
});

try {
    await migrate();
    await ensureAdminUser();
    await ensureCompanyRow();
    app.listen(config.port, () => {
        console.log(`API ready on http://localhost:${config.port} (database: ${config.db.database})`);
    });
} catch (error) {
    console.error('Could not start the API. Is MySQL running and is .env correct?');
    console.error(error.message);
    process.exit(1);
}
