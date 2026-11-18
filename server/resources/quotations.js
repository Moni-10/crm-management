import { pool } from '../db/pool.js';
import { createCrud } from '../lib/crud.js';

export const quotationFields = [
    { key: 'quotationNumber', col: 'quotation_number', required: true },
    { key: 'quotationDate', col: 'quotation_date', type: 'date' },
    { key: 'partyId', col: 'party_id' },
    { key: 'companyName', col: 'company_name' },
    { key: 'partyName', col: 'party_name' },
    { key: 'salespersonName', col: 'salesperson_name' },
    { key: 'mobile', col: 'mobile' },
    { key: 'address', col: 'address' },
    { key: 'gstTax', col: 'gst_tax', type: 'num' },
    { key: 'discount', col: 'discount', type: 'num' },
    { key: 'validityDate', col: 'validity_date', type: 'date' },
    { key: 'warranty', col: 'warranty' },
    { key: 'installationTerms', col: 'installation_terms' },
    { key: 'bankDetails', col: 'bank_details' },
    { key: 'paymentTerms', col: 'payment_terms' },
    { key: 'deliveryTerms', col: 'delivery_terms' },
    { key: 'notes', col: 'notes' },
    { key: 'status', col: 'status' },
    { key: 'totalAmount', col: 'total_amount', type: 'num' }
];

const num = (value) => Number(value) || 0;

async function attachItems(quotations) {
    if (quotations.length === 0) return quotations;
    const [rows] = await pool.query(
        'SELECT * FROM quotation_items WHERE quotation_id IN (?) ORDER BY position, id',
        [quotations.map((q) => q.id)]
    );
    const byQuotation = new Map();
    for (const row of rows) {
        if (!byQuotation.has(row.quotation_id)) byQuotation.set(row.quotation_id, []);
        byQuotation.get(row.quotation_id).push({
            machineName: row.machine_name || '',
            machineModel: row.machine_model || '',
            specifications: row.specifications || '',
            quantity: Number(row.quantity),
            unitPrice: Number(row.unit_price),
            amount: Number(row.amount)
        });
    }
    return quotations.map((q) => ({ ...q, machineDetails: byQuotation.get(q.id) || [] }));
}

// Line items are replaced wholesale on every save, inside the same transaction.
async function saveItems(conn, id, body) {
    if (!Array.isArray(body.machineDetails)) return;
    await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
    if (body.machineDetails.length === 0) return;
    const values = body.machineDetails.map((m, index) => [
        id,
        index,
        m.machineName || null,
        m.machineModel || null,
        m.specifications || null,
        num(m.quantity),
        num(m.unitPrice),
        num(m.amount)
    ]);
    await conn.query(
        `INSERT INTO quotation_items
            (quotation_id, position, machine_name, machine_model, specifications, quantity, unit_price, amount)
         VALUES ?`,
        [values]
    );
}

export const quotations = createCrud({
    searchCols: ['t.quotation_number', 't.company_name', 't.party_name', 't.mobile', 't.salesperson_name', 't.status'],
    table: 'quotations',
    entity: 'quotation',
    nameOf: (r) => r.quotationNumber,
    fields: quotationFields,
    decorate: attachItems,
    afterSave: saveItems
});
