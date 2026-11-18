import { pool } from '../db/pool.js';
import { logActivity } from './activity.js';
import { HttpError, fromRow, generateId, isoToSql, nowSql, toRow } from './mapping.js';

/**
 * Builds list/get/create/update/remove for one table.
 *
 * options:
 *   table, fields   - table name and field definitions (see mapping.js)
 *   selectSql       - optional custom SELECT (use alias `t` for the main table)
 *   orderBy         - ORDER BY clause
 *   mapRow(row)     - optional extra mapping of a row (joined columns etc.)
 *   decorate(items) - optional async step that adds child data to a list of items
 *   afterSave(conn, id, body) - optional hook inside the write transaction
 *   searchCols      - columns (alias-qualified) matched by search(); every word must match one of them
 *   entity, nameOf  - label and name getter used for the activity feed ("Added party ABC")
 *   prepareImport(records)    - optional async step for bulk uploads: resolves references (e.g. a
 *                               salesperson name -> id). Returns one { record } or { error } per input row.
 */
export function createCrud({ table, fields, selectSql, orderBy = 't.created_at', mapRow, decorate, afterSave, prepareImport, searchCols = [], entity, nameOf }) {
    const baseSelect = selectSql || `SELECT t.* FROM \`${table}\` t`;

    const toItems = async (rows) => {
        const items = rows.map((row) => ({ ...fromRow(fields, row), ...(mapRow ? mapRow(row) : {}) }));
        return decorate ? decorate(items) : items;
    };

    const withTransaction = async (work) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const result = await work(conn);
            await conn.commit();
            return result;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    };

    const log = (action, item) => {
        if (entity && item) logActivity(entity, `${action} ${entity} "${nameOf ? nameOf(item) : item.id}"`);
    };

    const get = async (id) => {
        const [rows] = await pool.query(`${baseSelect} WHERE t.id = ?`, [id]);
        if (rows.length === 0) return null;
        return (await toItems(rows))[0];
    };

    return {
        table,
        fields,
        decorate,

        // Creates each row on its own so one bad row does not block the rest.
        async bulkCreate(records) {
            const prepared = prepareImport
                ? await prepareImport(records)
                : records.map((record) => ({ record }));
            const result = { created: 0, failed: 0, errors: [] };
            for (const [index, entry] of prepared.entries()) {
                try {
                    if (entry.error) throw new HttpError(400, entry.error);
                    await this.create(entry.record, { silent: true });
                    result.created += 1;
                } catch (error) {
                    result.failed += 1;
                    const message = error.code === 'ER_DUP_ENTRY' ? 'Duplicate value' : error.message;
                    result.errors.push({ row: index + 1, message });
                }
            }
            if (entity && result.created > 0) logActivity(entity, `Bulk uploaded ${result.created} ${entity} records`);
            return result;
        },

        // Every word of the term must appear in at least one of searchCols.
        async search(term, limit = 5) {
            const words = String(term).trim().split(/\s+/).filter(Boolean).slice(0, 6);
            if (words.length === 0 || searchCols.length === 0) return [];
            const params = [];
            const conditions = words.map((word) => {
                const like = `%${word.replace(/[\\%_]/g, '\\$&')}%`;
                searchCols.forEach(() => params.push(like));
                return `(${searchCols.map((col) => `${col} LIKE ?`).join(' OR ')})`;
            });
            const [rows] = await pool.query(
                `${baseSelect} WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT ?`,
                [...params, Number(limit)]
            );
            return toItems(rows);
        },

        async list() {
            const [rows] = await pool.query(`${baseSelect} ORDER BY ${orderBy}`);
            return toItems(rows);
        },

        get,

        async create(body, { silent = false } = {}) {
            const id = body.id || generateId();
            const row = toRow(fields, body);
            for (const field of fields) {
                if (field.required && !(field.col in row)) throw new HttpError(400, `${field.key} is required`);
            }
            const now = nowSql();
            await withTransaction(async (conn) => {
                await conn.query(`INSERT INTO \`${table}\` SET ?`, [{
                    id,
                    ...row,
                    created_at: isoToSql(body.createdAt) ?? now,
                    updated_at: now
                }]);
                if (afterSave) await afterSave(conn, id, body);
            });
            const created = await get(id);
            if (!silent) log('Added', created);
            return created;
        },

        async update(id, body, { silent = false } = {}) {
            const row = toRow(fields, body);
            const updated = await withTransaction(async (conn) => {
                const [result] = await conn.query(
                    `UPDATE \`${table}\` SET ? WHERE id = ?`,
                    [{ ...row, updated_at: nowSql() }, id]
                );
                if (result.affectedRows === 0) return false;
                if (afterSave) await afterSave(conn, id, body);
                return true;
            });
            const item = updated ? await get(id) : null;
            if (!silent) log('Updated', item);
            return item;
        },

        async remove(id) {
            const existing = entity ? await get(id) : null;
            const [result] = await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
            if (result.affectedRows > 0) log('Deleted', existing);
            return result.affectedRows > 0;
        }
    };
}
