import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Target, Trash2 } from 'lucide-react';
import { leadsApi, salespersonsApi } from '../../api';
import ExportButton from '../../components/bulk/ExportButton';
import { Badge, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, useConfirm } from '../../components/ui';
import { LEAD_COLUMNS } from '../../config/columns';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useLoad';
import { formatDate, showToast } from '../../utils/helpers';

// Leads added by hand. Separate from "Old Excel Data" (the imported Excel records).
const STATUSES = ['New', 'Contacted', 'Follow-up', 'Interested', 'Won', 'Lost'];
const TONES = { New: 'info', Contacted: 'neutral', 'Follow-up': 'warning', Interested: 'info', Won: 'success', Lost: 'danger' };
const EMPTY = { companyName: '', contactPerson: '', mobile: '', email: '', machineInterest: '', city: '', state: '', source: 'Manual', status: 'New', followUpDate: '', assignedSalesperson: '', notes: '' };

function LeadForm({ lead, salespersons, onClose, onSaved }) {
    const editing = Boolean(lead?.id);
    const [form, setForm] = useState({ ...EMPTY, ...(lead || {}) });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        if (!form.companyName.trim()) return setError('Enter the company or lead name');
        setBusy(true);
        try {
            const { salespersonName: _ignored, ...payload } = form;
            if (editing) await leadsApi.update({ ...payload, id: lead.id });
            else await leadsApi.create(payload);
            showToast(editing ? 'Lead updated' : 'Lead added');
            onSaved();
        } catch (err) {
            showToast(err.message || 'Could not save', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            as="form" size="lg" title={editing ? 'Edit lead' : 'Add lead'} onClose={onClose} onSubmit={submit}
            footer={(
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Add lead'}</button>
                </>
            )}
        >
            <div className="form-grid">
                <Field label="Company / lead name" required error={error} className="span-2" htmlFor="l-company">
                    <input id="l-company" className="input" value={form.companyName} onChange={set('companyName')} />
                </Field>
                <Field label="Contact person" htmlFor="l-person"><input id="l-person" className="input" value={form.contactPerson} onChange={set('contactPerson')} /></Field>
                <Field label="Mobile" htmlFor="l-mobile"><input id="l-mobile" className="input" value={form.mobile} onChange={set('mobile')} /></Field>
                <Field label="Email" htmlFor="l-email"><input id="l-email" className="input" type="email" value={form.email} onChange={set('email')} /></Field>
                <Field label="Machine interest" htmlFor="l-machine"><input id="l-machine" className="input" value={form.machineInterest} onChange={set('machineInterest')} placeholder="e.g. Paper bag making machine" /></Field>
                <Field label="City" htmlFor="l-city"><input id="l-city" className="input" value={form.city} onChange={set('city')} /></Field>
                <Field label="State" htmlFor="l-state"><input id="l-state" className="input" value={form.state} onChange={set('state')} /></Field>
                <Field label="Status" htmlFor="l-status">
                    <select id="l-status" className="select" value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                </Field>
                <Field label="Next follow-up" htmlFor="l-follow"><input id="l-follow" className="input" type="date" value={form.followUpDate} onChange={set('followUpDate')} /></Field>
                <Field label="Source" htmlFor="l-source"><input id="l-source" className="input" value={form.source} onChange={set('source')} placeholder="Manual, Website, Exhibition..." /></Field>
                <Field label="Assigned to" htmlFor="l-assigned">
                    <select id="l-assigned" className="select" value={form.assignedSalesperson} onChange={set('assignedSalesperson')}>
                        <option value="">Not assigned</option>
                        {salespersons.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                    </select>
                </Field>
                <Field label="Notes" className="span-2" htmlFor="l-notes"><textarea id="l-notes" className="input" rows={3} value={form.notes} onChange={set('notes')} /></Field>
            </div>
        </Modal>
    );
}

export default function Leads() {
    const { can } = useAuth();
    const confirm = useConfirm();
    const { data, loading, error, reload } = useLoad(async () => {
        const [leads, salespersons] = await Promise.all([leadsApi.list(), salespersonsApi.list()]);
        return { leads, salespersons };
    });
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [form, setForm] = useState(null);

    const leads = data?.leads;
    const visible = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        return (leads || []).filter((l) => {
            if (status && l.status !== status) return false;
            const haystack = [l.companyName, l.contactPerson, l.mobile, l.email, l.machineInterest, l.city, l.state, l.source, l.salespersonName, l.notes].join(' ').toLowerCase();
            return words.every((w) => haystack.includes(w));
        });
    }, [leads, query, status]);

    const remove = async (lead) => {
        const ok = await confirm({ title: `Delete ${lead.companyName}?`, message: 'This lead is removed. Imported Excel data is not affected.', confirmLabel: 'Delete lead', danger: true });
        if (!ok) return;
        try {
            await leadsApi.remove(lead.id);
            showToast('Lead deleted');
            reload({ silent: true });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (loading && !data) return <Loading label="Loading leads..." />;

    return (
        <div>
            <PageHeader title="Leads" subtitle={`${leads.length} lead${leads.length === 1 ? '' : 's'} added in the CRM`}>
                {can('leads.export') && <ExportButton filename="leads" count={visible.length} getSheets={() => [{ name: 'Leads', columns: LEAD_COLUMNS, records: visible }]} />}
                {can('leads.create') && <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus /> Add lead</button>}
            </PageHeader>

            <div className="toolbar">
                <div className="search-field grow">
                    <Search aria-hidden="true" />
                    <input className="input" type="search" placeholder="Search leads..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search leads" />
                </div>
                <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" style={{ width: 'auto' }}>
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
            </div>

            <div className="card">
                {visible.length === 0 ? (
                    <EmptyState icon={Target} title={leads.length === 0 ? 'No leads yet' : 'No leads match'}
                        action={leads.length === 0 && can('leads.create') && <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus /> Add your first lead</button>}>
                        {leads.length === 0 ? 'Add a lead to start tracking it. The imported Excel records are under Old Excel Data.' : 'Try a different search or status.'}
                    </EmptyState>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Lead</th><th>Contact</th><th>Machine</th><th>Location</th><th>Status</th><th>Follow-up</th><th>Assigned</th><th className="actions" /></tr></thead>
                            <tbody>
                                {visible.map((l) => (
                                    <tr key={l.id}>
                                        <td><b>{l.companyName}</b>{l.source && l.source !== 'Manual' && <div className="hint">{l.source}</div>}</td>
                                        <td>{l.contactPerson || '—'}{l.mobile && <div><a href={`tel:${l.mobile}`}>{l.mobile}</a></div>}{l.email && <div className="hint">{l.email}</div>}</td>
                                        <td>{l.machineInterest || '—'}</td>
                                        <td>{[l.city, l.state].filter(Boolean).join(', ') || '—'}</td>
                                        <td><Badge tone={TONES[l.status]}>{l.status}</Badge></td>
                                        <td>{l.followUpDate ? formatDate(l.followUpDate) : '—'}</td>
                                        <td>{l.salespersonName || '—'}</td>
                                        <td className="actions">
                                            {can('leads.edit') && <button type="button" className="icon-btn" onClick={() => setForm(l)} aria-label={`Edit ${l.companyName}`}><Pencil /></button>}
                                            {can('leads.delete') && <button type="button" className="icon-btn danger" onClick={() => remove(l)} aria-label={`Delete ${l.companyName}`}><Trash2 /></button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {form && <LeadForm lead={form.id ? form : null} salespersons={data.salespersons} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload({ silent: true }); }} />}
        </div>
    );
}
