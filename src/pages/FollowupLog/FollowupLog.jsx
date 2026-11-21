import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { followupLogApi, salespersonsApi } from '../../api';
import ExportButton from '../../components/bulk/ExportButton';
import { Badge, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, Pager, useConfirm } from '../../components/ui';
import { FOLLOWUP_COLUMNS } from '../../config/columns';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useLoad';
import { formatDate, showToast } from '../../utils/helpers';

// Follow-up Log: every follow-up taken, numbered, newest on top. Built for very large volumes:
// search, filters and paging run on the server; you can jump to any page or follow-up number.
const OUTCOMES = ['Follow-up', 'Interested', 'Call back', 'Quotation sent', 'No answer', 'Not interested', 'Won', 'Lost'];
const TONES = { 'Follow-up': 'neutral', Interested: 'info', 'Call back': 'warning', 'Quotation sent': 'info', 'No answer': 'neutral', 'Not interested': 'danger', Won: 'success', Lost: 'danger' };
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(n).toLocaleString('en-IN');
const FILTERS = { outcome: '', takenBy: '', sort: 'newest' };

function FollowupForm({ item, people, userName, onClose, onSaved }) {
    const editing = Boolean(item?.id);
    const [form, setForm] = useState({
        partyName: '', contactPerson: '', mobile: '', email: '', machine: '', location: '', followUpDate: today(), nextFollowUpDate: '',
        takenBy: userName || '', outcome: 'Follow-up', notes: '', ...(item || {})
    });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        if (!form.partyName.trim()) return setError('Enter the party or company name');
        setBusy(true);
        try {
            const { followUpNo: _n, ...payload } = form;
            if (editing) await followupLogApi.update({ ...payload, id: item.id });
            else await followupLogApi.create(payload);
            showToast(editing ? 'Follow-up updated' : 'Follow-up added');
            onSaved();
        } catch (err) {
            showToast(err.message || 'Could not save', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            as="form" size="lg" title={editing ? `Edit follow-up no. ${item.followUpNo}` : 'Add follow-up'} onClose={onClose} onSubmit={submit}
            footer={(
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Add follow-up'}</button>
                </>
            )}
        >
            <div className="form-grid">
                <Field label="Party / company" required error={error} className="span-2" htmlFor="f-party"><input id="f-party" className="input" value={form.partyName} onChange={set('partyName')} /></Field>
                <Field label="Contact person" htmlFor="f-person"><input id="f-person" className="input" value={form.contactPerson} onChange={set('contactPerson')} /></Field>
                <Field label="Mobile" htmlFor="f-mobile"><input id="f-mobile" className="input" value={form.mobile} onChange={set('mobile')} /></Field>
                <Field label="Email" htmlFor="f-email"><input id="f-email" className="input" type="email" value={form.email} onChange={set('email')} /></Field>
                <Field label="Machine" htmlFor="f-machine"><input id="f-machine" className="input" value={form.machine} onChange={set('machine')} /></Field>
                <Field label="Location" htmlFor="f-location"><input id="f-location" className="input" value={form.location} onChange={set('location')} /></Field>
                <Field label="Outcome" htmlFor="f-outcome">
                    <select id="f-outcome" className="select" value={form.outcome} onChange={set('outcome')}>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}</select>
                </Field>
                <Field label="Follow-up date" htmlFor="f-date"><input id="f-date" className="input" type="date" value={form.followUpDate} onChange={set('followUpDate')} /></Field>
                <Field label="Next follow-up" htmlFor="f-next"><input id="f-next" className="input" type="date" value={form.nextFollowUpDate} onChange={set('nextFollowUpDate')} /></Field>
                <Field label="Taken by" htmlFor="f-by">
                    <input id="f-by" className="input" list="f-by-list" value={form.takenBy} onChange={set('takenBy')} />
                    <datalist id="f-by-list">{people.map((p) => <option key={p.id} value={p.fullName} />)}</datalist>
                </Field>
                <Field label="Notes" className="span-2" htmlFor="f-notes"><textarea id="f-notes" className="input" rows={3} value={form.notes} onChange={set('notes')} /></Field>
            </div>
        </Modal>
    );
}

export default function FollowupLog() {
    const { can, user } = useAuth();
    const confirm = useConfirm();
    const [searchParams] = useSearchParams();
    const people = useLoad(() => salespersonsApi.list());
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

    useEffect(() => {
        const t = setTimeout(() => { setApplied({ q, ...filters }); setPage(1); setHighlightNo(null); }, 350);
        return () => clearTimeout(t);
    }, [q, filters]);

    const paramsKey = JSON.stringify({ ...applied, page, pageSize, reloadKey });
    useEffect(() => {
        const id = ++requestId.current;
        setLoading(true);
        const { reloadKey: _r, ...params } = JSON.parse(paramsKey);
        followupLogApi.query(params)
            .then((data) => { if (id === requestId.current) { setResult(data); setError(''); } })
            .catch((e) => { if (id === requestId.current) setError(e.message); })
            .finally(() => { if (id === requestId.current) setLoading(false); });
    }, [paramsKey]);

    const reload = () => setReloadKey((n) => n + 1);
    const hasFilters = Boolean(q || filters.outcome || filters.takenBy);

    const jumpToNumber = async (n) => {
        if (applied.sort !== 'newest' && applied.sort !== 'oldest') return 'Set the order to Newest first or Oldest first to jump to a follow-up number.';
        const r = await followupLogApi.locate({ number: n, q: applied.q, outcome: applied.outcome, takenBy: applied.takenBy, sort: applied.sort, pageSize });
        if (!r.found) return false;
        setPage(r.page);
        setHighlightNo(n);
        return true;
    };
    useEffect(() => {
        if (highlightNo == null || loading) return;
        document.querySelector(`tr[data-no="${highlightNo}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [highlightNo, loading, result]);

    const exportRecords = async () => {
        const records = [];
        for (let p = 1; p <= 50; p += 1) {
            const data = await followupLogApi.query({ ...applied, page: p, pageSize: 1000 });
            records.push(...data.items);
            if (records.length >= data.total) break;
        }
        return [{ name: 'Follow-up Log', columns: FOLLOWUP_COLUMNS, records }];
    };

    const remove = async (item) => {
        const ok = await confirm({ title: `Delete follow-up no. ${item.followUpNo}?`, message: `${item.partyName} — this follow-up is removed.`, confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        try {
            await followupLogApi.remove(item.id);
            showToast('Follow-up deleted');
            reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (people.loading && !people.data) return <Loading label="Loading follow-ups..." />;

    return (
        <div>
            <PageHeader title="Follow-up Log" subtitle={`${fmt(result.total)} follow-up${result.total === 1 ? '' : 's'}${hasFilters ? ' match' : ' recorded'} · newest on top`}>
                {can('followuplog.export') && <ExportButton filename="followup-log" count={result.total} getSheets={exportRecords} />}
                {can('followuplog.create') && <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus /> Add follow-up</button>}
            </PageHeader>

            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
                <div className="search-field grow">
                    <Search aria-hidden="true" />
                    <input className="input" type="search" placeholder="Search party, phone, machine, location, notes..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search follow-ups" />
                </div>
                <select className="select" value={filters.outcome} onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value }))} aria-label="Outcome" style={{ width: 'auto' }}>
                    <option value="">All outcomes</option>
                    {OUTCOMES.map((o) => <option key={o}>{o}</option>)}
                </select>
                <select className="select" value={filters.takenBy} onChange={(e) => setFilters((f) => ({ ...f, takenBy: e.target.value }))} aria-label="Taken by" style={{ width: 'auto' }}>
                    <option value="">Taken by: anyone</option>
                    {(people.data || []).map((p) => <option key={p.id} value={p.fullName}>{p.fullName}</option>)}
                </select>
                <select className="select" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} aria-label="Sort" style={{ width: 'auto' }}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="date">By follow-up date</option>
                    <option value="next">Next follow-up due</option>
                </select>
            </div>

            <div className="card" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
                {result.items.length === 0 && !loading ? (
                    <EmptyState icon={ClipboardList} title={hasFilters ? 'No follow-ups match' : 'No follow-ups yet'}
                        action={!hasFilters && can('followuplog.create') && <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus /> Add the first follow-up</button>}>
                        {hasFilters ? 'Try a different search or filter.' : 'Every follow-up you add is numbered and shown here with the newest on top.'}
                    </EmptyState>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>No.</th><th>Date</th><th>Party</th><th>Contact</th><th>Machine / location</th><th>Outcome</th><th>Next</th><th>Taken by</th><th className="actions" /></tr></thead>
                            <tbody>
                                {result.items.map((f) => (
                                    <tr key={f.id} data-no={f.followUpNo} className={f.followUpNo === highlightNo ? 'row-found' : undefined}>
                                        <td className="hint">{fmt(f.followUpNo)}</td>
                                        <td>{f.followUpDate ? formatDate(f.followUpDate) : '—'}</td>
                                        <td><b>{f.partyName}</b>{f.notes && <div className="hint truncate" style={{ maxWidth: 260 }}>{f.notes}</div>}</td>
                                        <td>{f.contactPerson || '—'}{f.mobile && <div><a href={`tel:${f.mobile}`}>{f.mobile}</a></div>}</td>
                                        <td>{f.machine || '—'}{f.location && <div className="hint">{f.location}</div>}</td>
                                        <td><Badge tone={TONES[f.outcome]}>{f.outcome}</Badge></td>
                                        <td>{f.nextFollowUpDate ? formatDate(f.nextFollowUpDate) : '—'}</td>
                                        <td>{f.takenBy || '—'}</td>
                                        <td className="actions">
                                            {can('followuplog.edit') && <button type="button" className="icon-btn" onClick={() => setForm(f)} aria-label={`Edit follow-up ${f.followUpNo}`}><Pencil /></button>}
                                            {can('followuplog.delete') && <button type="button" className="icon-btn danger" onClick={() => remove(f)} aria-label={`Delete follow-up ${f.followUpNo}`}><Trash2 /></button>}
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
                    numberLabel="follow-up no." onJumpNumber={jumpToNumber}
                />
            </div>
            {form && <FollowupForm item={form.id ? form : null} people={people.data || []} userName={user?.name} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
        </div>
    );
}
