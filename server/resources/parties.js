import { pool } from '../db/pool.js';
import { createCrud } from '../lib/crud.js';
import { fromRow } from '../lib/mapping.js';
import { machineFields } from './machines.js';

export const partyFields = [
    { key: 'companyName', col: 'company_name', required: true },
    { key: 'partyName', col: 'party_name', required: true },
    { key: 'partyNickname', col: 'party_nickname' },
    { key: 'alternativeNames', col: 'alternative_names' },
    { key: 'primaryMobile', col: 'primary_mobile', required: true },
    { key: 'alternativeMobile', col: 'alternative_mobile' },
    { key: 'whatsappNumber', col: 'whatsapp_number' },
    { key: 'email', col: 'email' },
    { key: 'partyType', col: 'party_type' },
    { key: 'assignedSalesperson', col: 'assigned_salesperson' },
    { key: 'partyStatus', col: 'party_status' },
    { key: 'followUpDate', col: 'follow_up_date', type: 'date' },
    { key: 'fullAddress', col: 'full_address' },
    { key: 'area', col: 'area' },
    { key: 'city', col: 'city' },
    { key: 'district', col: 'district' },
    { key: 'state', col: 'state' },
    { key: 'country', col: 'country' },
    { key: 'pincode', col: 'pincode' },
    { key: 'locationName', col: 'location_name' },
    { key: 'mapsUrl', col: 'maps_url' },
    { key: 'latitude', col: 'latitude', type: 'num' },
    { key: 'longitude', col: 'longitude', type: 'num' },
    { key: 'clientRequirements', col: 'client_requirements' },
    { key: 'remarks', col: 'remarks' }
];

// Attaches each party's machines so the client can search/show them without extra calls.
async function attachMachines(parties) {
    if (parties.length === 0) return parties;
    const [rows] = await pool.query('SELECT * FROM machines WHERE party_id IN (?)', [parties.map((p) => p.id)]);
    const byParty = new Map();
    for (const row of rows) {
        if (!byParty.has(row.party_id)) byParty.set(row.party_id, []);
        byParty.get(row.party_id).push(fromRow(machineFields, row));
    }
    return parties.map((p) => ({ ...p, machines: byParty.get(p.id) || [] }));
}

const clean = (value) => String(value ?? '').trim().toLowerCase();

// Bulk upload: the "salesperson" column may hold a name, nickname, mobile or employee ID.
async function resolveSalespersons(records) {
    const [people] = await pool.query('SELECT id, full_name, nickname, mobile, employee_id FROM salespersons');
    const lookup = new Map();
    for (const p of people) {
        for (const key of [p.full_name, p.nickname, p.mobile, p.employee_id]) {
            if (clean(key)) lookup.set(clean(key), p.id);
        }
    }
    return records.map((record) => {
        const { salesperson, ...rest } = record;
        if (!clean(salesperson) || rest.assignedSalesperson) return { record: rest };
        const id = lookup.get(clean(salesperson));
        return id
            ? { record: { ...rest, assignedSalesperson: id } }
            : { error: `Salesperson "${salesperson}" not found` };
    });
}

export const parties = createCrud({
    searchCols: ['t.company_name', 't.party_name', 't.party_nickname', 't.alternative_names', 't.primary_mobile', 't.alternative_mobile', 't.whatsapp_number', 't.email', 't.city', 't.area', 't.district', 't.state', 't.pincode', 't.location_name', 't.full_address', 's.full_name'],
    prepareImport: resolveSalespersons,
    table: 'parties',
    entity: 'party',
    nameOf: (r) => r.companyName,
    fields: partyFields,
    selectSql: `SELECT t.*, s.full_name AS salesperson_name
                FROM parties t LEFT JOIN salespersons s ON s.id = t.assigned_salesperson`,
    mapRow: (row) => ({ salespersonName: row.salesperson_name || '' }),
    decorate: attachMachines
});
