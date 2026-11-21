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
    mapRow: (row) => ({ salespersonName: row.salesperson_name || '', leadNo: row.lead_no }), // leadNo is read-only
    orderBy: 't.lead_no DESC',
    numberCol: 't.lead_no',
    filterCols: { status: 't.status', source: 't.source', assigned: 't.assigned_salesperson', city: 't.city', state: 't.state' },
    sorts: {
        newest: 't.lead_no DESC',
        oldest: 't.lead_no ASC',
        followup: 't.follow_up_date IS NULL, t.follow_up_date ASC, t.lead_no DESC',
        name: 't.company_name ASC'
    },
    searchColumn: 't.search_text',
    phoneCols: ['t.mobile'],
    searchCols: ['t.company_name', 't.contact_person', 't.mobile', 't.email', 't.machine_interest', 't.city', 't.state', 't.notes']
});
