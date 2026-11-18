import { pool } from '../db/pool.js';
import { generateId, nowSql } from './mapping.js';

// Records "who did what" for the dashboard feed. Logging must never break the actual change.
export async function logActivity(type, description) {
    try {
        const now = nowSql();
        await pool.query('INSERT INTO activity SET ?', [{
            id: generateId(),
            type,
            description,
            created_at: now,
            updated_at: now
        }]);
    } catch (error) {
        console.error('Could not write activity log:', error.message);
    }
}
