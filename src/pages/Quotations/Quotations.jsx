import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { partiesApi, quotationsApi } from '../../api';
import ExportButton from '../../components/bulk/ExportButton';
import { Badge, EmptyState, ErrorState, Loading, PageHeader, SearchSelect, useConfirm } from '../../components/ui';
import { QUOTATION_COLUMNS, QUOTATION_ITEM_COLUMNS } from '../../config/columns';
import { useLoad } from '../../hooks/useLoad';
import { formatCurrency, formatDate, showToast, todayIso } from '../../utils/helpers';
import QuotationForm, { EMPTY_ITEM, QUOTATION_STATUSES } from './QuotationForm';
import QuotationPrintView from './QuotationPrintView';
import ShareMenu from './ShareMenu';

// MMW-2026-014 style numbers: continue from the highest number used this year.
function nextQuotationNumber(quotations) {
    const year = new Date().getFullYear();
    const pattern = new RegExp(`^MMW-${year}-(\\d+)$`);
    const highest = quotations.reduce((max, q) => Math.max(max, Number(pattern.exec(q.quotationNumber)?.[1] || 0)), 0);
    return `MMW-${year}-${String(highest + 1).padStart(3, '0')}`;
}

const blankQuotation = (quotations) => ({
    quotationNumber: nextQuotationNumber(quotations),
    quotationDate: todayIso(),
    validityDate: '',
    partyId: '', companyName: '', partyName: '', salespersonName: '', mobile: '', address: '',
    machineDetails: [{ ...EMPTY_ITEM }],
    gstTax: 0, discount: 0,
    paymentTerms: '', deliveryTerms: '', warranty: '', installationTerms: '', bankDetails: '', notes: '',
    status: 'Draft', totalAmount: 0
});

export default function Quotations() {
    const confirm = useConfirm();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data, loading, error, reload } = useLoad(async () => {
        const [quotations, parties] = await Promise.all([quotationsApi.list(), partiesApi.list()]);
        return { quotations, parties };
    });

    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState({ status: '', partyId: '' });
    const [form, setForm] = useState(null); // { initial, editingId } while the form is open
    const [printing, setPrinting] = useState(null); // { data, download } while the print screen is open

    const quotations = data?.quotations;
    const parties = data?.parties || [];

    // ?new=1, ?edit=<id> and ?pdf=<id> come from other pages (dashboard, search, party and salesperson pages).
    useEffect(() => {
        if (!data) return;
        const editId = searchParams.get('edit');
        const pdfId = searchParams.get('pdf');
        if (pdfId) {
            const found = data.quotations.find((q) => q.id === pdfId);
            if (found) setPrinting({ data: found, download: true });
            setSearchParams({}, { replace: true });
        } else if (editId) {
            const found = data.quotations.find((q) => q.id === editId);
            if (found) setForm({ initial: found, editingId: found.id });
            setSearchParams({}, { replace: true });
        } else if (searchParams.get('new') === '1') {
            setForm({ initial: blankQuotation(data.quotations), editingId: null });
            setSearchParams({}, { replace: true });
        }
    }, [data, searchParams, setSearchParams]);

    const visible = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        return (quotations || []).filter((q) => {
            if (filters.status && q.status !== filters.status) return false;
            if (filters.partyId && q.partyId !== filters.partyId) return false;
            const haystack = [q.quotationNumber, q.companyName, q.partyName, q.salespersonName, q.machineDetails.map((m) => m.machineName).join(' ')].join(' ').toLowerCase();
            return words.every((w) => haystack.includes(w));
        });
    }, [quotations, query, filters]);

    const save = async (quotation) => {
        try {
            if (form.editingId) await quotationsApi.update({ ...quotation, id: form.editingId });
            else await quotationsApi.create(quotation);
            showToast(form.editingId ? 'Quotation updated' : 'Quotation saved');
            setForm(null);
            reload({ silent: true });
        } catch (err) {
            showToast(/already exists/.test(err.message) ? 'That quotation number is already used' : err.message, 'error');
        }
    };

    const remove = async (quotation) => {
        const ok = await confirm({ title: `Delete ${quotation.quotationNumber}?`, message: 'This quotation is removed permanently.', confirmLabel: 'Delete quotation', danger: true });
        if (!ok) return;
        try {
            await quotationsApi.remove(quotation.id);
            showToast('Quotation deleted');
            reload({ silent: true });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (loading && !data) return <Loading label="Loading quotations..." />;

    const hasFilters = query || filters.status || filters.partyId;

    return (
        <>
            {printing && (
                <QuotationPrintView data={printing.data} autoDownload={printing.download} onClose={() => setPrinting(null)} />
            )}

            {/* Kept mounted (hidden) while printing so the unsaved form is still there when you come back. */}
            {form && (
                <div hidden={Boolean(printing)}>
                    <QuotationForm
                        key={form.editingId || 'new'}
                        initial={form.initial}
                        parties={parties}
                        editing={Boolean(form.editingId)}
                        onSave={save}
                        onCancel={() => setForm(null)}
                        onPrint={(current) => setPrinting({ data: current })}
                        onDownload={(current) => setPrinting({ data: current, download: true })}
                    />
                </div>
            )}

            {!form && !printing && (
                <div>
                    <PageHeader title="Quotations" subtitle={`${quotations.length} quotations`}>
                        <ExportButton
                            filename="quotations"
                            count={visible.length}
                            getSheets={() => [
                                { name: 'Quotations', columns: QUOTATION_COLUMNS, records: visible },
                                {
                                    name: 'Items',
                                    columns: QUOTATION_ITEM_COLUMNS,
                                    records: visible.flatMap((q) => q.machineDetails.map((item) => ({ ...item, quotationNumber: q.quotationNumber })))
                                }
                            ]}
                        />
                        <button type="button" className="btn btn-primary" onClick={() => setForm({ initial: blankQuotation(quotations), editingId: null })}>
                            <Plus /> New quotation
                        </button>
                    </PageHeader>

                    <div className="toolbar">
                        <div className="search-field grow">
                            <Search aria-hidden="true" />
                            <input className="input" placeholder="Search by number, company or machine" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search quotations" />
                        </div>
                        <select className="select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Filter by status">
                            <option value="">All statuses</option>
                            {QUOTATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <SearchSelect className="filter-select" value={filters.partyId} onChange={(v) => setFilters({ ...filters, partyId: v })} emptyLabel="All parties" aria-label="Filter by party" searchPlaceholder="Search parties..."
                            options={parties.map((p) => ({ value: p.id, label: p.companyName, sub: p.partyName }))} />
                        {hasFilters && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQuery(''); setFilters({ status: '', partyId: '' }); }}>Clear filters</button>}
                    </div>

                    <div className="card">
                        {visible.length === 0 ? (
                            <EmptyState
                                icon={FileText}
                                title={hasFilters ? 'No quotations match' : 'No quotations yet'}
                                action={!hasFilters && <button type="button" className="btn btn-primary" onClick={() => setForm({ initial: blankQuotation(quotations), editingId: null })}><Plus /> Create the first quotation</button>}
                            >
                                {hasFilters ? 'Try a different search or clear the filters.' : 'Create a quotation and print it on your letterhead.'}
                            </EmptyState>
                        ) : (
                            <div className="table-wrap">
                                <table className="table stack">
                                    <thead>
                                        <tr><th>Quote</th><th>Company</th><th>Machines</th><th className="num">Amount</th><th>Status</th><th>Date</th><th className="actions"><span className="sr-only">Actions</span></th></tr>
                                    </thead>
                                    <tbody>
                                        {visible.map((q) => (
                                            <tr key={q.id}>
                                                <td data-label="Quote"><strong>{q.quotationNumber}</strong></td>
                                                <td data-label="Company">
                                                    <div style={{ textAlign: 'left' }}>
                                                        <div className="cell-main">{q.companyName}</div>
                                                        <div className="cell-sub">{q.salespersonName || 'No salesperson'}</div>
                                                    </div>
                                                </td>
                                                <td data-label="Machines">
                                                    <div style={{ textAlign: 'left' }}>
                                                        {q.machineDetails[0]?.machineName || '-'}
                                                        {q.machineDetails.length > 1 && <span className="cell-sub"> +{q.machineDetails.length - 1} more</span>}
                                                    </div>
                                                </td>
                                                <td data-label="Amount" className="num">{formatCurrency(q.totalAmount)}</td>
                                                <td data-label="Status"><Badge>{q.status}</Badge></td>
                                                <td data-label="Date">{formatDate(q.quotationDate)}</td>
                                                <td className="actions">
                                                    <div className="row-actions">
                                                        <button type="button" className="btn btn-sm btn-primary" onClick={() => setPrinting({ data: q })} title="Print on your pre-printed quotation paper">
                                                            <Printer /> Print
                                                        </button>
                                                        <ShareMenu quotation={q} onDownload={() => setPrinting({ data: q, download: true })} />
                                                        <button type="button" className="icon-btn" onClick={() => setForm({ initial: q, editingId: q.id })} aria-label={`Edit ${q.quotationNumber}`}><Pencil /></button>
                                                        <button type="button" className="icon-btn danger" onClick={() => remove(q)} aria-label={`Delete ${q.quotationNumber}`}><Trash2 /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
