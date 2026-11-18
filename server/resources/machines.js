import { pool } from '../db/pool.js';
import { createCrud } from '../lib/crud.js';

export const machineFields = [
    { key: 'name', col: 'name', required: true },
    { key: 'category', col: 'category' },
    { key: 'model', col: 'model' },
    { key: 'quantity', col: 'quantity', type: 'int' },
    { key: 'purchaseDate', col: 'purchase_date', type: 'date' },
    { key: 'purchaseStatus', col: 'purchase_status' },
    { key: 'partyId', col: 'party_id' }
];

const clean = (value) => String(value ?? '').trim().toLowerCase();

// Bulk upload: the "party" column may hold a company name or the party's primary mobile.
async function resolveParties(records) {
    const [rows] = await pool.query('SELECT id, company_name, primary_mobile FROM parties');
    const lookup = new Map();
    for (const p of rows) {
        lookup.set(clean(p.company_name), p.id);
        lookup.set(clean(p.primary_mobile), p.id);
    }
    return records.map((record) => {
        const { party, ...rest } = record;
        if (!clean(party) || rest.partyId) return { record: rest };
        const id = lookup.get(clean(party));
        return id ? { record: { ...rest, partyId: id } } : { error: `Party "${party}" not found` };
    });
}

export const machines = createCrud({
    searchCols: ['t.name', 't.category', 't.model', 'p.company_name'],
    prepareImport: resolveParties,
    table: 'machines',
    entity: 'machine',
    nameOf: (r) => r.name,
    fields: machineFields,
    selectSql: `SELECT t.*, p.company_name AS party_company
                FROM machines t LEFT JOIN parties p ON p.id = t.party_id`,
    mapRow: (row) => ({ partyName: row.party_company || '' })
});
