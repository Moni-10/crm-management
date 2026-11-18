import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, MessageCircle, Pencil, Phone, Plus } from 'lucide-react';
import { eventsApi, partiesApi, salespersonsApi } from '../../api';
import EventModal from '../../components/events/EventModal';
import { Badge, EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatDate, showToast, todayIso, whatsappUrl } from '../../utils/helpers';

const SECTIONS = [
    { id: 'overdue', label: 'Overdue', tone: 'danger' },
    { id: 'today', label: 'Today', tone: 'warning' },
    { id: 'upcoming', label: 'Upcoming', tone: 'info' },
    { id: 'undated', label: 'No date set', tone: 'neutral' }
];

// Follow-ups come from two places: scheduled follow-up events, and parties marked "Follow-up" or with a follow-up date.
export default function FollowUps() {
    const { data, loading, error, reload } = useLoad(async () => {
        const [events, parties, salespersons] = await Promise.all([eventsApi.list(), partiesApi.list(), salespersonsApi.list()]);
        return { events, parties, salespersons };
    });
    const [modal, setModal] = useState(null);
    const today = todayIso();

    const items = useMemo(() => {
        if (!data) return [];
        const partyById = new Map(data.parties.map((p) => [p.id, p]));
        const fromEvents = data.events
            .filter((e) => e.eventType === 'followup' && e.status !== 'completed')
            .map((e) => ({ key: `e${e.id}`, kind: 'event', date: e.date, title: e.title, time: e.eventTime, notes: e.notes, party: partyById.get(e.partyId), source: e }));
        const fromParties = data.parties
            .filter((p) => p.partyStatus === 'Follow-up' || p.followUpDate)
            .map((p) => ({ key: `p${p.id}`, kind: 'party', date: p.followUpDate, title: `Follow up with ${p.companyName}`, notes: p.remarks, party: p, source: p }));
        return [...fromEvents, ...fromParties].map((item) => ({
            ...item,
            section: !item.date ? 'undated' : item.date < today ? 'overdue' : item.date === today ? 'today' : 'upcoming'
        })).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    }, [data, today]);

    const markDone = async (item) => {
        try {
            if (item.kind === 'event') {
                await eventsApi.update({ ...item.source, status: 'completed' });
            } else {
                await partiesApi.update({ id: item.source.id, followUpDate: '', partyStatus: item.source.partyStatus === 'Follow-up' ? 'Active' : item.source.partyStatus });
            }
            showToast('Marked as done');
            reload({ silent: true });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (loading && !data) return <Loading label="Loading follow-ups..." />;

    return (
        <div>
            <PageHeader title="Follow-ups" subtitle={`${items.length} waiting`}>
                <button type="button" className="btn btn-primary" onClick={() => setModal({ defaults: { eventType: 'followup' } })}><Plus /> Schedule follow-up</button>
            </PageHeader>

            {items.length === 0 ? (
                <div className="card">
                    <EmptyState icon={Clock} title="You're all caught up">Schedule a follow-up, or set a follow-up date on a party, and it will appear here.</EmptyState>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {SECTIONS.map((section) => {
                        const list = items.filter((i) => i.section === section.id);
                        if (list.length === 0) return null;
                        return (
                            <section key={section.id}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 16 }}>
                                    {section.label} <Badge tone={section.tone} plain>{list.length}</Badge>
                                </h2>
                                <div className="card">
                                    <ul className="feed" style={{ padding: '4px 20px' }}>
                                        {list.map((item) => (
                                            <li key={item.key} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span className="feed-dot"><Clock aria-hidden="true" /></span>
                                                <div style={{ flex: 1, minWidth: 200 }}>
                                                    <div className="feed-text" style={{ fontWeight: 600 }}>{item.title}</div>
                                                    <div className="feed-time">
                                                        {item.date ? formatDate(item.date) : 'No date'}{item.time && ` · ${item.time}`}
                                                        {item.party && <> · <Link to={`/parties/${item.party.id}`}>{item.party.companyName}</Link></>}
                                                        {item.party?.salespersonName && ` · ${item.party.salespersonName}`}
                                                    </div>
                                                    {item.notes && <div className="feed-time">{item.notes}</div>}
                                                </div>
                                                <div className="row-actions">
                                                    {item.party && <a className="icon-btn" href={`tel:${item.party.primaryMobile}`} aria-label={`Call ${item.party.companyName}`}><Phone /></a>}
                                                    {item.party && <a className="icon-btn" href={whatsappUrl(item.party.whatsappNumber || item.party.primaryMobile)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${item.party.companyName}`}><MessageCircle /></a>}
                                                    {item.kind === 'event' && <button type="button" className="icon-btn" onClick={() => setModal({ event: item.source })} aria-label="Edit"><Pencil /></button>}
                                                    <button type="button" className="btn btn-sm" onClick={() => markDone(item)}><Check /> Done</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

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
