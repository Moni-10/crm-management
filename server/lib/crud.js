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
 *   searchColumn    - optional single column holding all searchable text (a generated column); query() searches just this
 *   phoneCols       - optional phone columns; a phone-like search word is matched against only these
 *   numberCol       - optional running-number column (e.g. 't.lead_no'); enables locate() = "which page is record no. N on"
 *   filterCols      - { filterName: 'alias.column' } equality filters accepted by query()
 *   sorts           - { sortName: 'ORDER BY expression' } sort choices for query() (first one is the default)
 *   entity, nameOf  - label and name getter used for the activity feed ("Added party ABC")
 *   prepareImport(records)    - optional async step for bulk uploads: resolves references (e.g. a
 *                               salesperson name -> id). Returns one { record } or { error } per input row.
 */
export function createCrud({ table, fields, selectSql, orderBy = 't.created_at', mapRow, decorate, afterSave, prepareImport, searchCols = [], searchColumn, phoneCols = [], numberCol, filterCols = {}, sorts, entity, nameOf }) {
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

    // WHERE pieces for a free-text search. Every word must match; a phone-like word only looks at the phone columns.
    // phoneMode 'prefix' matches numbers that START with the typed digits (uses the phone index, instant); 'contains' matches anywhere.
    const searchClause = (q, phoneMode = 'contains') => {
        const where = [];
        const params = [];
        const esc = (w) => `%${w.replace(/[\\%_]/g, '\\$&')}%`;
        const words = searchColumn || searchCols.length ? String(q).trim().split(/\s+/).filter(Boolean).slice(0, 6) : [];
        for (const word of words) {
            if (phoneCols.length && PHONE_WORD.test(word)) {
                let digits = word.replace(/\D/g, '');
                if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
                else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
                phoneCols.forEach(() => params.push(phoneMode === 'prefix' ? `${digits}%` : esc(digits)));
                where.push(`(${phoneCols.map((col) => `${col} LIKE ?`).join(' OR ')})`);
            } else if (searchColumn) {
                params.push(esc(word));
                where.push(`${searchColumn} LIKE ?`);
            } else {
                searchCols.forEach(() => params.push(esc(word)));
                where.push(`(${searchCols.map((col) => `${col} LIKE ?`).join(' OR ')})`);
            }
        }
        return { where, params };
    };

    const PHONE_WORD = /^\+?\d[\d-]{6,}$/;
    const hasPhoneWord = (q) => phoneCols.length > 0 && String(q).trim().split(/\s+/).some((w) => PHONE_WORD.test(w));
    const whereOf = (q, filters = {}, phoneMode = 'contains') => {
        const search = searchClause(q, phoneMode);
        const where = [...search.where];
        const params = [...search.params];
        for (const [name, col] of Object.entries(filterCols)) {
            const value = filters[name];
            if (value !== undefined && value !== null && String(value) !== '') { where.push(`${col} = ?`); params.push(value); }
        }
        return { where, params, clause: where.length ? ` WHERE ${where.join(' AND ')}` : '' };
    };
    // True when every column used lives on the main table (no joins needed to count or locate).
    const lean = [...searchCols, ...Object.values(filterCols), searchColumn, numberCol, ...phoneCols].filter(Boolean).every((c) => c.startsWith('t.'));
    const DEEP_OFFSET = 2000;

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
            const { where, params } = searchClause(term);
            if (where.length === 0) return [];
            const [rows] = await pool.query(
                `${baseSelect} WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ?`,
                [...params, Number(limit)]
            );
            return toItems(rows);
        },

        // Server-side search + filters + paging, so a page never has to load every record.
        // -> { items, total, page, pageSize }. Search words must all match; filters are exact matches.
        // Deep pages (page 5000 of 300k) first pick the 50 ids from the index alone, then load only those rows, so they stay fast.
        async query({ q = '', filters = {}, sort, page = 1, pageSize = 50 } = {}) {
            const size = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 1000);
            const pg = Math.max(parseInt(page, 10) || 1, 1);
            const offset = (pg - 1) * size;
            const order = (sorts && (sorts[sort] || Object.values(sorts)[0])) || orderBy;

            const attempt = async (phoneMode) => {
                const { clause, params } = whereOf(q, filters, phoneMode);
                const countSql = lean
                    ? `SELECT COUNT(*) AS total FROM \`${table}\` t${clause}`
                    : `SELECT COUNT(*) AS total FROM (${baseSelect}${clause}) c`;
                const loadPage = async () => {
                    if (lean && offset >= DEEP_OFFSET) {
                        const [idRows] = await pool.query(`SELECT t.id FROM \`${table}\` t${clause} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, size, offset]);
                        if (idRows.length === 0) return [];
                        const [rows] = await pool.query(`${baseSelect} WHERE t.id IN (?) ORDER BY ${order}`, [idRows.map((r) => r.id)]);
                        return rows;
                    }
                    const [rows] = await pool.query(`${baseSelect}${clause} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, size, offset]);
                    return rows;
                };
                const [[[{ total }]], rows] = await Promise.all([pool.query(countSql, params), loadPage()]);
                return { rows, total: Number(total) };
            };

            const phoneSearch = hasPhoneWord(q);
            let result = await attempt(phoneSearch ? 'prefix' : 'contains');
            if (phoneSearch && result.total === 0) result = await attempt('contains');
            return { items: await toItems(result.rows), total: result.total, page: pg, pageSize: size };
        },

        // Which page is record number N on, for the current search/filters and order (newest = highest number first)?
        // -> { found, page, position }. Used by "go to lead no. 2345".
        async locate({ number, q = '', filters = {}, sort, pageSize = 50 } = {}) {
            if (!numberCol || !lean) throw new HttpError(400, 'This list cannot jump to a number');
            const n = Number(number);
            if (!Number.isInteger(n) || n < 1) return { found: false };
            const size = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 1000);
            // Same two-step as query(): a phone search first matches numbers that start with the digits, then anywhere.
            let mode = hasPhoneWord(q) ? 'prefix' : 'contains';
            let { where, params } = whereOf(q, filters, mode);
            const exists = async () => (await pool.query(`SELECT 1 AS x FROM \`${table}\` t WHERE ${[...where, `${numberCol} = ?`].join(' AND ')} LIMIT 1`, [...params, n]))[0].length > 0;
            let found = await exists();
            if (!found && mode === 'prefix') {
                mode = 'contains';
                ({ where, params } = whereOf(q, filters, mode));
                found = await exists();
            }
            if (!found) return { found: false };
            const oldestFirst = sort === 'oldest';
            const ahead = [...where, `${numberCol} ${oldestFirst ? '<' : '>'} ?`];
            const [[{ n: before }]] = await pool.query(`SELECT COUNT(*) AS n FROM \`${table}\` t WHERE ${ahead.join(' AND ')}`, [...params, n]);
            return { found: true, page: Math.floor(Number(before) / size) + 1, position: Number(before) + 1 };
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


