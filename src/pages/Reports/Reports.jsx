import { useMemo, useState } from 'react';
import { BarChart3, Cog, FileText, MapPin, Printer, Users } from 'lucide-react';
import { machinesApi, partiesApi, quotationsApi, salespersonsApi } from '../../api';
import ExportButton from '../../components/bulk/ExportButton';
import { ErrorState, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatCurrency } from '../../utils/helpers';
import { printTableReport } from '../../utils/printHtml';
import { useAuth } from '../../context/AuthContext';

const REPORTS = [
    { id: 'salesperson', title: 'Salesperson-wise parties', blurb: 'Parties and their status for each salesperson', icon: Users },
    { id: 'machine', title: 'Machine-wise buyers', blurb: 'Who bought each machine', icon: Cog },
    { id: 'city', title: 'City-wise distribution', blurb: 'Where your parties are', icon: MapPin },
    { id: 'quotation', title: 'Quotation status', blurb: 'Count and value by status', icon: FileText }
];

const QUOTATION_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected', 'Expired'];

// Each builder returns { columns: [{ key, label, type? }], rows: [{...}] } so the same data feeds the table, Excel and print.
function buildReport(id, { parties, salespersons, machines, quotations }) {
    if (id === 'salesperson') {
        const rows = salespersons.map((sp) => {
            const mine = parties.filter((p) => p.assignedSalesperson === sp.id);
            const count = (status) => mine.filter((p) => p.partyStatus === status).length;
            return { name: sp.fullName, total: mine.length, active: count('Active'), followup: count('Follow-up'), inactive: count('Inactive') };
        });
        const unassigned = parties.filter((p) => !p.assignedSalesperson);
        if (unassigned.length) rows.push({ name: 'Unassigned', total: unassigned.length, active: unassigned.filter((p) => p.partyStatus === 'Active').length, followup: unassigned.filter((p) => p.partyStatus === 'Follow-up').length, inactive: unassigned.filter((p) => p.partyStatus === 'Inactive').length });
        return {
            columns: [{ key: 'name', label: 'Salesperson' }, { key: 'total', label: 'Parties', type: 'number' }, { key: 'active', label: 'Active', type: 'number' }, { key: 'followup', label: 'Follow-up', type: 'number' }, { key: 'inactive', label: 'Inactive', type: 'number' }],
            rows: rows.sort((a, b) => b.total - a.total)
        };
    }

    if (id === 'machine') {
        const map = new Map();
        for (const m of machines) {
            const key = m.name;
            if (!map.has(key)) map.set(key, { name: m.name, category: m.category, units: 0, buyers: new Set() });
            const entry = map.get(key);
            entry.units += m.quantity;
            if (m.partyName) entry.buyers.add(m.partyName);
        }
        return {
            columns: [{ key: 'name', label: 'Machine' }, { key: 'category', label: 'Category' }, { key: 'units', label: 'Units', type: 'number' }, { key: 'buyerCount', label: 'Buyers', type: 'number' }, { key: 'buyers', label: 'Buyer names' }],
            rows: [...map.values()].map((e) => ({ ...e, buyerCount: e.buyers.size, buyers: [...e.buyers].join(', ') })).sort((a, b) => b.units - a.units)
        };
    }

    if (id === 'city') {
        const map = new Map();
        for (const p of parties) {
            const city = p.city || 'Not set';
            map.set(city, (map.get(city) || 0) + 1);
        }
        const total = parties.length || 1;
        return {
            columns: [{ key: 'city', label: 'City' }, { key: 'count', label: 'Parties', type: 'number' }, { key: 'share', label: 'Share' }],
            rows: [...map.entries()].map(([city, count]) => ({ city, count, share: `${Math.round((count / total) * 100)}%` })).sort((a, b) => b.count - a.count)
        };
    }

    const rows = QUOTATION_STATUSES.map((status) => {
        const list = quotations.filter((q) => q.status === status);
        return { status, count: list.length, value: list.reduce((sum, q) => sum + q.totalAmount, 0) };
    });
    return {
        columns: [{ key: 'status', label: 'Status' }, { key: 'count', label: 'Quotations', type: 'number' }, { key: 'value', label: 'Total value', type: 'number' }],
        rows
    };
}

export default function Reports() {
    const { can } = useAuth();
    const [active, setActive] = useState('salesperson');
    const { data, loading, error, reload } = useLoad(async () => {
        const [parties, salespersons, machines, quotations] = await Promise.all([partiesApi.list(), salespersonsApi.list(), machinesApi.list(), quotationsApi.list()]);
        return { parties, salespersons, machines, quotations };
    });

    const report = useMemo(() => (data ? buildReport(active, data) : null), [data, active]);
    const meta = REPORTS.find((r) => r.id === active);

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (loading && !data) return <Loading label="Building reports..." />;

    const format = (column, value) => (column.key === 'value' ? formatCurrency(value) : value);
    const max = Math.max(1, ...report.rows.map((r) => r.count ?? r.total ?? r.units ?? 0));

    return (
        <div>
            <PageHeader title="Reports" subtitle="Live numbers from your data" />

            <div className="report-picker" role="tablist" aria-label="Reports">
                {REPORTS.map(({ id, title, blurb, icon: Icon }) => (
                    <button key={id} type="button" role="tab" aria-selected={active === id} className={`report-tile ${active === id ? 'active' : ''}`} onClick={() => setActive(id)}>
                        <Icon aria-hidden="true" />
                        <strong>{title}</strong>
                        <span>{blurb}</span>
                    </button>
                ))}
            </div>

            <div className="card">
                <div className="card-head">
                    <h3><BarChart3 aria-hidden="true" /> {meta.title}</h3>
                    <div className="page-actions">
                        {can('reports.export') && <ExportButton filename={`report-${active}`} count={report.rows.length} getSheets={() => [{ name: meta.title.slice(0, 31), columns: report.columns, records: report.rows }]} />}
                        <button
                            type="button"
                            className="btn"
                            disabled={report.rows.length === 0}
                            onClick={() => printTableReport({
                                title: meta.title,
                                headers: report.columns.map((c) => c.label),
                                rows: report.rows.map((row) => report.columns.map((c) => format(c, row[c.key])))
                            })}
                        >
                            <Printer /> Print
                        </button>
                    </div>
                </div>
                {report.rows.length === 0 ? (
                    <div className="empty"><p>There is no data for this report yet.</p></div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>{report.columns.map((c) => <th key={c.key} className={c.type === 'number' ? 'num' : ''}>{c.label}</th>)}{active === 'city' && <th style={{ width: '30%' }}><span className="sr-only">Chart</span></th>}</tr>
                            </thead>
                            <tbody>
                                {report.rows.map((row, i) => (
                                    <tr key={i}>
                                        {report.columns.map((c) => <td key={c.key} className={c.type === 'number' ? 'num' : ''}>{format(c, row[c.key])}</td>)}
                                        {active === 'city' && (
                                            <td><div className="bar-track"><span style={{ width: `${(row.count / max) * 100}%` }} /></div></td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
