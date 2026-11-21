import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Search, Target, Trash2 } from 'lucide-react';
import { leadsApi, salespersonsApi } from '../../api';
import ExportButton from '../../components/bulk/ExportButton';
import { Badge, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, Pager, useConfirm } from '../../components/ui';
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

const fmt = (n) => Number(n).toLocaleString('en-IN');
const FILTERS = { status: '', sort: 'newest' };

export default function Leads() {
    const { can } = useAuth();
    const confirm = useConfirm();
    const people = useLoad(() => salespersonsApi.list());
    const [searchParams] = useSearchParams();
    const [q, setQ] = useState(searchParams.get('q') || '');
    const [filters, setFilters] = useState(FILTERS);
    const [applied, setApplied] = useState({ q: searchParams.get('q') || '', ...FILTERS });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [result, setResult] = useState({ items: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [form, setForm] = useState(null);
    const [highlightNo, setHighlightNo] = useState(null);
    const requestId = useRef(0);

    // Search/filters go to the server (never the whole table to the browser); typing waits a moment first.
    useEffect(() => {
        const t = setTimeout(() => { setApplied({ q, ...filters }); setPage(1); setHighlightNo(null); }, 350);
        return () => clearTimeout(t);
    }, [q, filters]);

    const paramsKey = JSON.stringify({ ...applied, page, pageSize, reloadKey });
    useEffect(() => {
        const id = ++requestId.current;
        setLoading(true);
        const { reloadKey: _r, ...params } = JSON.parse(paramsKey);
        leadsApi.query(params)
            .then((data) => { if (id === requestId.current) { setResult(data); setError(''); } })
            .catch((e) => { if (id === requestId.current) setError(e.message); })
            .finally(() => { if (id === requestId.current) setLoading(false); });
    }, [paramsKey]);

    const reload = () => setReloadKey((n) => n + 1);

    // "Go to lead no. N": ask the server which page holds it, open that page and highlight the row.
    const jumpToNumber = async (n) => {
        if (applied.sort !== 'newest' && applied.sort !== 'oldest') return 'Set the order to Newest first or Oldest first to jump to a lead number.';
        const r = await leadsApi.locate({ number: n, q: applied.q, status: applied.status, sort: applied.sort, pageSize });
        if (!r.found) return false;
        setPage(r.page);
        setHighlightNo(n);
        return true;
    };
    useEffect(() => {
        if (highlightNo == null || loading) return;
        document.querySelector(`tr[data-no="${highlightNo}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [highlightNo, loading, result]);
    const hasFilters = Boolean(q || filters.status);

    // Export fetches every matching lead from the server in pages of 1000 (up to 50,000).
    const exportRecords = async () => {
        const records = [];
        for (let p = 1; p <= 50; p += 1) {
            const data = await leadsApi.query({ ...applied, page: p, pageSize: 1000 });
            records.push(...data.items);
            if (records.length >= data.total) break;
        }
        return [{ name: 'Leads', columns: LEAD_COLUMNS, records }];
    };

    const remove = async (lead) => {
        const ok = await confirm({ title: `Delete ${lead.companyName}?`, message: 'This lead is removed. Imported Excel data is not affected.', confirmLabel: 'Delete lead', danger: true });
        if (!ok) return;
        try {
            await leadsApi.remove(lead.id);
            showToast('Lead deleted');
            reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (people.loading && !people.data) return <Loading label="Loading leads..." />;

    return (
        <div>
            <PageHeader title="Leads" subtitle={`${fmt(result.total)} lead${result.total === 1 ? '' : 's'}${hasFilters ? ' match' : ' added in the CRM'}`}>
                {can('leads.export') && <ExportButton filename="leads" count={result.total} getSheets={exportRecords} />}
                {can('leads.create') && <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus /> Add lead</button>}
            </PageHeader>

            <div className="toolbar">
                <div className="search-field grow">
                    <Search aria-hidden="true" />
                    <input className="input" type="search" placeholder="Search name, phone, email, machine, city, notes..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search leads" />
                </div>
                <select className="select" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} aria-label="Status" style={{ width: 'auto' }}>
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select className="select" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} aria-label="Sort" style={{ width: 'auto' }}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="followup">Next follow-up</option>
                    <option value="name">Name A-Z</option>
                </select>
            </div>

            <div className="card" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
                {result.items.length === 0 && !loading ? (
                    <EmptyState icon={Target} title={hasFilters ? 'No leads match' : 'No leads yet'}
                        action={!hasFilters && can('leads.create') && <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus /> Add your first lead</button>}>
                        {hasFilters ? 'Try a different search or status.' : 'Add a lead to start tracking it. The imported Excel records are under Old Excel Data.'}
                    </EmptyState>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>No.</th><th>Lead</th><th>Contact</th><th>Machine</th><th>Location</th><th>Status</th><th>Follow-up</th><th>Assigned</th><th className="actions" /></tr></thead>
                            <tbody>
                                {result.items.map((l) => (
                                    <tr key={l.id} data-no={l.leadNo} className={l.leadNo === highlightNo ? 'row-found' : undefined}>
                                        <td className="hint">{fmt(l.leadNo)}</td>
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
                <Pager
                    page={page} pageSize={pageSize} total={result.total} loading={loading}
                    onPage={(n) => { setPage(n); setHighlightNo(null); }}
                    onPageSize={(n) => { setPageSize(n); setPage(1); setHighlightNo(null); }}
                    numberLabel="lead no." onJumpNumber={jumpToNumber}
                />
            </div>
            {form && <LeadForm lead={form.id ? form : null} salespersons={people.data || []} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
        </div>
    );
}

