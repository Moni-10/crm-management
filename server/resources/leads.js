import { createCrud } from '../lib/crud.js';

// Leads added by hand in the CRM. Completely separate from the imported "Old Excel Data" (table crm_leads).
export const leadFields = [
    { key: 'companyName', col: 'company_name', required: true },
    { key: 'contactPerson', col: 'contact_person' },
    { key: 'mobile', col: 'mobile' },
    { key: 'email', col: 'email' },
    { key: 'machineInterest', col: 'machine_interest' },
    { key: 'city', col: 'city' },
    { key: 'state', col: 'state' },
    { key: 'source', col: 'source' },
    { key: 'status', col: 'status' },
    { key: 'followUpDate', col: 'follow_up_date', type: 'date' },
    { key: 'assignedSalesperson', col: 'assigned_salesperson' },
    { key: 'notes', col: 'notes' }
];

export const leads = createCrud({
    table: 'crm_leads',
    entity: 'lead',
    nameOf: (r) => r.companyName,
    fields: leadFields,
    selectSql: `SELECT t.*, s.full_name AS salesperson_name
                FROM crm_leads t LEFT JOIN salespersons s ON s.id = t.assigned_salesperson`,
    mapRow: (row) => ({ salespersonName: row.salesperson_name || '' }),
    orderBy: 't.created_at DESC',
    searchCols: ['t.company_name', 't.contact_person', 't.mobile', 't.email', 't.machine_interest', 't.city', 't.state', 't.notes']
});
