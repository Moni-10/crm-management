import { useState } from 'react';
import { callsApi } from '../../api';
import { Field, Modal } from '../../components/ui';
import { showToast, todayIso } from '../../utils/helpers';

// Add / edit one client a salesperson spoke to. Saved as a call in Calling Data with
// "Handled By" set to this salesperson, so it shows on their page and in Calling Data.

const EMPTY = {
    partyName: '', nickname: '', contactPerson: '', mobileNumber: '', whatsappNumber: '', email: '',
    address: '', city: '', state: '', machineInterest: '', machineNumber: '', requirement: '',
    callDate: '', callTime: '', duration: '', callType: 'Sales', notes: '', status: 'completed'
};

const CALL_TYPES = ['Sales', 'Follow-up', 'Support'];

export default function ClientForm({ client, salesperson, onClose, onSaved }) {
    const editing = Boolean(client?.id);
    const [form, setForm] = useState(() => ({
        ...EMPTY,
        callDate: todayIso(),
        callTime: new Date().toTimeString().slice(0, 5),
        ...(client || {})
    }));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    // Typing in a field clears its error; any contact number / email clears the "add a contact" error.
    const CONTACT_KEYS = ['mobileNumber', 'whatsappNumber', 'email'];
    const set = (key) => (event) => {
        const { value } = event.target;
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => {
            if (!e[key] && !(CONTACT_KEYS.includes(key) && e.mobileNumber)) return e;
            const next = { ...e };
            delete next[key];
            if (CONTACT_KEYS.includes(key)) delete next.mobileNumber;
            return next;
        });
    };

    // "Same as mobile" for WhatsApp, the most common case.
    const copyMobile = () => setForm((f) => ({ ...f, whatsappNumber: f.mobileNumber }));

    const submit = async (event) => {
        event.preventDefault();
        const next = {};
        if (!form.partyName.trim()) next.partyName = 'Enter the client / company name';
        if (!form.mobileNumber.trim() && !form.whatsappNumber.trim() && !form.email.trim()) {
            next.mobileNumber = 'Add at least a mobile, WhatsApp or email';
        }
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email';
        setErrors(next);
        if (Object.keys(next).length) return;

        setBusy(true);
        try {
            const payload = { ...form, handledBy: salesperson.fullName };
            if (editing) await callsApi.update({ ...payload, id: client.id });
            else await callsApi.create(payload);
            showToast(editing ? 'Client updated' : `Client added for ${salesperson.fullName}`);
            onSaved();
        } catch (error) {
            showToast(error.message || 'Could not save', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            as="form"
            size="lg"
            title={editing ? `Edit client — ${client.partyName}` : `Add client for ${salesperson.fullName}`}
            onClose={onClose}
            onSubmit={submit}
            footer={(
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy ? 'Saving...' : editing ? 'Save changes' : 'Add client'}
                    </button>
                </>
            )}
        >
            <h4 className="client-form-section">Client</h4>
            <div className="form-grid">
                <Field label="Client / company name" required error={errors.partyName} htmlFor="cl-party">
                    <input id="cl-party" className="input" value={form.partyName} onChange={set('partyName')} placeholder="e.g. Shree Packaging" />
                </Field>
                <Field label="Nick name" htmlFor="cl-nick">
                    <input id="cl-nick" className="input" value={form.nickname} onChange={set('nickname')} placeholder="e.g. Guptaji" />
                </Field>
                <Field label="Contact person" htmlFor="cl-contact">
                    <input id="cl-contact" className="input" value={form.contactPerson} onChange={set('contactPerson')} />
                </Field>
                <Field label="Mobile number" error={errors.mobileNumber} htmlFor="cl-mobile">
                    <input id="cl-mobile" className="input" type="tel" value={form.mobileNumber} onChange={set('mobileNumber')} />
                </Field>
                <Field label="WhatsApp number" htmlFor="cl-wa">
                    <div className="client-wa">
                        <input id="cl-wa" className="input" type="tel" value={form.whatsappNumber} onChange={set('whatsappNumber')} />
                        {form.mobileNumber && form.whatsappNumber !== form.mobileNumber && (
                            <button type="button" className="btn btn-sm btn-ghost" onClick={copyMobile}>Same as mobile</button>
                        )}
                    </div>
                </Field>
                <Field label="Email" error={errors.email} htmlFor="cl-email">
                    <input id="cl-email" className="input" type="email" value={form.email} onChange={set('email')} />
                </Field>
                <Field label="Address" htmlFor="cl-address" className="span-2">
                    <textarea id="cl-address" className="textarea" rows={2} value={form.address} onChange={set('address')} placeholder="Shop / plot, area" />
                </Field>
                <Field label="City" htmlFor="cl-city">
                    <input id="cl-city" className="input" value={form.city} onChange={set('city')} />
                </Field>
                <Field label="State" htmlFor="cl-state">
                    <input id="cl-state" className="input" value={form.state} onChange={set('state')} />
                </Field>
            </div>

            <h4 className="client-form-section">Machine required</h4>
            <div className="form-grid">
                <Field label="Machine wanted" htmlFor="cl-machine">
                    <input id="cl-machine" className="input" value={form.machineInterest} onChange={set('machineInterest')} placeholder="e.g. Lamination Machine" />
                </Field>
                <Field label="Machine number / model" htmlFor="cl-model">
                    <input id="cl-model" className="input" value={form.machineNumber} onChange={set('machineNumber')} placeholder="e.g. LM-450" />
                </Field>
                <Field label="Client requirement" htmlFor="cl-req" className="span-2" hint="Size, capacity, colours, budget, delivery time… This goes into the message sent to the client.">
                    <textarea
                        id="cl-req"
                        className="textarea"
                        rows={3}
                        value={form.requirement}
                        onChange={set('requirement')}
                        placeholder="e.g. 18 inch roll width, 2 colour printing, auto feeder, budget around ₹12 L, needs delivery in 30 days"
                    />
                </Field>
            </div>

            <h4 className="client-form-section">Call</h4>
            <div className="form-grid">
                <Field label="Call date" htmlFor="cl-date">
                    <input id="cl-date" className="input" type="date" value={form.callDate} onChange={set('callDate')} />
                </Field>
                <Field label="Call time" htmlFor="cl-time">
                    <input id="cl-time" className="input" type="time" value={form.callTime} onChange={set('callTime')} />
                </Field>
                <Field label="Call type" htmlFor="cl-type">
                    <select id="cl-type" className="select" value={form.callType} onChange={set('callType')}>
                        {CALL_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                </Field>
                <Field label="Duration (mins)" htmlFor="cl-dur">
                    <input id="cl-dur" className="input" type="number" min="0" value={form.duration} onChange={set('duration')} />
                </Field>
                <Field label="Notes" htmlFor="cl-notes" className="span-2">
                    <textarea id="cl-notes" className="textarea" value={form.notes} onChange={set('notes')} placeholder="What did the client ask for? Price, delivery, follow-up date…" />
                </Field>
            </div>
            <p className="client-form-note">Saved under <b>{salesperson.fullName}</b> and also shown in Calling Data.</p>
        </Modal>
    );
}
