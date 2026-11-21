import { createCrud } from '../lib/crud.js';

// Follow-up Log: one row per follow-up taken. Built to hold hundreds of thousands of rows (numbered, newest on top).
export const followupFields = [
    { key: 'partyName', col: 'party_name', required: true },
    { key: 'contactPerson', col: 'contact_person' },
    { key: 'mobile', col: 'mobile' },
    { key: 'email', col: 'email' },
    { key: 'machine', col: 'machine' },
    { key: 'location', col: 'location' },
    { key: 'followUpDate', col: 'followup_date', type: 'date' },
    { key: 'nextFollowUpDate', col: 'next_followup_date', type: 'date' },
    { key: 'takenBy', col: 'taken_by' },
    { key: 'outcome', col: 'outcome' },
    { key: 'notes', col: 'notes' },
    { key: 'leadId', col: 'lead_id' }
];

export const followuplog = createCrud({
    table: 'followup_log',
    entity: 'follow-up',
    nameOf: (r) => r.partyName,
    fields: followupFields,
    mapRow: (row) => ({ followUpNo: row.followup_no }), // read-only: the number is never taken from the client
    orderBy: 't.followup_no DESC',
    numberCol: 't.followup_no',
    searchColumn: 't.search_text',
    phoneCols: ['t.mobile'],
    searchCols: ['t.party_name', 't.contact_person', 't.mobile', 't.email', 't.machine', 't.location', 't.taken_by', 't.notes'],
    filterCols: { outcome: 't.outcome', takenBy: 't.taken_by', leadId: 't.lead_id' },
    sorts: {
        newest: 't.followup_no DESC',
        oldest: 't.followup_no ASC',
        date: 't.followup_date IS NULL, t.followup_date DESC, t.followup_no DESC',
        next: 't.next_followup_date IS NULL, t.next_followup_date ASC, t.followup_no DESC'
    }
});
