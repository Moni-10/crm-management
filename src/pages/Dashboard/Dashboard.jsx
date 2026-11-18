import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowUpRight, BellRing, Building2, CalendarDays, ChartNoAxesColumn, Clock, Cog, DatabaseBackup, FilePlus2,
    FileText, MapPin, Plus, Settings, Star, Users
} from 'lucide-react';
import { activityApi, eventsApi, machinesApi, partiesApi, quotationsApi, salespersonsApi } from '../../api';
import { Avatar, Badge, EmptyState, ErrorState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useLoad';
import { formatCompactCurrency, formatDateTime, todayIso } from '../../utils/helpers';
import { remindersEnabled } from '../Settings/Settings';
import MiniCalendar from './MiniCalendar';
import WeatherCard from './WeatherCard';

const OFFICE_MAP = 'https://www.google.com/maps?q=28.66036,77.09717&z=15&output=embed';

const ACTIVITY_ICONS = {
    party: Building2, salesperson: Users, quotation: FileText, machine: Cog, event: CalendarDays,
    backup: DatabaseBackup, system: Settings
};

// Quotation statuses in pipeline order, with the colour each one uses.
const PIPELINE = [
    { status: 'Draft', tone: 'var(--key)' },
    { status: 'Sent', tone: 'var(--primary)' },
    { status: 'Approved', tone: 'var(--success)' },
    { status: 'Rejected', tone: 'var(--danger)' },
    { status: 'Expired', tone: 'var(--warning)' }
];

const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

const sameMonth = (iso) => {
    const date = new Date(iso);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

function StatTile({ to, label, value, note, up, icon: Icon, tone }) {
    return (
        <Link to={to} className="stat">
            <div className="stat-top">
                <span className="stat-label">{label}</span>
                <span className={`stat-icon ${tone}`}><Icon aria-hidden="true" /></span>
            </div>
            <div className="stat-value">{value}</div>
            <div className={`stat-note ${up ? 'up' : ''}`}>{note}</div>
        </Link>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const { data, loading, error, reload } = useLoad(async () => {
        const [parties, salespersons, machines, quotations, events, activity] = await Promise.all([
            partiesApi.list(), salespersonsApi.list(), machinesApi.list(), quotationsApi.list(), eventsApi.list(), activityApi.recent(8)
        ]);
        return { parties, salespersons, machines, quotations, events, activity };
    });

    const view = useMemo(() => {
        if (!data) return null;
        const { parties, salespersons, machines, quotations, events } = data;
        const today = todayIso();

        const pipeline = PIPELINE.map((step) => ({
            ...step,
            count: quotations.filter((q) => q.status === step.status || (step.status === 'Approved' && q.status === 'Accepted')).length
        }));
        const openValue = quotations.filter((q) => q.status === 'Draft' || q.status === 'Sent').reduce((s, q) => s + q.totalAmount, 0);

        const followUpParties = parties.filter((p) => p.partyStatus === 'Follow-up' || (p.followUpDate && p.followUpDate >= today));
        const followUpEvents = events.filter((e) => e.eventType === 'followup' && e.date >= today && e.status !== 'completed');

        const reminders = [
            ...events.filter((e) => e.date === today && e.status !== 'completed').map((e) => ({ key: `e${e.id}`, title: e.title })),
            ...parties.filter((p) => p.followUpDate === today).map((p) => ({ key: `p${p.id}`, title: `Follow up with ${p.companyName}`, to: `/parties/${p.id}` }))
        ];

        const perPerson = salespersons
            .map((sp) => ({ sp, count: parties.filter((p) => p.assignedSalesperson === sp.id).length }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            pipeline,
            openValue,
            reminders,
            perPerson,
            maxPerPerson: Math.max(1, ...perPerson.map((x) => x.count)),
            newParties: parties.filter((p) => sameMonth(p.createdAt)).length,
            machinesThisMonth: machines.filter((m) => sameMonth(m.createdAt)).length,
            activeParties: parties.filter((p) => p.partyStatus === 'Active').length,
            pending: followUpParties.length + followUpEvents.length,
            recentParties: [...parties].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
            recentQuotations: [...quotations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
        };
    }, [data]);

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (loading || !view) {
        return (
            <div>
                <div className="skeleton" style={{ height: 40, width: 280, marginBottom: 24 }} />
                <div className="stat-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: 122 }} />)}</div>
            </div>
        );
    }

    const { parties, salespersons, machines, quotations, events, activity } = data;
    const totalPipeline = view.pipeline.reduce((s, p) => s + p.count, 0);

    return (
        <div>
            <div className="greeting">
                <div>
                    <h1>{greeting()}, {user.name.split(' ')[0]}</h1>
                    <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="page-actions">
                    <Link to="/quotations?new=1" className="btn"><FilePlus2 /> New quotation</Link>
                    <Link to="/parties?add=1" className="btn btn-primary"><Plus /> Add party</Link>
                </div>
            </div>

            {remindersEnabled() && view.reminders.length > 0 && (
                <div className="alert info" role="status" style={{ marginBottom: 20 }}>
                    <BellRing aria-hidden="true" />
                    <div>
                        <strong>{view.reminders.length} thing{view.reminders.length > 1 ? 's' : ''} for today</strong>
                        <div style={{ fontSize: 14 }}>
                            {view.reminders.slice(0, 3).map((r, i) => (
                                <span key={r.key}>{i > 0 && ' · '}{r.to ? <Link to={r.to}>{r.title}</Link> : r.title}</span>
                            ))}
                            {view.reminders.length > 3 && ` · +${view.reminders.length - 3} more`}
                        </div>
                    </div>
                </div>
            )}

            <div className="stat-grid">
                <StatTile to="/parties" label="Parties" value={parties.length} note={`+${view.newParties} this month`} up={view.newParties > 0} icon={Building2} tone="cyan" />
                <StatTile to="/salespersons" label="Salespersons" value={salespersons.length} note="On the team" icon={Users} tone="magenta" />
                <StatTile to="/machines" label="Machines" value={machines.length} note={`+${view.machinesThisMonth} this month`} up={view.machinesThisMonth > 0} icon={Cog} tone="yellow" />
                <StatTile to="/quotations" label="Quotations" value={quotations.length} note={`${formatCompactCurrency(view.openValue)} open`} icon={FileText} tone="key" />
                <StatTile to="/parties" label="Active clients" value={view.activeParties} note={`of ${parties.length} parties`} icon={Star} tone="success" />
                <StatTile to="/followups" label="Follow-ups" value={view.pending} note="Pending" icon={Clock} tone="primary" />
            </div>

            <div className="dash-grid">
                <div className="col-8 card">
                    <div className="card-head">
                        <h3><ChartNoAxesColumn aria-hidden="true" /> Quotation pipeline</h3>
                        <Link to="/quotations" className="card-link">View all <ArrowUpRight /></Link>
                    </div>
                    <div className="card-body">
                        {totalPipeline === 0 ? (
                            <p className="muted">No quotations yet. Create one to start the pipeline.</p>
                        ) : (
                            <>
                                <div className="pipeline-total">
                                    <strong>{totalPipeline}</strong><span className="muted">quotations, {formatCompactCurrency(view.openValue)} still open</span>
                                </div>
                                <div className="pipeline-bar" role="img" aria-label={view.pipeline.map((p) => `${p.status}: ${p.count}`).join(', ')}>
                                    {view.pipeline.filter((p) => p.count > 0).map((p) => (
                                        <span key={p.status} style={{ flexGrow: p.count, background: p.tone }} />
                                    ))}
                                </div>
                                <div className="pipeline-legend">
                                    {view.pipeline.map((p) => (
                                        <div key={p.status} style={{ '--tone': p.tone }}>
                                            <strong>{p.count}</strong>
                                            <span>{p.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="col-4 card">
                    <div className="card-head">
                        <h3><Users aria-hidden="true" /> Parties per salesperson</h3>
                    </div>
                    <div className="card-body">
                        {view.perPerson.length === 0 ? <p className="muted">Add salespersons to see their parties here.</p> : (
                            <div className="bar-list">
                                {view.perPerson.map(({ sp, count }) => (
                                    <div key={sp.id} className="bar-row">
                                        <span className="bar-name"><Avatar name={sp.fullName} size="sm" src={sp.photo} /> <span className="truncate">{sp.fullName}</span></span>
                                        <span className="bar-val">{count}</span>
                                        <div className="bar-track"><span style={{ width: `${(count / view.maxPerPerson) * 100}%` }} /></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dash-grid">
                <div className="col-4"><MiniCalendar events={events} /></div>
                <div className="col-4"><WeatherCard /></div>
                <div className="col-4 card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="card-head">
                        <h3><MapPin aria-hidden="true" /> Our office</h3>
                    </div>
                    <iframe className="map-frame" title="Map of the MMW office in Narsingh Garden, New Delhi" src={OFFICE_MAP} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
            </div>

            <div className="dash-grid">
                <div className="col-6 card">
                    <div className="card-head">
                        <h3><Building2 aria-hidden="true" /> Recent parties</h3>
                        <Link to="/parties" className="card-link">View all <ArrowUpRight /></Link>
                    </div>
                    {view.recentParties.length === 0 ? (
                        <EmptyState icon={Building2} title="No parties yet">Add your first party to see it here.</EmptyState>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead><tr><th>Company</th><th>City</th><th>Status</th></tr></thead>
                                <tbody>
                                    {view.recentParties.map((p) => (
                                        <tr key={p.id}>
                                            <td><Link to={`/parties/${p.id}`} className="cell-main">{p.companyName}</Link><div className="cell-sub">{p.partyName}</div></td>
                                            <td>{p.city || '-'}</td>
                                            <td><Badge>{p.partyStatus}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="col-6 card">
                    <div className="card-head">
                        <h3><FileText aria-hidden="true" /> Recent quotations</h3>
                        <Link to="/quotations" className="card-link">View all <ArrowUpRight /></Link>
                    </div>
                    {view.recentQuotations.length === 0 ? (
                        <EmptyState icon={FileText} title="No quotations yet">Create a quotation and print it on your letterhead.</EmptyState>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead><tr><th>Quote</th><th className="num">Amount</th><th>Status</th></tr></thead>
                                <tbody>
                                    {view.recentQuotations.map((q) => (
                                        <tr key={q.id}>
                                            <td><Link to={`/quotations?edit=${q.id}`} className="cell-main">{q.quotationNumber}</Link><div className="cell-sub">{q.companyName}</div></td>
                                            <td className="num">{formatCompactCurrency(q.totalAmount)}</td>
                                            <td><Badge>{q.status}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div className="dash-grid">
                <div className="col-12 card">
                    <div className="card-head"><h3><Clock aria-hidden="true" /> Recent activity</h3></div>
                    <div className="card-body">
                        {activity.length === 0 ? <p className="muted">Changes you make will show up here.</p> : (
                            <ul className="feed">
                                {activity.map((item) => {
                                    const Icon = ACTIVITY_ICONS[item.type] || Clock;
                                    return (
                                        <li key={item.id}>
                                            <span className="feed-dot"><Icon aria-hidden="true" /></span>
                                            <div>
                                                <div className="feed-text">{item.description}</div>
                                                <div className="feed-time">{formatDateTime(item.createdAt)}</div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
