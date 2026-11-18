import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Building2, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { partiesApi, salespersonsApi } from '../../api';
import BulkUploadModal from '../../components/bulk/BulkUploadModal';
import ExportButton from '../../components/bulk/ExportButton';
import { Badge, EmptyState, ErrorState, Loading, PageHeader, SearchSelect, useConfirm } from '../../components/ui';
import { PARTY_COLUMNS } from '../../config/columns';
import { useLoad } from '../../hooks/useLoad';
import { showToast } from '../../utils/helpers';
import PartyForm, { PARTY_STATUSES } from './PartyForm';

const SORTS = {
    companyName: (p) => p.companyName.toLowerCase(),
    salespersonName: (p) => (p.salespersonName || '').toLowerCase(),
    city: (p) => (p.city || '').toLowerCase(),
    partyStatus: (p) => p.partyStatus,
    machines: (p) => p.machines.length
};

function SortHeader({ label, sortKey, sort, onSort, className }) {
    const active = sort.key === sortKey;
    return (
        <th className={className} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button type="button" className="sort" onClick={() => onSort(sortKey)}>
                {label}
                {active && (sort.dir === 'asc' ? <ArrowUp /> : <ArrowDown />)}
            </button>
        </th>
    );
}

export default function Parties() {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [searchParams, setSearchParams] = useSearchParams();

    const { data, loading, error, reload } = useLoad(async () => {
        const [parties, salespersons] = await Promise.all([partiesApi.list(), salespersonsApi.list()]);
        return { parties, salespersons };
    });

    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState({ salesperson: searchParams.get('salesperson') || '', status: '', city: '' });
    const [sort, setSort] = useState({ key: 'companyName', dir: 'asc' });
    // false = closed, true = add, object = edit
    const [formParty, setFormParty] = useState(searchParams.get('add') === '1');
    const [showBulk, setShowBulk] = useState(false);

    const parties = data?.parties;
    const salespersons = data?.salespersons || [];
    const cities = useMemo(() => [...new Set((parties || []).map((p) => p.city).filter(Boolean))].sort(), [parties]);

    const visible = useMemo(() => {
        if (!parties) return [];
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const rows = parties.filter((p) => {
            if (filters.salesperson && p.assignedSalesperson !== filters.salesperson) return false;
            if (filters.status && p.partyStatus !== filters.status) return false;
            if (filters.city && p.city !== filters.city) return false;
            if (words.length === 0) return true;
            const haystack = [p.companyName, p.partyName, p.partyNickname, p.primaryMobile, p.alternativeMobile, p.email, p.city, p.state, p.salespersonName,
                ...p.machines.map((m) => m.name)].join(' ').toLowerCase();
            return words.every((w) => haystack.includes(w));
        });
        const getter = SORTS[sort.key];
        rows.sort((a, b) => {
            const x = getter(a); const y = getter(b);
            const result = typeof x === 'number' ? x - y : String(x).localeCompare(String(y));
            return sort.dir === 'asc' ? result : -result;
        });
        return rows;
    }, [parties, query, filters, sort]);

    const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    const closeForm = () => {
        setFormParty(false);
        if (searchParams.get('add')) setSearchParams({}, { replace: true });
    };
    const hasFilters = query || filters.salesperson || filters.status || filters.city;

    const remove = async (party) => {
        const ok = await confirm({
            title: `Delete ${party.companyName}?`,
            message: 'The party and its machines are removed. Quotations already made for it are kept.',
            confirmLabel: 'Delete party',
            danger: true
        });
        if (!ok) return;
        try {
            await partiesApi.remove(party.id);
            showToast('Party deleted');
            reload({ silent: true });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={reload} />;

    return (
        <div>
            <PageHeader title="Parties" subtitle={parties ? `${parties.length} customers, prospects and dealers` : ''}>
                <ExportButton
                    filename="parties"
                    count={visible.length}
                    getSheets={() => [{ name: 'Parties', columns: PARTY_COLUMNS, records: visible }]}
                />
                <button type="button" className="btn" onClick={() => setShowBulk(true)}><Upload /> Bulk upload</button>
                <button type="button" className="btn btn-primary" onClick={() => setFormParty(true)}><Plus /> Add party</button>
            </PageHeader>

            <div className="toolbar">
                <div className="search-field grow">
                    <Search aria-hidden="true" />
                    <input className="input" placeholder="Search by name, mobile, city or machine" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search parties" />
                </div>
                <SearchSelect className="filter-select" value={filters.salesperson} onChange={(v) => setFilters({ ...filters, salesperson: v })} emptyLabel="All salespersons" aria-label="Filter by salesperson" searchPlaceholder="Search salespersons..."
                    options={salespersons.map((s) => ({ value: s.id, label: s.fullName }))} />
                <select className="select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Filter by status">
                    <option value="">All statuses</option>
                    {PARTY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <SearchSelect className="filter-select" value={filters.city} onChange={(v) => setFilters({ ...filters, city: v })} emptyLabel="All cities" aria-label="Filter by city" searchPlaceholder="Search cities..."
                    options={cities.map((c) => ({ value: c, label: c }))} />
                {hasFilters && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQuery(''); setFilters({ salesperson: '', status: '', city: '' }); }}>Clear filters</button>
                )}
            </div>

            <div className="card">
                {loading && !parties ? <Loading label="Loading parties..." /> : visible.length === 0 ? (
                    <EmptyState
                        icon={Building2}
                        title={hasFilters ? 'No parties match' : 'No parties yet'}
                        action={!hasFilters && <button type="button" className="btn btn-primary" onClick={() => setFormParty(true)}><Plus /> Add your first party</button>}
                    >
                        {hasFilters ? 'Try a different search or clear the filters.' : 'Parties are your customers, prospects and dealers.'}
                    </EmptyState>
                ) : (
                    <div className="table-wrap">
                        <table className="table stack">
                            <thead>
                                <tr>
                                    <SortHeader label="Company" sortKey="companyName" sort={sort} onSort={toggleSort} />
                                    <SortHeader label="Salesperson" sortKey="salespersonName" sort={sort} onSort={toggleSort} />
                                    <th>Mobile</th>
                                    <SortHeader label="City" sortKey="city" sort={sort} onSort={toggleSort} />
                                    <SortHeader label="Status" sortKey="partyStatus" sort={sort} onSort={toggleSort} />
                                    <SortHeader label="Machines" sortKey="machines" sort={sort} onSort={toggleSort} className="num" />
                                    <th className="actions"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((p) => (
                                    <tr key={p.id} className="link-row" onClick={() => navigate(`/parties/${p.id}`)}>
                                        <td data-label="Company">
                                            <div style={{ textAlign: 'left' }}>
                                                <Link to={`/parties/${p.id}`} className="cell-main" onClick={(e) => e.stopPropagation()}>{p.companyName}</Link>
                                                <div className="cell-sub">{p.partyName}</div>
                                            </div>
                                        </td>
                                        <td data-label="Salesperson">{p.salespersonName || <span className="muted">Unassigned</span>}</td>
                                        <td data-label="Mobile">{p.primaryMobile}</td>
                                        <td data-label="City">{p.city || '-'}</td>
                                        <td data-label="Status"><Badge>{p.partyStatus}</Badge></td>
                                        <td data-label="Machines" className="num">{p.machines.length}</td>
                                        <td className="actions" onClick={(e) => e.stopPropagation()}>
                                            <div className="row-actions">
                                                <button type="button" className="icon-btn" onClick={() => setFormParty(p)} aria-label={`Edit ${p.companyName}`}><Pencil /></button>
                                                <button type="button" className="icon-btn danger" onClick={() => remove(p)} aria-label={`Delete ${p.companyName}`}><Trash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {formParty && (
                <PartyForm
                    party={formParty === true ? null : formParty}
                    salespersons={salespersons}
                    onClose={closeForm}
                    onSaved={() => { closeForm(); reload({ silent: true }); }}
                />
            )}
            {showBulk && (
                <BulkUploadModal
                    title="Bulk upload parties"
                    columns={PARTY_COLUMNS}
                    hint="Salesperson can be a name, nickname, mobile or employee ID of an existing salesperson."
                    onUpload={partiesApi.bulkCreate}
                    onDone={() => reload({ silent: true })}
                    onClose={() => setShowBulk(false)}
                />
            )}
        </div>
    );
}
