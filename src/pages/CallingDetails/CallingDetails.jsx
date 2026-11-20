import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Edit2, Plus, Trash2, Upload, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { callsApi, salespersonsApi } from '../../api';

// Calling Data is built for very large sheets: every row lives in MySQL, and the page only ever asks the
// server for one page of results (search, filters and paging run in the database, see server/routes/calls.js).

const PAGE_SIZES = [50, 100, 250, 500];
const IMPORT_CHUNK = 1000; // rows per upload request
const EXPORT_CHUNK = 5000; // rows per download request

// '2026-11-18' -> '18-11-2026'
const formatDate = (value) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    return m ? `${m[3]}-${m[2]}-${m[1]}` : value || '—';
};

const emptyForm = () => ({
    partyName: '',
    nickname: '',
    contactPerson: '',
    mobileNumber: '',
    whatsappNumber: '',
    email: '',
    city: '',
    state: '',
    address: '',
    callDate: new Date().toISOString().split('T')[0],
    callTime: '10:00',
    duration: '',
    machineInterest: '',
    machineNumber: '',
    requirement: '',
    callType: 'Visited',
    notes: '',
    handledBy: '',
    status: 'completed'
});

// Columns of the calling sheet, in Excel order. `render(call, serialNo)`.
const SHEET_COLUMNS = [
    { key: 'sno', label: 'S.No', className: 'sheet-sno', render: (_, sn) => sn },
    { key: 'partyName', label: 'Party Name', className: 'sheet-strong' },
    { key: 'nickname', label: 'Nick Name' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'mobileNumber', label: 'Mobile', className: 'sheet-num' },
    { key: 'whatsappNumber', label: 'WhatsApp', className: 'sheet-num' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
    { key: 'address', label: 'Address', className: 'sheet-notes' },
    { key: 'callDate', label: 'Call Date', className: 'sheet-num', render: (c) => formatDate(c.callDate) },
    { key: 'callTime', label: 'Call Time', className: 'sheet-num' },
    { key: 'duration', label: 'Duration (mins)', className: 'sheet-num sheet-right' },
    { key: 'machineInterest', label: 'Machine Interest' },
    { key: 'machineNumber', label: 'Machine Number' },
    { key: 'requirement', label: 'Requirement', className: 'sheet-notes' },
    {
        key: 'callType', label: 'Call Type',
        render: (c) => <span className={`sheet-tag tag-${(c.callType || '').toLowerCase().replace(/[^a-z]/g, '')}`}>{c.callType || '—'}</span>,
    },
    { key: 'handledBy', label: 'Handled By' },
    { key: 'notes', label: 'Notes', className: 'sheet-notes' },
];

// Form fields, in the same order as the sheet.
const FORM_FIELDS = [
    { key: 'partyName', label: 'Party Name', required: true },
    { key: 'nickname', label: 'Nick Name' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'mobileNumber', label: 'Mobile', type: 'tel' },
    { key: 'whatsappNumber', label: 'WhatsApp', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'city', label: 'City' },
    { key: 'address', label: 'Address' },
    { key: 'callDate', label: 'Call Date', type: 'date' },
    { key: 'callTime', label: 'Call Time', type: 'time' },
    { key: 'duration', label: 'Duration (mins)', type: 'number' },
    { key: 'machineInterest', label: 'Machine Interest' },
    { key: 'machineNumber', label: 'Machine Number' },
    { key: 'requirement', label: 'Requirement' },
    { key: 'callType', label: 'Call Type', options: ['Visited', 'Interested', 'Not Interested', 'Final Order'] },
    { key: 'handledBy', label: 'Handled By (salesperson)', list: 'call-salespersons' },
];

// ---------- Excel import helpers ----------
// Header text -> field key. Headers are compared without case, spaces or punctuation,
// so "Party Name", "party_name", "PARTY NAME" and "partyName" all match.
const HEADER_ALIASES = {
    partyName: ['party name', 'party', 'company', 'company name', 'partyname'],
    nickname: ['nick name', 'nickname', 'nick', 'alias', 'short name', 'party nickname'],
    contactPerson: ['contact person', 'contact', 'contact name', 'person'],
    mobileNumber: ['mobile', 'mobile number', 'mobile no', 'phone', 'phone number', 'contact number'],
    whatsappNumber: ['whatsapp', 'whatsapp number', 'whatsapp no'],
    email: ['email', 'email id', 'e-mail', 'mail'],
    city: ['city'],
    state: ['state'],
    address: ['address', 'full address', 'addr', 'location'],
    callDate: ['call date', 'date'],
    callTime: ['call time', 'time'],
    duration: ['duration (mins)', 'duration', 'duration mins', 'mins'],
    machineInterest: ['machine interest', 'machine', 'interest', 'machine required', 'machine name'],
    requirement: ['requirement', 'requirements', 'client requirement', 'need', 'needs', 'enquiry', 'inquiry'],
    machineNumber: ['machine number', 'machine no', 'model', 'model number', 'model no', 'machine model'],
    callType: ['call type', 'type', 'visited', 'interested', 'not interested', 'final order', 'status'],
    handledBy: ['handled by', 'salesperson', 'sales person', 'handledby'],
    notes: ['notes', 'note', 'remarks', 'remark', 'comments'],
    status: ['status'],
};
const normHeader = (h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
const HEADER_LOOKUP = new Map(
    Object.entries(HEADER_ALIASES).flatMap(([key, names]) => [key, ...names].map((n) => [normHeader(n), key]))
);

const pad = (n) => String(n).padStart(2, '0');

// Real Excel date/time cells arrive as serial numbers (days since 1900, time as the fraction) and are decoded
// with SheetJS's own parser, so no timezone shift creeps in. Typed dates arrive as text in many shapes.
let parseDateCode = null; // set to XLSX.SSF.parse_date_code when the xlsx module loads

const cellToDate = (value) => {
    if (typeof value === 'number' && parseDateCode) {
        const d = parseDateCode(value);
        return d ? `${d.y}-${pad(d.m)}-${pad(d.d)}` : '';
    }
    const text = String(value ?? '').trim();
    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
    if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text); // DD-MM-YYYY (Indian format)
    if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    return '';
};

const cellToTime = (value) => {
    if (typeof value === 'number' && parseDateCode) {
        const d = parseDateCode(value);
        return d ? `${pad(d.H)}:${pad(d.M)}` : '';
    }
    const text = String(value ?? '').trim();
    const m = /^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm)?$/i.exec(text);
    if (!m) return text.slice(0, 8);
    let h = Number(m[1]);
    if (m[3]) h = (h % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0);
    return `${pad(h)}:${m[2]}`;
};

const cellToText = (value) => String(value ?? '').trim();

function rowToCall(row) {
    const call = {};
    for (const [header, value] of Object.entries(row)) {
        const key = HEADER_LOOKUP.get(normHeader(header));
        if (!key || call[key]) continue;
        if (key === 'callDate') call[key] = cellToDate(value);
        else if (key === 'callTime') call[key] = cellToTime(value);
        else if (key === 'duration') call[key] = String(value ?? '').replace(/[^\d]/g, '');
        else call[key] = cellToText(value);
    }
    return call;
}

// Waits until the user stops typing before searching.
function useDebounced(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

export default function CallingDetails() {
    const [result, setResult] = useState({ items: [], total: 0, cities: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState(null); // { label, done, total } while importing / exporting
    const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text, details? }

    // Opened from the header search (?q=9876543210) or from a salesperson's page (?new=1&handledBy=Rahul).
    const [searchParams] = useSearchParams();
    const [showForm, setShowForm] = useState(() => searchParams.get('new') === '1');
    const [showImport, setShowImport] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(() => ({ ...emptyForm(), handledBy: searchParams.get('handledBy') || '' }));
    const [salespersonNames, setSalespersonNames] = useState([]);

    // Suggestions for "Handled By", so calls use the same spelling as the Salespersons list.
    useEffect(() => {
        salespersonsApi.list()
            .then((list) => setSalespersonNames(list.map((s) => s.fullName).filter(Boolean)))
            .catch(() => { /* suggestions are optional */ });
    }, []);

    const [searchText, setSearchText] = useState(() => searchParams.get('q') || '');
    const [filterCity, setFilterCity] = useState('');
    const [filterType, setFilterType] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const search = useDebounced(searchText.trim());
    const requestId = useRef(0);

    const filters = { q: search, city: filterCity, callType: filterType };
    const pageCount = Math.max(1, Math.ceil(result.total / pageSize));

    const load = useCallback(async () => {
        const id = ++requestId.current; // ignore answers to older searches that arrive late
        setLoading(true);
        try {
            const data = await callsApi.query({ q: search, city: filterCity, callType: filterType, page, pageSize });
            if (id === requestId.current) setResult(data);
        } catch (error) {
            if (id === requestId.current) setNotice({ type: 'error', text: `Could not load calls: ${error.message}` });
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [search, filterCity, filterType, page, pageSize]);

    useEffect(() => { load(); }, [load]);

    // A new search or filter starts again from page 1.
    const withPageReset = (setter) => (e) => { setter(e.target.value); setPage(1); };

    const setField = (key) => (e) => setFormData((f) => ({ ...f, [key]: e.target.value }));

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await callsApi.update({ ...formData, id: editingId });
                setNotice({ type: 'success', text: 'Call updated.' });
            } else {
                await callsApi.create(formData);
                setNotice({ type: 'success', text: 'Call added.' });
            }
            setEditingId(null);
            setFormData(emptyForm());
            setShowForm(false);
            await load();
        } catch (error) {
            setNotice({ type: 'error', text: `Could not save: ${error.message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (call) => {
        setFormData(call);
        setEditingId(call.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const openNewCall = () => {
        setEditingId(null);
        setFormData(emptyForm());
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (call) => {
        if (!window.confirm(`Delete the call with "${call.partyName}"? This cannot be undone.`)) return;
        try {
            await callsApi.remove(call.id);
            setNotice({ type: 'success', text: 'Call deleted.' });
            // Step back a page if this was the last row on it.
            if (result.items.length === 1 && page > 1) setPage(page - 1);
            else await load();
        } catch (error) {
            setNotice({ type: 'error', text: `Could not delete: ${error.message}` });
        }
    };

    const handleImportExcel = async (e) => {
        const input = e.target;
        const file = input.files[0];
        if (!file) return;

        setNotice(null);
        setProgress({ label: 'Reading file', done: 0, total: 0 });
        try {
            const { read, utils, SSF } = await import('xlsx');
            parseDateCode = SSF.parse_date_code;
            const workbook = read(await file.arrayBuffer(), { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const records = utils.sheet_to_json(worksheet, { defval: '' }).map(rowToCall);
            if (!records.some((r) => r.partyName)) {
                throw new Error('No rows with a "Party Name" found. Check that the first row of the sheet has the column headings.');
            }

            // Upload in chunks so even very large sheets go through; row numbers in errors match the Excel sheet.
            let created = 0;
            const errors = [];
            for (let offset = 0; offset < records.length; offset += IMPORT_CHUNK) {
                setProgress({ label: 'Saving to database', done: offset, total: records.length });
                const res = await callsApi.importRows(records.slice(offset, offset + IMPORT_CHUNK), offset + 1);
                created += res.created;
                errors.push(...res.errors);
            }
            setShowImport(false);
            setNotice({
                type: errors.length ? 'error' : 'success',
                text: `Imported ${created.toLocaleString('en-IN')} call(s) into the database${errors.length ? `, ${errors.length} row(s) skipped` : ''}.`,
                // +1: Excel row 1 is the heading row
                details: errors.slice(0, 15).map((err) => `Excel row ${err.row + 1}: ${err.message}`),
            });
            setPage(1);
            await load();
        } catch (error) {
            setNotice({ type: 'error', text: `Import failed: ${error.message}` });
        } finally {
            setProgress(null);
            input.value = ''; // allow choosing the same file again
        }
    };

    // Exports every row matching the current search and filters, fetched from the server page by page.
    const handleExportExcel = async () => {
        setNotice(null);
        try {
            const rows = [];
            let total = 0;
            for (let p = 1; ; p += 1) {
                const data = await callsApi.query({ ...filters, page: p, pageSize: EXPORT_CHUNK });
                rows.push(...data.items);
                total = data.total;
                setProgress({ label: 'Preparing Excel', done: rows.length, total });
                if (rows.length >= total || data.items.length === 0) break;
            }
            const { utils, writeFile } = await import('xlsx');
            const sheet = rows.map((call, i) => Object.fromEntries(
                SHEET_COLUMNS.map((col) => [col.label, col.key === 'sno' ? i + 1 : col.key === 'callDate' ? formatDate(call.callDate) : call[col.key] ?? ''])
            ));
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, utils.json_to_sheet(sheet), 'Calling Data');
            writeFile(workbook, `calling-data-${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            setNotice({ type: 'error', text: `Export failed: ${error.message}` });
        } finally {
            setProgress(null);
        }
    };

    const downloadTemplate = async () => {
        try {
            const { utils, writeFile } = await import('xlsx');
            const templateData = [{
                'Party Name': 'Sample Company',
                'Nick Name': 'Sample',
                'Contact Person': 'John Doe',
                'Mobile': '9876543210',
                'WhatsApp': '9876543210',
                'Email': 'john@company.com',
                'City': 'Delhi',
                'State': 'Delhi',
                'Address': 'Plot 12, Industrial Area',
                'Call Date': '18-11-2026',
                'Call Time': '10:00',
                'Duration (mins)': '15',
                'Machine Interest': 'Lamination Machine',
                'Machine Number': 'LM-450',
                'Requirement': '18 inch, 2 colour, auto feeder',
                'Call Type': 'Follow-up',
                'Handled By': 'Sales Person Name',
                'Notes': 'Sample notes',
            }];
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, utils.json_to_sheet(templateData), 'Calling Data');
            writeFile(workbook, 'calling-data-template.xlsx');
        } catch (error) {
            setNotice({ type: 'error', text: `Could not download template: ${error.message}` });
        }
    };

    const firstRow = (page - 1) * pageSize;
    const busy = Boolean(progress);
    const fmt = (n) => Number(n).toLocaleString('en-IN');

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, marginBottom: 4 }}>Calling Data</h1>
                <p style={{ color: 'var(--text-2)', margin: 0 }}>
                    Track all customer phone calls • {fmt(result.total)} {search || filterCity || filterType ? 'matching ' : ''}records
                </p>
            </div>

            {notice && (
                <div className={`alert ${notice.type === 'error' ? 'error' : 'success'}`} role={notice.type === 'error' ? 'alert' : 'status'} style={{ marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <div>{notice.text}</div>
                        {notice.details?.length > 0 && (
                            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
                                {notice.details.map((d) => <li key={d}>{d}</li>)}
                            </ul>
                        )}
                    </div>
                    <button type="button" className="icon-btn sm" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16} /></button>
                </div>
            )}

            {progress && (
                <div className="sheet-progress" role="status">
                    <span>{progress.label}{progress.total ? ` — ${fmt(progress.done)} of ${fmt(progress.total)} rows` : '…'}</span>
                    <div className="sheet-progress-bar">
                        <span style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : '15%' }} />
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => setShowImport(!showImport)} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Upload size={18} /> Import Excel
                </button>
                <button className="btn" onClick={handleExportExcel} disabled={busy || result.total === 0} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Download size={18} /> Export
                </button>
                <button className="btn btn-primary" onClick={openNewCall} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={18} /> New Call
                </button>
            </div>

            {showImport && (
                <div style={{ padding: 20, background: 'var(--primary-soft)', border: '1px solid var(--primary)', borderRadius: 10, marginBottom: 20 }}>
                    <h3 style={{ marginTop: 0 }}>📊 Import from Excel</h3>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-2)' }}>
                        The first row must have headings like <b>Party Name, Nick Name, Contact Person, Mobile, WhatsApp, Email, City,
                        Call Date, Call Time, Duration (mins), Machine Interest, Call Type, Handled By, Notes</b>. Only Party Name is required.
                        Rows are saved straight into the database, so sheets with lakhs of rows are fine.
                    </p>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} disabled={busy} />
                        <button className="btn" onClick={downloadTemplate}>Download Template</button>
                        <button className="btn" onClick={() => setShowImport(false)}>Close</button>
                    </div>
                </div>
            )}

            <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 10, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <input
                    type="search"
                    className="input"
                    placeholder="Search party, nick name, contact, mobile, city…"
                    value={searchText}
                    onChange={withPageReset(setSearchText)}
                    aria-label="Search calls"
                />
                <select className="input" value={filterCity} onChange={withPageReset(setFilterCity)} aria-label="Filter by city">
                    <option value="">All Cities</option>
                    {result.cities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
                <select className="input" value={filterType} onChange={withPageReset(setFilterType)} aria-label="Filter by call type">
                    <option value="">All Call Types</option>
                    <option>Visited</option>
                    <option>Interested</option>
                    <option>Not Interested</option>
                    <option>Final Order</option>
                </select>
            </div>

            {showForm && (
                <div style={{ padding: 24, background: 'var(--surface-2)', borderRadius: 12, marginBottom: 24 }}>
                    <h2 style={{ fontSize: 18, marginBottom: 20 }}>{editingId ? 'Edit Call' : 'Log a New Call'}</h2>
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                            {FORM_FIELDS.map((field) => (
                                <div key={field.key}>
                                    <label htmlFor={`call-${field.key}`} style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                                        {field.label}{field.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                                    </label>
                                    {field.options ? (
                                        <select id={`call-${field.key}`} className="input" value={formData[field.key]} onChange={setField(field.key)}>
                                            {field.options.map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            id={`call-${field.key}`}
                                            type={field.type || 'text'}
                                            className="input"
                                            value={formData[field.key] ?? ''}
                                            onChange={setField(field.key)}
                                            required={field.required}
                                            min={field.type === 'number' ? 0 : undefined}
                                            list={field.list}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <datalist id="call-salespersons">
                            {salespersonNames.map((name) => <option key={name} value={name} />)}
                        </datalist>
                        <div style={{ marginBottom: 16 }}>
                            <label htmlFor="call-notes" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Notes</label>
                            <textarea id="call-notes" className="input" value={formData.notes} onChange={setField('notes')} style={{ minHeight: 80 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                            <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Spreadsheet-style grid: one row per call, one column per field */}
            <div className={`sheet-wrap ${loading ? 'is-loading' : ''}`}>
                <table className="sheet">
                    <thead>
                        <tr>
                            {SHEET_COLUMNS.map((col) => <th key={col.key} className={col.className}>{col.label}</th>)}
                            <th className="sheet-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {result.items.length === 0 ? (
                            <tr>
                                <td colSpan={SHEET_COLUMNS.length + 1} className="sheet-empty">
                                    {loading ? 'Loading calls…' : (
                                        <>
                                            No calls found.{' '}
                                            <button type="button" className="sheet-link" onClick={openNewCall}>Add a call</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            result.items.map((call, index) => (
                                <tr key={call.id}>
                                    {SHEET_COLUMNS.map((col) => (
                                        <td key={col.key} className={col.className} title={col.key === 'notes' ? call.notes : undefined}>
                                            {col.render ? col.render(call, firstRow + index + 1) : call[col.key] || '—'}
                                        </td>
                                    ))}
                                    <td className="sheet-actions">
                                        <button type="button" className="icon-btn sm" onClick={() => handleEdit(call)} title="Edit" aria-label={`Edit call with ${call.partyName}`}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button type="button" className="icon-btn sm danger" onClick={() => handleDelete(call)} title="Delete" aria-label={`Delete call with ${call.partyName}`}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {result.total > 0 && (
                <div className="sheet-pager">
                    <span>
                        Showing <b>{fmt(firstRow + 1)}–{fmt(Math.min(firstRow + pageSize, result.total))}</b> of <b>{fmt(result.total)}</b>
                    </span>
                    <label className="sheet-pager-size">
                        Rows per page
                        <select className="input" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <div className="sheet-pager-nav">
                        <button type="button" className="btn" onClick={() => setPage(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page">
                            <ChevronLeft size={16} />
                        </button>
                        <span>Page {fmt(page)} of {fmt(pageCount)}</span>
                        <button type="button" className="btn" onClick={() => setPage(page + 1)} disabled={page >= pageCount || loading} aria-label="Next page">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
