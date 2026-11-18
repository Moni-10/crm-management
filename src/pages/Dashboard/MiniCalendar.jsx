import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { todayIso } from '../../utils/helpers';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const isoDate = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// Month grid helper shared with the Calendar page: always 6 rows x 7 days, including days of neighbouring months.
export function buildMonthDays(viewDate) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const start = new Date(year, month, 1 - new Date(year, month, 1).getDay());
    return Array.from({ length: 42 }, (_, i) => {
        const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        return { iso: isoDate(day.getFullYear(), day.getMonth(), day.getDate()), day: day.getDate(), inMonth: day.getMonth() === month };
    });
}

// Compact calendar on the dashboard. Days with events get a dot; the selected day lists its events below.
export default function MiniCalendar({ events }) {
    const [viewDate, setViewDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [selected, setSelected] = useState(todayIso());
    const today = todayIso();

    const days = useMemo(() => buildMonthDays(viewDate), [viewDate]);
    const byDate = useMemo(() => {
        const map = new Map();
        for (const event of events) {
            if (!map.has(event.date)) map.set(event.date, []);
            map.get(event.date).push(event);
        }
        return map;
    }, [events]);

    const shift = (delta) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
    const selectedEvents = byDate.get(selected) || [];

    return (
        <div className="card" style={{ height: '100%' }}>
            <div className="card-head">
                <h3><CalendarDays aria-hidden="true" /> Calendar</h3>
                <Link to="/calendar" className="card-link">Open</Link>
            </div>
            <div className="card-body">
                <div className="cal-head" style={{ marginBottom: 8 }}>
                    <button type="button" className="icon-btn sm" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft /></button>
                    <span className="cal-title">{viewDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</span>
                    <button type="button" className="icon-btn sm" onClick={() => shift(1)} aria-label="Next month"><ChevronRight /></button>
                </div>
                <div className="cal-grid" role="grid">
                    {DOW.map((d, i) => <div key={i} className="cal-dow" aria-hidden="true">{d}</div>)}
                    {days.map(({ iso, day, inMonth }) => {
                        const count = byDate.get(iso)?.length || 0;
                        return (
                            <button
                                key={iso}
                                type="button"
                                className={`cal-day ${inMonth ? '' : 'out'} ${iso === today ? 'today' : ''} ${iso === selected ? 'selected' : ''}`}
                                onClick={() => setSelected(iso)}
                                aria-label={`${iso}${count ? `, ${count} event${count > 1 ? 's' : ''}` : ''}`}
                                aria-pressed={iso === selected}
                            >
                                {day}
                                <span className="cal-dots">{count > 0 && <i />}{count > 1 && <i />}</span>
                            </button>
                        );
                    })}
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    {selectedEvents.length === 0 ? (
                        <p className="muted" style={{ fontSize: 14 }}>{selected === today ? 'Nothing scheduled today.' : 'No events on this day.'}</p>
                    ) : (
                        <ul className="event-list">
                            {selectedEvents.slice(0, 3).map((event) => (
                                <li key={event.id} className="event-item">
                                    <span className="event-time">{event.eventTime || 'All day'}</span>
                                    <div className="event-body">
                                        <div className="event-title">{event.title}</div>
                                        <div className="event-sub">{event.eventType}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
