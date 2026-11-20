import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Cog, FileDown, FileText, Mail, MapPin, MessageCircle, Pencil, Phone, PhoneCall, Plus, Search, Trash2 } from 'lucide-react';
import { callsApi, quotationsApi, salespersonsApi } from '../../api';
import { quotationText } from '../Quotations/ShareMenu';
import { Avatar, Badge, EmptyState, ErrorState, Loading, useConfirm } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatCompactCurrency, formatCurrency, formatDate, mailtoUrl, showToast, whatsappUrl } from '../../utils/helpers';
import ClientForm from './ClientForm';
import ClientShareMenu from './ClientShareMenu';
import { useAuth } from '../../context/AuthContext';

// One salesperson's work in one place: every client they called (with the machine the client wants,
// machine number and contact details) and every quotation they made. Calls are matched on "Handled By"
// (full name or nickname); quotations on the salesperson name saved with the quotation.

const PAGE_SIZE = 50;
const lower = (v) => String(v || '').trim().toLowerCase();

function useDebounced(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

const contact = (number, kind) => {
    if (!number) return '—';
    return kind === 'wa'
        ? <a href={whatsappUrl(number)} target="_blank" rel="noreferrer">{number}</a>
        : <a href={`tel:${number}`}>{number}</a>;
};

export default function SalespersonDetail() {
    const { can } = useAuth();
    const { id } = useParams();
    const { data, loading, error, reload } = useLoad(async () => {
        const [person, quotations] = await Promise.all([salespersonsApi.get(id), quotationsApi.list()]);
        return { person, quotations };
    });

    const [tab, setTab] = useState('clients');
    const [searchText, setSearchText] = useState('');
    const search = useDebounced(searchText.trim());
    const [page, setPage] = useState(1);
    const [calls, setCalls] = useState({ items: [], total: 0 });
    const [callsLoading, setCallsLoading] = useState(true);
    const [callsError, setCallsError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0); // bumped after add / edit / delete to reload the list
    const [formClient, setFormClient] = useState(null); // null = closed, {} = add, call = edit
    const confirm = useConfirm();
    const closeForm = useCallback(() => setFormClient(null), []);

    // Calls are paged on the server, so a salesperson with thousands of clients still loads instantly.
    useEffect(() => {
        let cancelled = false;
        setCallsLoading(true);
        callsApi.query({ salesperson: id, q: search, page, pageSize: PAGE_SIZE })
            .then((res) => { if (!cancelled) { setCalls(res); setCallsError(''); } })
            .catch((err) => { if (!cancelled) setCallsError(err.message); })
            .finally(() => { if (!cancelled) setCallsLoading(false); });
        return () => { cancelled = true; };
    }, [id, search, page, refreshKey]);

    const person = data?.person;
    const quotations = useMemo(() => {
        if (!person) return [];
        const names = [lower(person.fullName), lower(person.nickname)].filter(Boolean);
        return (data.quotations || [])
            .filter((q) => names.includes(lower(q.salespersonName)))
            .sort((a, b) => String(b.quotationDate).localeCompare(String(a.quotationDate)));
    }, [data, person]);

    const quoteValue = quotations.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0);
    const accepted = quotations.filter((q) => q.status === 'Accepted').length;

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (loading || !person) return <Loading label="Loading salesperson..." />;

    const pageCount = Math.max(1, Math.ceil(calls.total / PAGE_SIZE));
    const firstRow = (page - 1) * PAGE_SIZE;
    const addClient = () => setFormClient({});
    const removeClient = async (c) => {
        const ok = await confirm({ title: `Delete ${c.partyName}?`, message: 'This client call is removed from Calling Data too. This cannot be undone.', confirmLabel: 'Delete client', danger: true });
        if (!ok) return;
        try {
            await callsApi.remove(c.id);
            showToast('Client deleted');
            if (calls.items.length === 1 && page > 1) setPage(page - 1);
            else setRefreshKey((k) => k + 1);
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    return (
        <div className="sp-detail">
            <Link to="/salespersons" className="sp-back"><ArrowLeft size={16} /> All salespersons</Link>

            <section className="card sp-hero">
                <div className="sp-hero-main">
                    <Avatar name={person.fullName} size="xl" src={person.photo} />
                    <div style={{ minWidth: 0 }}>
                        <h1>{person.fullName}</h1>
                        <div className="sp-hero-sub">
                            {person.nickname && <span>“{person.nickname}”</span>}
                            {[person.department, person.employeeId].filter(Boolean).join(' · ')}
                        </div>
                        <div className="sp-hero-contacts">
                            {person.mobile && <a href={`tel:${person.mobile}`}><Phone size={15} /> {person.mobile}</a>}
                            {person.whatsapp && <a href={whatsappUrl(person.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> {person.whatsapp}</a>}
                            {person.email && <a href={`mailto:${person.email}`}><Mail size={15} /> {person.email}</a>}
                        </div>
                    </div>
                </div>
                {can('calls.create') && <button type="button" className="btn btn-primary" onClick={addClient}><Plus /> Add client</button>}
            </section>

            <div className="sp-stats">
                <div className="sp-stat tone-c"><PhoneCall /><div><b>{calls.total.toLocaleString('en-IN')}</b><span>Clients called{search ? ' (matching)' : ''}</span></div></div>
                <div className="sp-stat tone-m"><FileText /><div><b>{quotations.length}</b><span>Quotations</span></div></div>
                <div className="sp-stat tone-y"><Cog /><div><b>{formatCompactCurrency(quoteValue)}</b><span>Quoted value</span></div></div>
                <div className="sp-stat tone-g"><FileText /><div><b>{accepted}</b><span>Accepted</span></div></div>
            </div>

            <div className="sp-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'clients'} className={tab === 'clients' ? 'active' : ''} onClick={() => setTab('clients')}>
                    Clients &amp; machines <span>{calls.total.toLocaleString('en-IN')}</span>
                </button>
                <button type="button" role="tab" aria-selected={tab === 'quotations'} className={tab === 'quotations' ? 'active' : ''} onClick={() => setTab('quotations')}>
                    Quotations <span>{quotations.length}</span>
                </button>
            </div>

            {tab === 'clients' ? (
                <>
                    <div className="toolbar">
                        <div className="search-field grow">
                            <Search aria-hidden="true" />
                            <input
                                className="input"
                                type="search"
                                placeholder="Search client, nick name, mobile, machine, city…"
                                value={searchText}
                                onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                                aria-label="Search this salesperson's clients"
                            />
                        </div>
                    </div>
                    {callsError && <ErrorState message={`Could not load clients: ${callsError}`} />}
                    {!callsLoading && calls.total === 0 ? (
                        <div className="card">
                            <EmptyState
                                icon={PhoneCall}
                                title={search ? 'No client matches' : 'No client calls yet'}
                                action={can('calls.create') && !search && <button type="button" className="btn btn-primary" onClick={addClient}><Plus /> Add client</button>}
                            >
                                {search ? 'Try a different search.' : `Calls show here when "Handled By" is ${person.fullName}${person.nickname ? ` or ${person.nickname}` : ''} in Calling Data.`}
                            </EmptyState>
                        </div>
                    ) : (
                        <>
                            <div className={`sheet-wrap ${callsLoading ? 'is-loading' : ''}`}>
                                <table className="sheet">
                                    <thead>
                                        <tr>
                                            <th className="sheet-sno">S.No</th>
                                            <th className="sheet-strong">Client (Party)</th>
                                            <th>Machine Wanted</th>
                                            <th>Machine Number</th>
                                            <th>Requirement</th>
                                            <th>Contact Person</th>
                                            <th>Mobile</th>
                                            <th>WhatsApp</th>
                                            <th>Email</th>
                                            <th>Address</th>
                                            <th>Call Date</th>
                                            <th>Notes</th>
                                            <th className="sheet-actions">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calls.items.map((c, i) => (
                                            <tr key={c.id}>
                                                <td className="sheet-sno">{firstRow + i + 1}</td>
                                                <td className="sheet-strong">{c.partyName}{c.nickname && <div className="cell-sub">{c.nickname}</div>}</td>
                                                <td>{c.machineInterest || '—'}</td>
                                                <td className="sheet-num">{c.machineNumber || '—'}</td>
                                                <td className="sheet-notes" title={c.requirement}>{c.requirement || '—'}</td>
                                                <td>{c.contactPerson || '—'}</td>
                                                <td className="sheet-num">{contact(c.mobileNumber)}</td>
                                                <td className="sheet-num">{contact(c.whatsappNumber, 'wa')}</td>
                                                <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}</td>
                                                <td className="sheet-notes" title={[c.address, c.city, c.state].filter(Boolean).join(', ')}>
                                                    {[c.address, c.city, c.state].filter(Boolean).join(', ') || '—'}
                                                </td>
                                                <td className="sheet-num">{c.callDate ? formatDate(c.callDate) : '—'}</td>
                                                <td className="sheet-notes" title={c.notes}>{c.notes || '—'}</td>
                                                <td className="sheet-actions">
                                                    <ClientShareMenu client={c} salesperson={person} quotations={data.quotations || []} />
                                                    {can('calls.edit') && <button type="button" className="icon-btn sm" onClick={() => setFormClient(c)} title="Edit" aria-label={`Edit ${c.partyName}`}><Pencil size={16} /></button>}
                                                    {can('calls.delete') && <button type="button" className="icon-btn sm danger" onClick={() => removeClient(c)} title="Delete" aria-label={`Delete ${c.partyName}`}><Trash2 size={16} /></button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {calls.total > PAGE_SIZE && (
                                <div className="sheet-pager">
                                    <span>Showing <b>{firstRow + 1}–{Math.min(firstRow + PAGE_SIZE, calls.total)}</b> of <b>{calls.total.toLocaleString('en-IN')}</b></span>
                                    <div className="sheet-pager-nav">
                                        <button type="button" className="btn" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
                                        <span>Page {page} of {pageCount}</span>
                                        <button type="button" className="btn" onClick={() => setPage(page + 1)} disabled={page >= pageCount} aria-label="Next page"><ChevronRight size={16} /></button>
                                    </div>
                                </div>
                            )}
                            <p className="sp-hint"><MapPin size={14} /> Clients added here are also saved in <Link to="/calling-details">Calling Data</Link>.</p>
                        </>
                    )}
                </>
            ) : quotations.length === 0 ? (
                <div className="card">
                    <EmptyState icon={FileText} title="No quotations yet" action={<Link to="/quotations" className="btn btn-primary"><Plus /> Make a quotation</Link>}>
                        Quotations show here when their salesperson is {person.fullName}.
                    </EmptyState>
                </div>
            ) : (
                <div className="sheet-wrap">
                    <table className="sheet">
                        <thead>
                            <tr>
                                <th className="sheet-sno">S.No</th>
                                <th className="sheet-strong">Quotation No.</th>
                                <th>Date</th>
                                <th>Company</th>
                                <th>Contact</th>
                                <th>Mobile</th>
                                <th>Address</th>
                                <th className="sheet-right">Amount</th>
                                <th>Status</th>
                                <th className="sheet-actions">Send</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotations.map((q, i) => (
                                <tr key={q.id}>
                                    <td className="sheet-sno">{i + 1}</td>
                                    <td className="sheet-strong"><Link to={`/quotations?edit=${q.id}`}>{q.quotationNumber}</Link></td>
                                    <td className="sheet-num">{q.quotationDate ? formatDate(q.quotationDate) : '—'}</td>
                                    <td>{q.companyName || '—'}</td>
                                    <td>{q.partyName || '—'}</td>
                                    <td className="sheet-num">{contact(q.mobile)}</td>
                                    <td className="sheet-notes" title={q.address}>{q.address || '—'}</td>
                                    <td className="sheet-num sheet-right">{formatCurrency(q.totalAmount)}</td>
                                    <td><Badge>{q.status || 'Draft'}</Badge></td>
                                    <td className="sheet-actions">
                                        {q.mobile && (
                                            <a className="icon-btn sm share" href={whatsappUrl(q.mobile, quotationText(q))} target="_blank" rel="noreferrer" title={`Send on WhatsApp to ${q.mobile}`} aria-label={`Send ${q.quotationNumber} on WhatsApp`}>
                                                <MessageCircle size={16} />
                                            </a>
                                        )}
                                        <a className="icon-btn sm" href={mailtoUrl('', `Quotation ${q.quotationNumber} - Mohindra Mechanical Works`, quotationText(q))} title="Send by email" aria-label={`Email ${q.quotationNumber}`}>
                                            <Mail size={16} />
                                        </a>
                                        <Link className="icon-btn sm" to={`/quotations?pdf=${q.id}`} title="Download PDF" aria-label={`PDF of ${q.quotationNumber}`}>
                                            <FileDown size={16} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {formClient && (
                <ClientForm
                    client={formClient.id ? formClient : null}
                    salesperson={person}
                    onClose={closeForm}
                    onSaved={() => { setFormClient(null); setTab('clients'); setRefreshKey((k) => k + 1); }}
                />
            )}
        </div>
    );
}
