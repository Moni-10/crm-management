import { pool } from '../db/pool.js';
import { HttpError } from '../lib/mapping.js';
import { ALL_PERMISSIONS } from './permissions.js';

// role slug -> Set of permission codes. Cleared whenever roles change.
let cache = new Map();
export const clearAccessCache = () => { cache = new Map(); };

export async function permissionsForRole(slug) {
    if (slug === 'admin') return new Set(ALL_PERMISSIONS);
    if (!cache.has(slug)) {
        const [rows] = await pool.query(
            'SELECT rp.permission FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.slug = ?', [slug]
        );
        cache.set(slug, new Set(rows.map((r) => r.permission)));
    }
    return cache.get(slug);
}

// What the client receives about a user.
export async function presentUser(user) {
    return {
        id: user.id, name: user.name, email: user.email, role: user.role,
        permissions: [...(await permissionsForRole(user.role))]
    };
}

// Route guard: requirePermission('parties.edit'). Must run after requireAuth.
export const requirePermission = (code) => async (req, res, next) => {
    try {
        const perms = await permissionsForRole(req.user.role);
        if (!perms.has(code)) throw new HttpError(403, 'You do not have permission to do this');
        req.permissions = perms;
        next();
    } catch (error) {
        next(error);
    }
};
