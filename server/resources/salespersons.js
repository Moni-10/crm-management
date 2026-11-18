import { createCrud } from '../lib/crud.js';

export const salespersonFields = [
    { key: 'fullName', col: 'full_name', required: true },
    { key: 'nickname', col: 'nickname' },
    { key: 'mobile', col: 'mobile', required: true },
    { key: 'whatsapp', col: 'whatsapp' },
    { key: 'email', col: 'email' },
    { key: 'department', col: 'department' },
    { key: 'employeeId', col: 'employee_id' },
    { key: 'photo', col: 'photo' },
    { key: 'notes', col: 'notes' }
];

export const salespersons = createCrud({
    searchCols: ['t.full_name', 't.nickname', 't.mobile', 't.whatsapp', 't.email', 't.employee_id', 't.department'],
    table: 'salespersons',
    entity: 'salesperson',
    nameOf: (r) => r.fullName,
    fields: salespersonFields,
    orderBy: 't.full_name'
});
