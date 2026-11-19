import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowUpRight, BellRing, Building2, CalendarDays, ChartNoAxesColumn, Clock, DatabaseBackup, FilePlus2,
    FileText, MapPin, Phone, PhoneCall, Plus, Settings, Star, Trophy, Users, Mail, Edit2, Trash2
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

const COMPANY_INFO = {
    name: 'Mohindra Mechanical Works',
    owners: [
        { id: 1, name: 'S. Mohinder Singh', designation: 'Founder', email: 'mohinder@mmw.in', phone: '9810011000', avatar: '👨‍💼' },
        { id: 2, name: 'Azadvinder Singh', designation: 'Co-Founder', email: 'azad@mmw.in', phone: '9810011001', avatar: '👨‍💼' }
    ],
    departments: [
        {
            name: 'Technical',
            icon: '💻',
            employees: [
                { id: 101, name: 'Vedant Tripathi', designation: 'Digital Marketing Expert', email: 'vedant@mmw.in', phone: '9810011010', avatar: '👨‍💻' },
                { id: 102, name: 'Nishu Kashyap', designation: 'Full Stack Developer', email: 'nishu@mmw.in', phone: '9810011011', avatar: '👩‍💻' },
                { id: 103, name: 'Laxmi Singh', designation: 'WordPress Developer', email: 'laxmi@mmw.in', phone: '9810011012', avatar: '👩‍💻' },
                { id: 104, name: 'Bhupender Singh', designation: 'SEO Intern', email: 'bhupender@mmw.in', phone: '9810011013', avatar: '👨‍💻' }
            ]
        },
        {
            name: 'Sales',
            icon: '📈',
            employees: [
                { id: 201, name: 'Jaspal', designation: 'Sales Manager', email: 'jaspal@mmw.in', phone: '9810011020', avatar: '👨‍💼' },
                { id: 202, name: 'Pooja', designation: 'Sales Executive', email: 'pooja@mmw.in', phone: '9810011021', avatar: '👩‍💼' },
                { id: 203, name: 'Aman', designation: 'Sales Executive', email: 'aman@mmw.in', phone: '9810011022', avatar: '👨‍💼' },
                { id: 204, name: 'Neha Khan', designation: 'Sales Executive', email: 'neha.khan@mmw.in', phone: '9810011023', avatar: '👩‍💼' },
                { id: 205, name: 'Neha Mishra', designation: 'Sales Executive', email: 'neha.mishra@mmw.in', phone: '9810011024', avatar: '👩‍💼' },
                { id: 206, name: 'Muskan', designation: 'Sales Executive', email: 'muskan@mmw.in', phone: '9810011025', avatar: '👩‍💼' },
                { id: 207, name: 'Rajwant', designation: 'Sales Executive', email: 'rajwant@mmw.in', phone: '9810011026', avatar: '👨‍💼' },
                { id: 208, name: 'Renu', designation: 'Sales Executive', email: 'renu@mmw.in', phone: '9810011027', avatar: '👩‍💼' },
                { id: 209, name: 'Satish', designation: 'Sales Executive', email: 'satish@mmw.in', phone: '9810011028', avatar: '👨‍💼' },
                { id: 210, name: 'Swati', designation: 'Sales Executive', email: 'swati@mmw.in', phone: '9810011029', avatar: '👩‍💼' },
                { id: 211, name: 'Uma', designation: 'Sales Executive', email: 'uma@mmw.in', phone: '9810011030', avatar: '👩‍💼' }
            ]
        }
    ]
};

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
                            <div className="pipeline-flow">
                                <div className="pipeline-overview"><span className="pipeline-kicker">Live quotation overview</span><strong>{formatCompactCurrency(view.openValue)}</strong><p>Open pipeline value</p><div className="pipeline-total-line"><FileText /><span><b>{totalPipeline}</b> total quotations</span></div><Link to="/quotations" className="pipeline-action">Manage quotations <ArrowUpRight /></Link></div>
                                <div className="pipeline-stages" aria-label={view.pipeline.map((p) => `${p.status}: ${p.count}`).join(', ')}>{view.pipeline.map((p, index) => <div className="pipeline-stage" key={p.status} style={{ '--tone': p.tone }}><span className="pipeline-step">0{index + 1}</span><div className="pipeline-stage-copy"><div><b>{p.status}</b><span>{Math.round((p.count / totalPipeline) * 100)}%</span></div><i><span style={{ width: `${(p.count / totalPipeline) * 100}%` }} /></i></div><strong>{p.count}</strong></div>)}</div>
                            </div>
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
                        <div className="quick-actions-grid">
                            <Link to="/parties?add=1" className="quick-action tone-blue"><span><Building2 /></span><div><strong>Add new party</strong><small>Create a customer profile</small></div><ArrowUpRight /></Link>
                            <Link to="/quotations?new=1" className="quick-action tone-orange"><span><FilePlus2 /></span><div><strong>New quotation</strong><small>Prepare a sales quote</small></div><ArrowUpRight /></Link>
                            <Link to="/calling-details?new=1" className="quick-action tone-green"><span><PhoneCall /></span><div><strong>Log a call</strong><small>Record customer discussion</small></div><ArrowUpRight /></Link>
                            <Link to="/calendar" className="quick-action tone-purple"><span><CalendarDays /></span><div><strong>Schedule event</strong><small>Add meeting or reminder</small></div><ArrowUpRight /></Link>
                        </div>
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

            {/* Company Organization Section */}
            <div className="dash-grid dashboard-organization" aria-hidden="true">
                <div className="col-12 card dash-card">
                    <div className="card-head">
                        <h3><Building2 aria-hidden="true" /> Company Organization</h3>
                        <span style={{ color: 'var(--text-3)', fontSize: '14px' }}>{COMPANY_INFO.name}</span>
                    </div>
                    <div className="card-body">
                        {/* Owners Section */}
                        <div className="org-section">
                            <h4 className="org-title">👑 Company Owners</h4>
                            <div className="org-grid">
                                {COMPANY_INFO.owners.map((owner) => (
                                    <div key={owner.id} className="member-card">
                                        <div className="member-avatar" style={{ fontSize: '32px' }}>{owner.avatar}</div>
                                        <div className="member-details">
                                            <div className="member-name">{owner.name}</div>
                                            <div className="member-role">{owner.designation}</div>
                                            <div className="member-contact">
                                                <a href={`mailto:${owner.email}`} className="contact-link" title="Email">
                                                    <Mail size={14} /> {owner.email}
                                                </a>
                                            </div>
                                            <div className="member-contact">
                                                <a href={`tel:${owner.phone}`} className="contact-link" title="Phone">
                                                    <Phone size={14} /> {owner.phone}
                                                </a>
                                            </div>
                                        </div>
                                        <div className="member-actions">
                                            <button type="button" className="icon-btn sm" title="Edit"><Edit2 size={16} /></button>
                                            <button type="button" className="icon-btn sm danger" title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Departments Section */}
                        {COMPANY_INFO.departments.map((dept) => (
                            <div key={dept.name} className="org-section">
                                <h4 className="org-title">{dept.icon} {dept.name} Department ({dept.employees.length})</h4>
                                <div className="org-grid">
                                    {dept.employees.map((emp) => (
                                        <div key={emp.id} className="member-card">
                                            <div className="member-avatar" style={{ fontSize: '28px' }}>{emp.avatar}</div>
                                            <div className="member-details">
                                                <div className="member-name">{emp.name}</div>
                                                <div className="member-role">{emp.designation}</div>
                                                <div className="member-contact">
                                                    <a href={`mailto:${emp.email}`} className="contact-link" title="Email">
                                                        <Mail size={14} /> {emp.email}
                                                    </a>
                                                </div>
                                                <div className="member-contact">
                                                    <a href={`tel:${emp.phone}`} className="contact-link" title="Phone">
                                                        <Phone size={14} /> {emp.phone}
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="member-actions">
                                                <button type="button" className="icon-btn sm" title="Edit"><Edit2 size={16} /></button>
                                                <button type="button" className="icon-btn sm danger" title="Delete"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
