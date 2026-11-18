import { HttpError } from '../lib/mapping.js';
import { verifyToken } from './token.js';
import { findUserById, passwordVersion } from './users.js';

// Protects every route mounted after it. Adds req.user.
export async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token) throw new HttpError(401, 'Please log in');

        let claims;
        try {
            claims = verifyToken(token);
        } catch {
            throw new HttpError(401, 'Your session has expired. Please log in again');
        }

        const user = await findUserById(claims.sub);
        if (!user || passwordVersion(user) !== claims.pv) {
            throw new HttpError(401, 'Your session has expired. Please log in again');
        }
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

export function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') return next(new HttpError(403, 'Only an admin can do this'));
    return next();
}
