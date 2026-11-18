import { createCrud } from '../lib/crud.js';

export const eventFields = [
    { key: 'title', col: 'title', required: true },
    { key: 'date', col: 'date', type: 'date', required: true },
    { key: 'eventType', col: 'event_type' },
    { key: 'status', col: 'status' },
    { key: 'eventTime', col: 'event_time' },
    { key: 'salespersonId', col: 'salesperson_id' },
    { key: 'notes', col: 'notes' },
    { key: 'partyId', col: 'party_id' }
];

export const events = createCrud({
    searchCols: ['t.title'],
    table: 'events',
    entity: 'event',
    nameOf: (r) => r.title,
    fields: eventFields,
    orderBy: 't.`date`'
});
