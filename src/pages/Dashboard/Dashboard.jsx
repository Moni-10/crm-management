import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowUpRight, BellRing, Building2, CalendarDays, ChartNoAxesColumn, Clock, DatabaseBackup, FilePlus2,
    FileText, MapPin, Phone, PhoneCall, Plus, Settings, Star, Trophy, Users
} from 'lucide-react';
import { activityApi, callsApi, eventsApi, partiesApi, quotationsApi, salespersonsApi } from '../../api';
import { Avatar, Badge, EmptyState, ErrorState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useLoad';
import { formatCompactCurrency, formatDate, formatDateTime, todayIso } from '../../utils/helpers';
import { remindersEnabled } from '../Settings/Settings';
import MiniCalendar from './MiniCalendar';
import WeatherCard from './WeatherCard';

const OFFICE_MAP = 'https://www.google.com/maps?q=28.66036,77.09717&z=15&output=embed';

const ACTIVITY_ICONS = {
    party: Building2, salesperson: Users, quotation: FileText, call: Phone, event: CalendarDays,
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

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

function StatTile({ to, label, value, note, up, icon: Icon, tone }) {
    return (
        <Link to={to} className={`kpi tone-${tone}`}>
            <span className="kpi-icon"><Icon aria-hidden="true" /></span>
            <span className="kpi-label">{label}</span>
            <span className="kpi-value">{value}</span>
            <span className={`kpi-note ${up ? 'up' : ''}`}>{note}</span>
            <ArrowUpRight className="kpi-go" aria-hidden="true" />
        </Link>
    );
}

// Decorative gear for the hero banner (brand: mechanical works).
function HeroGear({ className }) {
    const teeth = 12;
    const d = Array.from({ length: teeth }, (_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        const w = Math.PI / teeth / 1.6;
        const p = (r, ang) => `${50 + r * Math.cos(ang)},${50 + r * Math.sin(ang)}`;
        return `L${p(38, a - w)} L${p(48, a - w * 0.6)} L${p(48, a + w * 0.6)} L${p(38, a + w)}`;
    }).join(' ');
    return (
        <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
            <path d={`M${d.slice(1)} Z`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" />
        </svg>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const today = todayIso();
    const { data, loading, error, reload } = useLoad(async () => {
        const [parties, salespersons, quotations, events, activity, calls, callsToday] = await Promise.all([
            partiesApi.list(), salespersonsApi.list(), quotationsApi.list(), eventsApi.list(), activityApi.recent(8),
            callsApi.query({ page: 1, pageSize: 6 }), callsApi.query({ date: today, page: 1, pageSize: 1 })
        ]);
        return { parties, salespersons, quotations, events, activity, calls, callsToday: callsToday.total };
    });

    const view = useMemo(() => {
        if (!data) return null;
        const { parties, salespersons, quotations, events } = data;

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
            activeParties: parties.filter((p) => p.partyStatus === 'Active').length,
            pending: followUpParties.length + followUpEvents.length,
            recentQuotations: [...quotations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
        };
    }, [data, today]);

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (loading || !view) {
        return (
            <div>
                <div className="skeleton" style={{ height: 190, borderRadius: 22, marginBottom: 20 }} />
                <div className="kpi-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: 138, borderRadius: 18 }} />)}</div>
            </div>
        );
    }

    const { parties, salespersons, quotations, events, activity, calls, callsToday } = data;
    const totalPipeline = view.pipeline.reduce((s, p) => s + p.count, 0);
    const medals = ['gold', 'silver', 'bronze'];

    return (
        <div className="dash">
            {/* Hero banner */}
            <section className="dash-hero">
                <HeroGear className="dash-hero-gear g1" />
                <HeroGear className="dash-hero-gear g2" />
                <div className="dash-hero-text">
                    <span className="dash-hero-date">
                        <CalendarDays aria-hidden="true" />
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <h1>{greeting()}, <span className="dash-grad">{user.name.split(' ')[0]}</span></h1>
                    <p>Here is how sales are moving today.</p>
                    <div className="dash-hero-actions">
                        <Link to="/calling-details?new=1" className="btn dash-btn-light"><PhoneCall /> Log a call</Link>
                        <Link to="/quotations?new=1" className="btn dash-btn-ghost"><FilePlus2 /> New quotation</Link>
                        <Link to="/parties?add=1" className="btn dash-btn-ghost"><Plus /> Add party</Link>
                    </div>
                </div>
                <div className="dash-hero-figures">
                    <Link to="/calling-details" className="dash-fig">
                        <b>{fmt(callsToday)}</b><span>Calls today</span>
                    </Link>
                    <Link to="/quotations" className="dash-fig">
                        <b>{formatCompactCurrency(view.openValue)}</b><span>Open quotations</span>
                    </Link>
                    <Link to="/followups" className="dash-fig">
                        <b>{fmt(view.pending)}</b><span>Follow-ups due</span>
                    </Link>
                </div>
            </section>

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

            <div className="kpi-grid">
                <StatTile to="/parties" label="Parties" value={fmt(parties.length)} note={`+${view.newParties} this month`} up={view.newParties > 0} icon={Building2} tone="c" />
                <StatTile to="/salespersons" label="Salespersons" value={fmt(salespersons.length)} note="On the team" icon={Users} tone="m" />
                <StatTile to="/calling-details" label="Calling Data" value={fmt(calls.total)} note={`${fmt(callsToday)} today`} up={callsToday > 0} icon={PhoneCall} tone="y" />
                <StatTile to="/quotations" label="Quotations" value={fmt(quotations.length)} note={`${formatCompactCurrency(view.openValue)} open`} icon={FileText} tone="k" />
                <StatTile to="/parties" label="Active clients" value={fmt(view.activeParties)} note={`of ${fmt(parties.length)} parties`} icon={Star} tone="g" />
                <StatTile to="/followups" label="Follow-ups" value={fmt(view.pending)} note="Pending" icon={Clock} tone="p" />
            </div>

            <div className="dash-grid">
                <div className="col-8 card dash-card">
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
                                <div className="pipeline-bar dash-pipe" role="img" aria-label={view.pipeline.map((p) => `${p.status}: ${p.count}`).join(', ')}>
                                    {view.pipeline.filter((p) => p.count > 0).map((p) => (
                                        <span key={p.status} style={{ flexGrow: p.count, background: p.tone }} />
                                    ))}
                                </div>
                                <div className="pipeline-legend dash-legend">
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

                <div className="col-4 card dash-card">
                    <div className="card-head">
                        <h3><Trophy aria-hidden="true" /> Team leaderboard</h3>
                        <Link to="/salespersons" className="card-link">Team <ArrowUpRight /></Link>
                    </div>
                    <div className="card-body">
                        {view.perPerson.length === 0 ? <p className="muted">Add salespersons to see their parties here.</p> : (
                            <ol className="leaderboard">
                                {view.perPerson.map(({ sp, count }, i) => (
                                    <li key={sp.id}>
                                        <span className={`rank ${medals[i] || ''}`}>{i + 1}</span>
                                        <Avatar name={sp.fullName} size="sm" src={sp.photo} />
                                        <Link to={`/salespersons/${sp.id}`} className="lb-name truncate">{sp.fullName}</Link>
                                        <span className="lb-val">{count}<small> parties</small></span>
                                        <div className="lb-track"><span style={{ width: `${(count / view.maxPerPerson) * 100}%` }} /></div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </div>
            </div>

            <div className="dash-grid">
                <div className="col-7 card dash-card">
                    <div className="card-head">
                        <h3><PhoneCall aria-hidden="true" /> Recent calls</h3>
                        <Link to="/calling-details" className="card-link">Calling Data <ArrowUpRight /></Link>
                    </div>
                    {calls.items.length === 0 ? (
                        <EmptyState icon={PhoneCall} title="No calls yet" action={<Link to="/calling-details?new=1" className="btn btn-primary"><Plus /> Log a call</Link>}>
                            Log calls or import your Excel sheet in Calling Data.
                        </EmptyState>
                    ) : (
                        <ul className="call-list">
                            {calls.items.map((c) => (
                                <li key={c.id}>
                                    <span className="call-ic"><Phone aria-hidden="true" /></span>
                                    <div className="call-main">
                                        <div className="call-party truncate">{c.partyName}{c.nickname && <small> · {c.nickname}</small>}</div>
                                        <div className="call-sub truncate">
                                            {[c.machineInterest, c.city, c.handledBy && `by ${c.handledBy}`].filter(Boolean).join(' · ') || c.mobileNumber || '—'}
                                        </div>
                                    </div>
                                    <div className="call-side">
                                        <Badge>{c.callType || 'Call'}</Badge>
                                        <span className="call-date">{c.callDate ? formatDate(c.callDate) : ''}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="col-5 card dash-card">
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
                <div className="col-4"><MiniCalendar events={events} /></div>
                <div className="col-4"><WeatherCard /></div>
                <div className="col-4 card dash-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="card-head">
                        <h3><MapPin aria-hidden="true" /> Our office</h3>
                    </div>
                    <iframe className="map-frame" title="Map of the MMW office in Narsingh Garden, New Delhi" src={OFFICE_MAP} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
            </div>

            <div className="dash-grid">
                <div className="col-12 card dash-card">
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
