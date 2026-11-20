import { Router } from 'express';
import { clearAccessCache } from '../auth/access.js';
import { ACTION_LABELS, isValidPermission, MODULES } from '../auth/permissions.js';
import { pool } from '../db/pool.js';
import { logActivity } from '../lib/activity.js';
import { HttpError, nowSql } from '../lib/mapping.js';

// Mounted behind requireAuth + requirePermission('roles.manage').
const router = Router();
const handler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const slugify = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const dupAs409 = (e) => { throw e.code === 'ER_DUP_ENTRY' ? new HttpError(409, 'A role with this name already exists') : e; };

async function loadRoles() {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY is_system DESC, name');
    const [perms] = await pool.query('SELECT role_id, permission FROM role_permissions');
    const [counts] = await pool.query('SELECT role, COUNT(*) AS n FROM users GROUP BY role');
    return roles.map((r) => ({
        id: r.id, slug: r.slug, name: r.name, description: r.description, isSystem: !!r.is_system,
        permissions: perms.filter((p) => p.role_id === r.id).map((p) => p.permission),
        userCount: Number(counts.find((c) => c.role === r.slug)?.n || 0)
    }));
}

function cleanPermissions(list) {
    if (!Array.isArray(list)) throw new HttpError(400, 'permissions must be a list');
    const codes = [...new Set(list.map(String))];
    const bad = codes.find((c) => !isValidPermission(c));
    if (bad) throw new HttpError(400, `Unknown permission: ${bad}`);
    // Add/edit/delete/import/export without view makes no sense, so view is implied.
    for (const code of [...codes]) {
        const view = `${code.split('.')[0]}.view`;
        if (isValidPermission(view) && !codes.includes(view)) codes.push(view);
    }
    return codes;
}

async function savePermissions(roleId, codes) {
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    if (codes.length) await pool.query('INSERT INTO role_permissions (role_id, permission) VALUES ?', [codes.map((c) => [roleId, c])]);
    clearAccessCache();
}

// The permission matrix layout for the UI.
router.get('/catalog', (req, res) => {
    res.json({ modules: MODULES.map((m) => ({ ...m, actions: m.actions.map((a) => ({ key: a, label: ACTION_LABELS[a] })) })) });
});

router.get('/', handler(async (req, res) => res.json(await loadRoles())));

router.post('/', handler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) throw new HttpError(400, 'Role name is required');
    const slug = slugify(name);
    if (!slug) throw new HttpError(400, 'Role name must contain letters or numbers');
    const codes = cleanPermissions(req.body?.permissions || []);
    const now = nowSql();
    const [result] = await pool.query(
        'INSERT INTO roles (slug, name, description, is_system, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
        [slug, name, String(req.body?.description || '').trim() || null, now, now]
    ).catch(dupAs409);
    await savePermissions(result.insertId, codes);
    logActivity('role', `${req.user.name} created role ${name}`);
    res.status(201).json((await loadRoles()).find((r) => r.id === result.insertId));
}));

router.put('/:id', handler(async (req, res) => {
    const [[role]] = await pool.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (!role) throw new HttpError(404, 'Role not found');
    if (role.slug === 'admin') throw new HttpError(400, 'The Admin role always has full access and cannot be changed');
    const update = { updated_at: nowSql() };
    if (!role.is_system && req.body?.name !== undefined) {
        update.name = String(req.body.name).trim();
        if (!update.name) throw new HttpError(400, 'Role name is required');
    }
    if (req.body?.description !== undefined) update.description = String(req.body.description).trim() || null;
    await pool.query('UPDATE roles SET ? WHERE id = ?', [update, role.id]).catch(dupAs409);
    if (req.body?.permissions !== undefined) await savePermissions(role.id, cleanPermissions(req.body.permissions));
    logActivity('role', `${req.user.name} updated role ${role.name}`);
    res.json((await loadRoles()).find((r) => r.id === role.id));
}));

router.delete('/:id', handler(async (req, res) => {
    const [[role]] = await pool.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (!role) throw new HttpError(404, 'Role not found');
    if (role.is_system) throw new HttpError(400, 'Built-in roles cannot be deleted');
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users WHERE role = ?', [role.slug]);
    if (n > 0) throw new HttpError(400, `${n} user(s) still have this role. Move them to another role first`);
    await pool.query('DELETE FROM roles WHERE id = ?', [role.id]);
    clearAccessCache();
    logActivity('role', `${req.user.name} deleted role ${role.name}`);
    res.json({ success: true });
}));

export default router;
