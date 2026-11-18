import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { eventsApi, partiesApi, salespersonsApi } from '../../api';
import EventModal, { eventTypeLabel } from '../../components/events/EventModal';
import { Badge, EmptyState, ErrorState, Loading, PageHeader, useConfirm } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatDate, showToast, todayIso } from '../../utils/helpers';
import { buildMonthDays } from '../Dashboard/MiniCalendar';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHIPS_PER_DAY = 2;

const byTime = (a, b) => (a.eventTime || '99:99').localeCompare(b.eventTime || '99:99');

export default function Calendar() {
    const confirm = useConfirm();
    const [searchParams] = useSearchParams();
    const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date') || '') ? searchParams.get('date') : todayIso();

    const { data, loading, error, reload } = useLoad(async () => {
        const [events, parties, salespersons] = await Promise.all([eventsApi.list(), partiesApi.list(), salespersonsApi.list()]);
        return { events, parties, salespersons };
    });

    const [viewDate, setViewDate] = useState(() => new Date(Number(initialDate.slice(0, 4)), Number(initialDate.slice(5, 7)) - 1, 1));
    const [selected, setSelected] = useState(initialDate);
    const [modal, setModal] = useState(null); // { event } or { defaults }
    const today = todayIso();

    const days = useMemo(() => buildMonthDays(viewDate), [viewDate]);
    const byDate = useMemo(() => {
        const map = new Map();
        for (const event of data?.events || []) {
            if (!map.has(event.date)) map.set(event.date, []);
            map.get(event.date).push(event);
        }
        for (const list of map.values()) list.sort(byTime);
        return map;
    }, [data]);

    const shift = (delta) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
    const goToday = () => {
        setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
        setSelected(today);
    };

    const toggleDone = async (event) => {
        try {
            await eventsApi.update({ ...event, status: event.status === 'completed' ? 'scheduled' : 'completed' });
            reload({ silent: true });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const remove = async (event) => {
        const ok = await confirm({ title: 'Delete this event?', message: event.title, confirmLabel: 'Delete event', danger: true });
        if (!ok) return;
        try {
            await eventsApi.remove(event.id);
            showToast('Event deleted');
            reload({ silent: true });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (loading && !data) return <Loading label="Loading calendar..." />;

    const selectedEvents = byDate.get(selected) || [];
    const partyName = (id) => data.parties.find((p) => p.id === id)?.companyName;

    return (
        <div>
            <PageHeader title="Calendar" subtitle="Meetings, calls, visits and deliveries">
                <button type="button" className="btn btn-primary" onClick={() => setModal({ defaults: { date: selected } })}><Plus /> Add event</button>
            </PageHeader>

            <div className="cal-layout">
                <div className="card card-pad">
                    <div className="cal-head" style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft /></button>
                            <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><ChevronRight /></button>
                            <h2 style={{ marginLeft: 8 }}>{viewDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</h2>
                        </div>
                        <button type="button" className="btn btn-sm" onClick={goToday}>Today</button>
                    </div>
                    <div className="cal-grid cal-big" role="grid">
                        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
                        {days.map(({ iso, day, inMonth }) => {
                            const list = byDate.get(iso) || [];
                            return (
                                <button
                                    key={iso}
                                    type="button"
                                    className={`cal-day ${inMonth ? '' : 'out'} ${iso === today ? 'today' : ''} ${iso === selected ? 'selected' : ''}`}
                                    onClick={() => setSelected(iso)}
                                    onDoubleClick={() => setModal({ defaults: { date: iso } })}
                                    aria-pressed={iso === selected}
                                    aria-label={`${formatDate(iso)}${list.length ? `, ${list.length} event${list.length > 1 ? 's' : ''}` : ''}`}
                                >
                                    <span className="cal-num">{day}</span>
                                    {list.slice(0, CHIPS_PER_DAY).map((e) => (
                                        <span key={e.id} className={`cal-chip ${e.eventType}`} style={e.status === 'completed' ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>{e.title}</span>
                                    ))}
                                    {list.length > CHIPS_PER_DAY && <span className="cal-more">+{list.length - CHIPS_PER_DAY} more</span>}
                                    {list.length > 0 && <span className="cal-dots cal-dots-small">{list.slice(0, 3).map((e) => <i key={e.id} />)}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <aside className="card">
                    <div className="card-head">
                        <h3><CalendarDays aria-hidden="true" /> {selected === today ? 'Today' : formatDate(selected)}</h3>
                        <button type="button" className="btn btn-sm" onClick={() => setModal({ defaults: { date: selected } })}><Plus /> Add</button>
                    </div>
                    <div className="card-body">
                        {selectedEvents.length === 0 ? (
                            <EmptyState title="Nothing scheduled">Add a meeting, call or follow-up for this day.</EmptyState>
                        ) : (
                            <ul className="event-list">
                                {selectedEvents.map((e) => (
                                    <li key={e.id} className="event-item" style={e.status === 'completed' ? { opacity: 0.65 } : undefined}>
                                        <span className="event-time">{e.eventTime || 'All day'}</span>
                                        <div className="event-body">
                                            <div className="event-title" style={e.status === 'completed' ? { textDecoration: 'line-through' } : undefined}>{e.title}</div>
                                            <div className="event-sub">
                                                <Badge tone="info" plain>{eventTypeLabel(e.eventType)}</Badge>
                                                {e.partyId && <> <Link to={`/parties/${e.partyId}`}>{partyName(e.partyId)}</Link></>}
                                            </div>
                                            {e.notes && <div className="event-sub" style={{ marginTop: 4 }}>{e.notes}</div>}
                                        </div>
                                        <div className="row-actions" style={{ alignItems: 'flex-start' }}>
                                            <button type="button" className="icon-btn sm" onClick={() => toggleDone(e)} aria-label={e.status === 'completed' ? 'Mark as not done' : 'Mark as done'}><Check /></button>
                                            <button type="button" className="icon-btn sm" onClick={() => setModal({ event: e })} aria-label="Edit event"><Pencil /></button>
                                            <button type="button" className="icon-btn sm danger" onClick={() => remove(e)} aria-label="Delete event"><Trash2 /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </aside>
            </div>

            {modal && (
                <EventModal
                    event={modal.event}
                    defaults={modal.defaults}
                    parties={data.parties}
                    salespersons={data.salespersons}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); reload({ silent: true }); }}
                />
            )}
        </div>
    );
}
