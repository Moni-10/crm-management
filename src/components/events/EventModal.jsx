import { useState } from 'react';
import { eventsApi } from '../../api';
import { Field, Modal, SearchSelect } from '../ui';
import { showToast, todayIso } from '../../utils/helpers';

export const EVENT_TYPES = [
    { id: 'meeting', label: 'Meeting' },
    { id: 'followup', label: 'Follow-up' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'call', label: 'Call' },
    { id: 'visit', label: 'Visit' }
];

export const eventTypeLabel = (id) => EVENT_TYPES.find((t) => t.id === id)?.label || id;

/**
 * Add or edit a calendar event / follow-up.
 *   event        - existing event when editing; otherwise pass `defaults` ({ date, eventType, partyId })
 *   parties / salespersons - options for the optional links
 */
export default function EventModal({ event, defaults = {}, parties, salespersons, onClose, onSaved }) {
    const editing = Boolean(event);
    const [form, setForm] = useState(() => ({
        title: '', date: todayIso(), eventTime: '', eventType: 'meeting', partyId: '', salespersonId: '', notes: '', status: 'scheduled',
        ...defaults,
        ...(event || {})
    }));
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return setError('Enter what this is about');
        if (!form.date) return setError('Choose a date');
        setBusy(true);
        try {
            if (editing) await eventsApi.update(form);
            else await eventsApi.create(form);
            showToast(editing ? 'Event updated' : 'Event added');
            onSaved();
        } catch (err) {
            showToast(err.message || 'Could not save the event', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            as="form"
            title={editing ? 'Edit event' : 'Add event'}
            onClose={onClose}
            onSubmit={submit}
            footer={(
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Add event'}</button>
                </>
            )}
        >
            <div className="form-grid">
                <Field label="Title" required error={error} className="span-2" htmlFor="ev-title">
                    <input id="ev-title" className="input" value={form.title} onChange={set('title')} placeholder="e.g. Call Shree Packaging about the quotation" />
                </Field>
                <Field label="Date" required htmlFor="ev-date"><input id="ev-date" className="input" type="date" value={form.date} onChange={set('date')} /></Field>
                <Field label="Time" htmlFor="ev-time"><input id="ev-time" className="input" type="time" value={form.eventTime} onChange={set('eventTime')} /></Field>
                <Field label="Type" htmlFor="ev-type">
                    <select id="ev-type" className="select" value={form.eventType} onChange={set('eventType')}>
                        {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </Field>
                <Field label="Status" htmlFor="ev-status">
                    <select id="ev-status" className="select" value={form.status} onChange={set('status')}>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                    </select>
                </Field>
                <Field label="Party" htmlFor="ev-party">
                    <SearchSelect id="ev-party" value={form.partyId} onChange={(v) => setForm((f) => ({ ...f, partyId: v }))} emptyLabel="None" searchPlaceholder="Search parties..."
                        options={parties.map((p) => ({ value: p.id, label: p.companyName, sub: p.partyName }))} />
                </Field>
                <Field label="Salesperson" htmlFor="ev-sp">
                    <SearchSelect id="ev-sp" value={form.salespersonId} onChange={(v) => setForm((f) => ({ ...f, salespersonId: v }))} emptyLabel="None" searchPlaceholder="Search salespersons..."
                        options={salespersons.map((s) => ({ value: s.id, label: s.fullName, sub: s.mobile }))} />
                </Field>
                <Field label="Notes" className="span-2" htmlFor="ev-notes"><textarea id="ev-notes" className="textarea" value={form.notes} onChange={set('notes')} /></Field>
            </div>
        </Modal>
    );
}
