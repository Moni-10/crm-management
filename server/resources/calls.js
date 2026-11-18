import { createCrud } from '../lib/crud.js';

// Field keys match the Calling Data page (src/pages/CallingDetails).
export const callFields = [
    { key: 'partyName', col: 'party_name', required: true },
    { key: 'nickname', col: 'nickname' },
    { key: 'contactPerson', col: 'contact_person' },
    { key: 'mobileNumber', col: 'mobile' },
    { key: 'whatsappNumber', col: 'whatsapp' },
    { key: 'email', col: 'email' },
    { key: 'city', col: 'city' },
    { key: 'state', col: 'state' },
    { key: 'address', col: 'address' },
    { key: 'callDate', col: 'call_date', type: 'date' },
    { key: 'callTime', col: 'call_time' },
    { key: 'duration', col: 'duration', type: 'int' },
    { key: 'machineInterest', col: 'machine_interest' },
    { key: 'machineNumber', col: 'machine_number' },
    { key: 'requirement', col: 'requirement' },
    { key: 'callType', col: 'call_type' },
    { key: 'handledBy', col: 'handled_by' },
    { key: 'notes', col: 'notes' },
    { key: 'status', col: 'status' }
];

export const calls = createCrud({
    table: 'calls',
    entity: 'call',
    nameOf: (r) => r.partyName,
    fields: callFields,
    // Newest call first
    orderBy: 't.call_date DESC, t.call_time DESC, t.created_at DESC',
    searchCols: ['t.party_name', 't.nickname', 't.contact_person', 't.mobile', 't.whatsapp', 't.city']
});
