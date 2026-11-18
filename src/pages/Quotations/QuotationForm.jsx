import { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Printer, Trash2 } from 'lucide-react';
import { Field, PageHeader, SearchSelect } from '../../components/ui';
import { quotationTotals } from '../../components/quotation/quotationSheet';
import { formatCurrency } from '../../utils/helpers';
import ShareMenu from './ShareMenu';

export const QUOTATION_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected', 'Expired'];
export const EMPTY_ITEM = { machineName: '', machineModel: '', specifications: '', quantity: 1, unitPrice: 0, amount: 0 };

const num = (value) => (value === '' || value === null || value === undefined ? 0 : Number(value) || 0);

/**
 * Create / edit a quotation as a full page.
 *   initial   - quotation (or a blank one) to start from
 *   parties   - options for the party select; choosing one fills in the customer details
 *   onSave    - async (quotation) => void
 *   onPrint / onDownload - open the print screen with the current (even unsaved) values
 */
export default function QuotationForm({ initial, parties, editing, onSave, onCancel, onPrint, onDownload }) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const totals = useMemo(() => quotationTotals(form), [form]);
    // The saved total is always the final payable amount (after discount and GST).
    const withTotal = (next) => ({ ...next, totalAmount: quotationTotals(next).grand });

    const set = (key) => (event) => setForm((f) => withTotal({ ...f, [key]: event.target.value }));

    const selectParty = (partyId) => {
        const party = parties.find((p) => p.id === partyId);
        setForm((f) => party
            ? { ...f, partyId: party.id, companyName: party.companyName, partyName: party.partyName, salespersonName: party.salespersonName || '', mobile: party.primaryMobile, address: party.fullAddress }
            : { ...f, partyId: '' });
    };

    const updateItem = (index, key, value) => {
        setForm((f) => {
            const items = f.machineDetails.map((item, i) => {
                if (i !== index) return item;
                const next = { ...item, [key]: value };
                next.amount = num(next.quantity) * num(next.unitPrice);
                return next;
            });
            return withTotal({ ...f, machineDetails: items });
        });
    };

    const addItem = () => setForm((f) => ({ ...f, machineDetails: [...f.machineDetails, { ...EMPTY_ITEM }] }));
    const removeItem = (index) => setForm((f) => withTotal({ ...f, machineDetails: f.machineDetails.filter((_, i) => i !== index) }));

    const validate = () => {
        const next = {};
        if (!form.quotationNumber.trim()) next.quotationNumber = 'Enter a quotation number';
        if (!form.partyId) next.partyId = 'Select a party';
        if (!form.companyName.trim()) next.companyName = 'Enter the company name';
        if (!form.machineDetails.some((m) => m.machineName.trim())) next.items = 'Add at least one machine';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!validate()) return;
        setBusy(true);
        try {
            await onSave({ ...form, machineDetails: form.machineDetails.filter((m) => m.machineName.trim()) });
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit}>
            <PageHeader title={editing ? 'Edit quotation' : 'New quotation'} subtitle={form.quotationNumber}>
                <button type="button" className="btn" onClick={onCancel}><ArrowLeft /> Back</button>
                <ShareMenu quotation={form} onDownload={() => onDownload(form)} />
                <button type="button" className="btn" onClick={() => onPrint(form)}><Printer /> Print</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Save quotation'}</button>
            </PageHeader>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card">
                    <div className="card-head"><h3>Quotation details</h3></div>
                    <div className="card-body form-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                        <Field label="Quotation number" required error={errors.quotationNumber} htmlFor="q-number">
                            <input id="q-number" className="input" value={form.quotationNumber} onChange={set('quotationNumber')} />
                        </Field>
                        <Field label="Date" htmlFor="q-date"><input id="q-date" className="input" type="date" value={form.quotationDate} onChange={set('quotationDate')} /></Field>
                        <Field label="Valid until" htmlFor="q-valid"><input id="q-valid" className="input" type="date" value={form.validityDate} onChange={set('validityDate')} /></Field>
                        <Field label="Status" htmlFor="q-status">
                            <select id="q-status" className="select" value={form.status} onChange={set('status')}>
                                {[...new Set([...QUOTATION_STATUSES, form.status])].map((s) => <option key={s}>{s}</option>)}
                            </select>
                        </Field>
                    </div>
                </div>

                <div className="card">
                    <div className="card-head"><h3>Customer</h3></div>
                    <div className="card-body form-grid">
                        <Field label="Party" required error={errors.partyId} className="span-2" htmlFor="q-party" hint="Choosing a party fills in the details below. You can still edit them.">
                            <SearchSelect id="q-party" value={form.partyId} onChange={selectParty} placeholder="Select a party" searchPlaceholder="Search parties..."
                                options={parties.map((p) => ({ value: p.id, label: p.companyName, sub: [p.partyName, p.city].filter(Boolean).join(' · ') }))} />
                        </Field>
                        <Field label="Company name" required error={errors.companyName} htmlFor="q-company"><input id="q-company" className="input" value={form.companyName} onChange={set('companyName')} /></Field>
                        <Field label="Contact person" htmlFor="q-contact"><input id="q-contact" className="input" value={form.partyName} onChange={set('partyName')} /></Field>
                        <Field label="Mobile" htmlFor="q-mobile"><input id="q-mobile" className="input" type="tel" value={form.mobile} onChange={set('mobile')} /></Field>
                        <Field label="Salesperson" htmlFor="q-sp"><input id="q-sp" className="input" value={form.salespersonName} onChange={set('salespersonName')} /></Field>
                        <Field label="Address" className="span-2" htmlFor="q-address"><textarea id="q-address" className="textarea" style={{ minHeight: 64 }} value={form.address} onChange={set('address')} /></Field>
                    </div>
                </div>

                <div className="card">
                    <div className="card-head">
                        <h3>Machines</h3>
                        <button type="button" className="btn btn-sm" onClick={addItem}><Plus /> Add machine</button>
                    </div>
                    {errors.items && <div className="alert error" role="alert" style={{ margin: '16px 20px 0' }}><span>{errors.items}</span></div>}
                    <div className="table-wrap">
                        <table className="table items-table">
                            <thead>
                                <tr>
                                    <th style={{ minWidth: 180 }}>Machine</th>
                                    <th style={{ minWidth: 110 }}>Model</th>
                                    <th style={{ minWidth: 200 }}>Specifications</th>
                                    <th style={{ width: 84 }}>Qty</th>
                                    <th style={{ width: 130 }}>Unit price (₹)</th>
                                    <th className="num" style={{ width: 130 }}>Amount</th>
                                    <th style={{ width: 48 }}><span className="sr-only">Remove</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.machineDetails.map((item, index) => (
                                    <tr key={index}>
                                        <td><input className="input" aria-label="Machine name" value={item.machineName} onChange={(e) => updateItem(index, 'machineName', e.target.value)} /></td>
                                        <td><input className="input" aria-label="Model" value={item.machineModel} onChange={(e) => updateItem(index, 'machineModel', e.target.value)} /></td>
                                        <td><input className="input" aria-label="Specifications" value={item.specifications} onChange={(e) => updateItem(index, 'specifications', e.target.value)} /></td>
                                        <td><input className="input" type="number" min="0" aria-label="Quantity" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} /></td>
                                        <td><input className="input" type="number" min="0" aria-label="Unit price" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} /></td>
                                        <td className="num"><strong>{formatCurrency(item.amount)}</strong></td>
                                        <td>
                                            {form.machineDetails.length > 1 && (
                                                <button type="button" className="icon-btn danger sm" onClick={() => removeItem(index)} aria-label="Remove machine"><Trash2 /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="card-body form-grid" style={{ alignItems: 'start' }}>
                        <div className="form-grid span-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                            <Field label="Discount (₹)" htmlFor="q-discount"><input id="q-discount" className="input" type="number" min="0" value={form.discount} onChange={set('discount')} /></Field>
                            <Field label="GST (%)" htmlFor="q-gst" hint="Leave 0 if GST is extra."><input id="q-gst" className="input" type="number" min="0" max="100" step="0.5" value={form.gstTax} onChange={set('gstTax')} /></Field>
                        </div>
                        <div className="totals span-2" aria-live="polite">
                            <div><span>Sub total</span><span className="tabular">{formatCurrency(totals.subtotal)}</span></div>
                            {totals.discount > 0 && <div><span>Discount</span><span className="tabular">- {formatCurrency(totals.discount)}</span></div>}
                            {totals.gstPercent > 0 && <div><span>GST @ {totals.gstPercent}%</span><span className="tabular">{formatCurrency(totals.gst)}</span></div>}
                            <div className="grand"><span>Total</span><span className="tabular">{formatCurrency(totals.grand)}</span></div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-head"><h3>Terms</h3></div>
                    <div className="card-body form-grid">
                        <Field label="Payment terms" htmlFor="q-pay"><textarea id="q-pay" className="textarea" value={form.paymentTerms} onChange={set('paymentTerms')} /></Field>
                        <Field label="Delivery terms" htmlFor="q-del"><textarea id="q-del" className="textarea" value={form.deliveryTerms} onChange={set('deliveryTerms')} /></Field>
                        <Field label="Warranty" htmlFor="q-war"><textarea id="q-war" className="textarea" value={form.warranty} onChange={set('warranty')} /></Field>
                        <Field label="Installation terms" htmlFor="q-ins"><textarea id="q-ins" className="textarea" value={form.installationTerms} onChange={set('installationTerms')} /></Field>
                        <Field label="Bank details" htmlFor="q-bank"><textarea id="q-bank" className="textarea" value={form.bankDetails} onChange={set('bankDetails')} /></Field>
                        <Field label="Notes" htmlFor="q-notes"><textarea id="q-notes" className="textarea" value={form.notes} onChange={set('notes')} /></Field>
                    </div>
                </div>
            </div>
        </form>
    );
}
