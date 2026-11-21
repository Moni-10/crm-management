import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Database, Download, FileSpreadsheet, Printer, RotateCcw, Search, Trash2, Upload } from 'lucide-react';
import { oldExcelApi } from '../../api';
import { tokenStore } from '../../api/client';
import { Badge, ErrorState, Modal, PageHeader, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/helpers';

const PAGE_SIZES = [50, 100, 200];
const EMPTY_FILTERS = { sheet: '', machine: '', location: '', coming: '', email: '', phone: '', dateFrom: '', dateTo: '', hasDate: '', repeated: '', sort: 'newest' };
const fmt = (n) => Number(n).toLocaleString('en-IN');
const dash = (v) => (v == null || String(v).trim() === '' ? '—' : v);
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const qs = (obj) => new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== '' && v != null));

// Downloads a file from an endpoint that needs the login token.
async function download(path, fallbackName) {
    const response = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Download failed');
    const name = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
}

const FORMAT_HEAD = ['sno.', 'date', 'machine', 'LOCATION', 'COMING', 'CONTACT', 'EMAIL ID'];
const FORMAT_ROWS = [
    ['1', '2026-11-20', 'paper bag making machine', 'Delhi', 'neha mdm', '9810011000, 9810011001', 'example@mail.com'],
    ['2', 'real 29-7', 'flexo printing machine', 'Gujarat', '', '9822227505', '']
];

function ImportModal({ onClose, onChanged }) {
    const { can } = useAuth();
    const confirm = useConfirm();
    const [files, setFiles] = useState([]);
    const [log, setLog] = useState([]);
    const [busy, setBusy] = useState(false);
    const [batches, setBatches] = useState([]);

    const loadBatches = () => oldExcelApi.batches().then(setBatches).catch(() => {});
    useEffect(() => { loadBatches(); }, []);

    const upload = async () => {
        setBusy(true);
        setLog([]);
        let any = false;
        for (const file of files) {
            setLog((l) => [...l, { name: file.name, state: 'working' }]);
            try {
                const response = await fetch(`/api/old-excel/import?name=${encodeURIComponent(file.name)}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${tokenStore.get()}`, 'Content-Type': 'application/octet-stream' },
                    body: file
                });
                const data = await response.json().catch(() => null);
                if (!response.ok) throw new Error(data?.error || `Upload failed (${response.status})`);
                const text = data.results.map((r) => (r.status === 'imported' ? `${r.sheet}: ${fmt(r.inserted)} entries imported` : `${r.sheet}: ${r.reason}`)).join(' · ');
                if (data.results.some((r) => r.status === 'imported')) any = true;
                setLog((l) => l.map((x) => (x.name === file.name ? { name: file.name, state: 'done', text } : x)));
            } catch (error) {
                setLog((l) => l.map((x) => (x.name === file.name ? { name: file.name, state: 'error', text: error.message } : x)));
            }
        }
        setBusy(false);
        setFiles([]);
        loadBatches();
        if (any) onChanged();
    };

    const removeBatch = async (b) => {
        if (!(await confirm({ title: 'Remove this import', message: `Remove the ${fmt(b.entries)} entries loaded from "${b.file}"? Other imports are not affected. You can import the file again later.`, confirmLabel: 'Remove', danger: true }))) return;
        try {
            await oldExcelApi.removeBatch(b.id);
            showToast('Import removed');
            loadBatches();
            onChanged();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    return (
        <Modal title="Import Excel" size="lg" onClose={onClose} footer={<button type="button" className="btn" onClick={onClose}>Close</button>}>
            <p style={{ marginTop: 0 }}>
                Choose one or more Excel files (.xlsx, .xls or .csv). Every row is stored exactly as it is in the file, repeated rows included.
                Files are added after the existing entries, so the sequence continues.
            </p>

            <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <strong><FileSpreadsheet size={16} style={{ verticalAlign: 'middle' }} /> Format of the Excel file</strong>
                    <button type="button" className="btn btn-sm" onClick={() => download('/old-excel/template', 'old-excel-data-format.xlsx').catch((e) => showToast(e.message, 'error'))}>
                        <Download /> Download format
                    </button>
                </div>
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr>{FORMAT_HEAD.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>{FORMAT_ROWS.map((r, i) => <tr key={i}>{r.map((c, k) => <td key={k}>{c || ' '}</td>)}</tr>)}</tbody>
                    </table>
                </div>
                <p className="hint" style={{ marginBottom: 0 }}>First row = headings. Columns are matched by heading name (any order); if the headings differ, this column order is used. A contact cell can hold several numbers.</p>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="file" multiple accept=".xlsx,.xls,.csv" disabled={busy} onChange={(e) => setFiles([...e.target.files])} />
                <button type="button" className="btn btn-primary" disabled={busy || files.length === 0} onClick={upload}>
                    <Upload /> {busy ? 'Importing... please wait' : `Import ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
                </button>
            </div>
            {busy && <p className="hint">Large files can take a minute each. Keep this window open.</p>}
            {log.map((l) => (
                <div key={l.name} className={`alert ${l.state === 'error' ? 'error' : l.state === 'done' ? 'success' : ''}`} style={{ marginTop: 8 }}>
                    <span><b>{l.name}</b>: {l.state === 'working' ? 'importing...' : l.text}</span>
                </div>
            ))}

            <h3 style={{ margin: '20px 0 8px' }}>Imported files</h3>
            {batches.length === 0 ? <p className="hint">Nothing imported yet.</p> : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>File</th><th>Sheet</th><th>Entries</th><th>Entry numbers</th><th>Imported</th><th className="actions" /></tr></thead>
                        <tbody>
                            {batches.map((b) => (
                                <tr key={b.id}>
                                    <td>{b.file}</td><td>{b.sheet}</td><td>{fmt(b.entries)}</td>
                                    <td>{fmt(b.firstEntry)}–{fmt(b.firstEntry + b.entries - 1)}</td>
                                    <td>{new Date(b.importedAt).toLocaleString('en-IN')}</td>
                                    <td className="actions">
                                        {can('oldexcel.delete') && <button type="button" className="icon-btn danger" onClick={() => removeBatch(b)} aria-label={`Remove ${b.file}`}><Trash2 /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Modal>
    );
}

function EntryDetail({ id, onClose }) {
    const [lead, setLead] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        oldExcelApi.get(id).then(setLead).catch((e) => setError(e.message));
    }, [id]);

    const row = (label, value) => (
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span className="hint">{label}</span><span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{dash(value)}</span>
        </div>
    );

    return (
        <Modal title="Entry details" size="lg" onClose={onClose} footer={<button type="button" className="btn" onClick={onClose}>Close</button>}>
            {error && <div className="alert error"><span>{error}</span></div>}
            {!lead && !error && <p className="hint">Loading...</p>}
            {lead && (
                <>
                    {row('Source', `${lead.file || lead.sheet} · ${lead.sheet} · entry no. ${fmt(lead.row)}`)}
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
                                    {p.phone}{p.count > 1 && ` · on ${p.count} entries`}
                                </a>
                            ))}
                        </div>
                    )}
                    {lead.sameNumber.length > 0 && (
                        <div style={{ marginTop: 18 }}>
                            <h3 style={{ marginBottom: 8 }}>Other entries with the same number ({lead.sameNumber.length})</h3>
                            <div className="table-wrap">
                                <table className="table">
                                    <thead><tr><th>Sno</th><th>Entry</th><th>Date / tag</th><th>Machine</th><th>Location</th><th>Coming</th></tr></thead>
                                    <tbody>
                                        {lead.sameNumber.map((o) => (
                                            <tr key={o.id}>
                                                <td>{dash(o.sno)}</td><td>{fmt(o.row)}</td><td>{dash(o.dateText)}</td><td>{dash(o.machine)}</td><td>{dash(o.location)}</td><td>{dash(o.coming)}</td>
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

export default function OldExcel() {
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
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState('');
    const [reload, setReload] = useState(0);
    const requestId = useRef(0);

    // Typing waits a moment before asking the server, and any change goes back to page 1.
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedQ(q); setDebounced(filters); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [q, filters]);

    const paramsKey = JSON.stringify({ q: debouncedQ, ...debounced, page, pageSize, reload });
    useEffect(() => {
        const id = ++requestId.current;
        setLoading(true);
        const { reload: _r, ...params } = JSON.parse(paramsKey);
        oldExcelApi.query(params)
            .then((data) => { if (id === requestId.current) { setResult(data); setError(''); } })
            .catch((e) => { if (id === requestId.current) setError(e.message); })
            .finally(() => { if (id === requestId.current) setLoading(false); });
    }, [paramsKey]);

    const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
    const hasFilters = q || JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
    const reset = () => { setQ(''); setFilters(EMPTY_FILTERS); };
    const pageCount = Math.max(1, Math.ceil(result.total / pageSize));
    const firstRow = (page - 1) * pageSize;
    const current = () => ({ q: debouncedQ, ...debounced });

    const exportFile = async (format) => {
        setExporting(format);
        try {
            await download(`/old-excel/export?${qs({ ...current(), format })}`, `old-excel-data.${format}`);
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setExporting('');
        }
    };

    // Opens the print window straight away (so it is not blocked), then fills it with the matching entries.
    const printRows = async () => {
        const w = window.open('', '_blank');
        if (!w) return showToast('Allow pop-ups to print', 'error');
        w.document.write('<p style="font-family:sans-serif">Preparing...</p>');
        try {
            const data = await oldExcelApi.print(current());
            const summary = [debouncedQ && `Search: ${debouncedQ}`, ...Object.entries(debounced).filter(([k, v]) => v && k !== 'sort').map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join(' · ');
            const rows = data.items.map((l) => `<tr><td>${esc(l.sno)}</td><td>${esc(l.row)}</td><td>${esc(l.dateText)}</td><td>${esc(l.machine)}</td><td>${esc(l.location)}</td><td>${esc(l.coming)}</td><td>${esc(l.contact)}</td><td>${esc(l.email)}</td></tr>`).join('');
            w.document.open();
            w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Old Excel Data</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;margin:16px}h1{font-size:16px;margin:0 0 4px}p{margin:0 0 10px;color:#444}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:3px 5px;text-align:left;vertical-align:top;word-break:break-word}
th{background:#eee}tr{page-break-inside:avoid}thead{display:table-header-group}</style></head><body>
<h1>Old Excel Data</h1><p>${esc(new Date().toLocaleString('en-IN'))} · ${fmt(data.items.length)} of ${fmt(data.total)} entries${data.total > data.limit ? ` (first ${fmt(data.limit)}; narrow the filters or use Export for the rest)` : ''}${summary ? ` · ${esc(summary)}` : ''}</p>
<table><thead><tr><th>Sno</th><th>Entry</th><th>Date / tag</th><th>Machine</th><th>Location</th><th>Coming</th><th>Contact</th><th>Email</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`);
            w.document.close();
        } catch (e) {
            w.close();
            showToast(e.message, 'error');
        }
    };

    return (
        <div>
            <PageHeader title="Old Excel Data" subtitle={`${fmt(result.total)} entries${hasFilters ? ' match' : ' imported from Excel'}`}>
                {can('oldexcel.import') && <button type="button" className="btn btn-primary" onClick={() => setImporting(true)}><Upload /> Import Excel</button>}
                {can('oldexcel.export') && (
                    <>
                        <button type="button" className="btn" onClick={() => exportFile('xlsx')} disabled={!!exporting || result.total === 0}><Download /> {exporting === 'xlsx' ? 'Preparing...' : 'Export Excel'}</button>
                        <button type="button" className="btn" onClick={() => exportFile('csv')} disabled={!!exporting || result.total === 0}>{exporting === 'csv' ? 'Preparing...' : 'CSV'}</button>
                    </>
                )}
                <button type="button" className="btn" onClick={printRows} disabled={result.total === 0}><Printer /> Print</button>
            </PageHeader>

            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
                <div className="search-field grow">
                    <Search aria-hidden="true" />
                    <input className="input" type="search" placeholder="Search phone, machine, location, email, notes..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
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
                    <option value="newest">Newest first (last entry on top)</option><option value="source">Oldest first (Excel order)</option><option value="date">By date</option>
                </select>
                {hasFilters && <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw /> Reset</button>}
            </div>

            {error ? <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} /> : (
                <div className="card" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr><th>Sno</th><th>Entry</th><th>Date / tag</th><th>Machine</th><th>Location</th><th>Coming</th><th>Contact</th><th>Email</th></tr>
                            </thead>
                            <tbody>
                                {result.items.length === 0 ? (
                                    <tr><td colSpan={8} className="sheet-empty" style={{ textAlign: 'center', padding: 32 }}>
                                        {loading ? 'Loading...' : <><Database size={18} style={{ verticalAlign: 'middle' }} /> {hasFilters ? 'No entries match.' : 'No Excel data yet. Use Import Excel to add your files.'}</>}
                                    </td></tr>
                                ) : result.items.map((l) => (
                                    <tr key={l.id} onClick={() => setOpenId(l.id)} style={{ cursor: 'pointer' }}>
                                        <td><b>{dash(l.sno)}</b></td>
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
            {openId && <EntryDetail id={openId} onClose={() => setOpenId(null)} />}
            {importing && <ImportModal onClose={() => setImporting(false)} onChanged={() => setReload((n) => n + 1)} />}
        </div>
    );
}
