import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Database, Download, RotateCcw, Search } from 'lucide-react';
import { leadsApi } from '../../api';
import { tokenStore } from '../../api/client';
import { Badge, ErrorState, Modal, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/helpers';

const PAGE_SIZES = [50, 100, 200];
const EMPTY_FILTERS = { sheet: '', machine: '', location: '', coming: '', email: '', phone: '', dateFrom: '', dateTo: '', hasDate: '', repeated: '', sort: 'source' };
const fmt = (n) => Number(n).toLocaleString('en-IN');
const dash = (v) => (v == null || String(v).trim() === '' ? '—' : v);

function LeadDetail({ id, onClose }) {
    const [lead, setLead] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        leadsApi.get(id).then(setLead).catch((e) => setError(e.message));
    }, [id]);

    const row = (label, value) => (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span className="hint">{label}</span><span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{dash(value)}</span>
        </div>
    );

    return (
        <Modal title="Lead details" size="lg" onClose={onClose} footer={<button type="button" className="btn" onClick={onClose}>Close</button>}>
            {error && <div className="alert error"><span>{error}</span></div>}
            {!lead && !error && <p className="hint">Loading...</p>}
            {lead && (
                <>
                    {row('Source', `${lead.sheet} — Excel row ${fmt(lead.row + 1)}`)}
                    {row('Sno', lead.sno)}
                    {row('Date / tag', lead.dateText)}
                    {row('Machine', lead.machine)}
                    {row('Location', lead.location)}
                    {row('Coming', lead.coming)}
                    {row('Contact (as in Excel)', lead.contact)}
                    {row('Email (as in Excel)', lead.email)}
                    {lead.phones.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            {lead.phones.map((p) => (
                                <a key={p.phone} className="btn btn-sm" href={`tel:${p.phone}`} style={{ marginRight: 8 }}>
                                    {p.phone}{p.count > 1 && ` · on ${p.count} rows`}
                                </a>
                            ))}
                        </div>
                    )}
                    {lead.sameNumber.length > 0 && (
                        <div style={{ marginTop: 18 }}>
                            <h3 style={{ marginBottom: 8 }}>Other rows with the same number ({lead.sameNumber.length})</h3>
                            <div className="table-wrap">
                                <table className="table">
                                    <thead><tr><th>Row</th><th>Date / tag</th><th>Machine</th><th>Location</th><th>Coming</th></tr></thead>
                                    <tbody>
                                        {lead.sameNumber.map((o) => (
                                            <tr key={o.id}>
                                                <td>{fmt(o.row + 1)}</td><td>{dash(o.dateText)}</td><td>{dash(o.machine)}</td><td>{dash(o.location)}</td><td>{dash(o.coming)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Modal>
    );
}

export default function Leads() {
    const { can } = useAuth();
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [debounced, setDebounced] = useState(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [result, setResult] = useState({ items: [], total: 0, sheets: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);
    const [exporting, setExporting] = useState(false);
    const requestId = useRef(0);

    // Typing waits a moment before asking the server, and any change goes back to page 1.
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedQ(q); setDebounced(filters); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [q, filters]);

    const params = { q: debouncedQ, ...debounced, page, pageSize };
    const paramsKey = JSON.stringify(params);
    useEffect(() => {
        const id = ++requestId.current;
        setLoading(true);
        leadsApi.query(JSON.parse(paramsKey))
            .then((data) => { if (id === requestId.current) { setResult(data); setError(''); } })
            .catch((e) => { if (id === requestId.current) setError(e.message); })
            .finally(() => { if (id === requestId.current) setLoading(false); });
    }, [paramsKey]);

    const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
    const hasFilters = q || JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
    const reset = () => { setQ(''); setFilters(EMPTY_FILTERS); };
    const pageCount = Math.max(1, Math.ceil(result.total / pageSize));
    const firstRow = (page - 1) * pageSize;

    const exportCsv = async () => {
        setExporting(true);
        try {
            const qs = new URLSearchParams(Object.entries({ q: debouncedQ, ...debounced }).filter(([, v]) => v !== '' && v != null));
            const response = await fetch(`/api/leads/export?${qs}`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
            if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Export failed');
            const url = URL.createObjectURL(await response.blob());
            const a = document.createElement('a');
            a.href = url; a.download = 'leads.csv'; a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            <PageHeader title="Leads" subtitle={`${fmt(result.total)} records${hasFilters ? ' match' : ' from the Excel sheets'}`}>
                {can('leads.export') && (
                    <button type="button" className="btn" onClick={exportCsv} disabled={exporting || result.total === 0}>
                        <Download /> {exporting ? 'Preparing...' : `Export ${hasFilters ? 'results' : 'all'} (CSV)`}
                    </button>
                )}
            </PageHeader>

            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
                <div className="search-field grow">
                    <Search aria-hidden="true" />
                    <input className="input" type="search" placeholder="Search phone, machine, location, email, notes..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search leads" />
                </div>
                <select className="input" value={filters.sheet} onChange={set('sheet')} aria-label="Sheet" style={{ width: 'auto' }}>
                    <option value="">All sheets</option>
                    {result.sheets.map((s) => <option key={s.name} value={s.name}>{s.name} ({fmt(s.count)})</option>)}
                </select>
                <input className="input" placeholder="Machine contains" value={filters.machine} onChange={set('machine')} style={{ width: 170 }} aria-label="Machine" />
                <input className="input" placeholder="Location contains" value={filters.location} onChange={set('location')} style={{ width: 170 }} aria-label="Location" />
                <input className="input" placeholder="Coming contains" value={filters.coming} onChange={set('coming')} style={{ width: 150 }} aria-label="Coming" />
            </div>
            <div className="toolbar" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="input" value={filters.email} onChange={set('email')} aria-label="Email" style={{ width: 'auto' }}>
                    <option value="">Email: any</option><option value="yes">Has email</option><option value="no">No email</option>
                </select>
                <select className="input" value={filters.phone} onChange={set('phone')} aria-label="Phone" style={{ width: 'auto' }}>
                    <option value="">Phone: any</option><option value="yes">Has phone</option><option value="no">No phone</option>
                </select>
                <label className="checkbox"><input type="checkbox" checked={filters.hasDate === '1'} onChange={(e) => setFilters((f) => ({ ...f, hasDate: e.target.checked ? '1' : '' }))} /> Has real date</label>
                <input className="input" type="date" value={filters.dateFrom} onChange={set('dateFrom')} aria-label="From date" style={{ width: 'auto' }} />
                <span className="hint">to</span>
                <input className="input" type="date" value={filters.dateTo} onChange={set('dateTo')} aria-label="To date" style={{ width: 'auto' }} />
                <label className="checkbox"><input type="checkbox" checked={filters.repeated === '1'} onChange={(e) => setFilters((f) => ({ ...f, repeated: e.target.checked ? '1' : '' }))} /> Repeated numbers only</label>
                <select className="input" value={filters.sort} onChange={set('sort')} aria-label="Sort" style={{ width: 'auto', marginLeft: 'auto' }}>
                    <option value="source">Excel order</option><option value="newest">Newest first</option><option value="date">By date</option>
                </select>
                {hasFilters && <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw /> Reset</button>}
            </div>

            {error ? <ErrorState message={error} onRetry={() => setFilters({ ...filters })} /> : (
                <div className="card" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr><th>#</th><th>Date / tag</th><th>Machine</th><th>Location</th><th>Coming</th><th>Contact</th><th>Email</th></tr>
                            </thead>
                            <tbody>
                                {result.items.length === 0 ? (
                                    <tr><td colSpan={7} className="sheet-empty" style={{ textAlign: 'center', padding: 32 }}>
                                        {loading ? 'Loading...' : <><Database size={18} style={{ verticalAlign: 'middle' }} /> No records match.</>}
                                    </td></tr>
                                ) : result.items.map((l) => (
                                    <tr key={l.id} onClick={() => setOpenId(l.id)} style={{ cursor: 'pointer' }}>
                                        <td className="hint">{fmt(l.row)}</td>
                                        <td>{dash(l.dateText)}</td>
                                        <td>{dash(l.machine)}</td>
                                        <td>{dash(l.location)}</td>
                                        <td>{dash(l.coming)}</td>
                                        <td>
                                            {l.phones.length === 0 ? dash(l.contact) : l.phones.map((p) => (
                                                <div key={p.phone}>{p.phone}{p.count > 1 && <> <Badge tone="warning" plain>×{p.count}</Badge></>}</div>
                                            ))}
                                        </td>
                                        <td style={{ maxWidth: 240, overflowWrap: 'anywhere' }}>{dash(l.email)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {result.total > 0 && (
                        <div className="sheet-pager">
                            <span>Showing <b>{fmt(firstRow + 1)}–{fmt(Math.min(firstRow + pageSize, result.total))}</b> of <b>{fmt(result.total)}</b></span>
                            <label className="sheet-pager-size">Rows per page
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                                    {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </label>
                            <div className="sheet-pager-nav">
                                <button type="button" className="btn" onClick={() => setPage(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page"><ChevronLeft size={16} /></button>
                                <span>Page {fmt(page)} of {fmt(pageCount)}</span>
                                <button type="button" className="btn" onClick={() => setPage(page + 1)} disabled={page >= pageCount || loading} aria-label="Next page"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {openId && <LeadDetail id={openId} onClose={() => setOpenId(null)} />}
        </div>
    );
}
