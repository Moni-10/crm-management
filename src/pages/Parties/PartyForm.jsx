import { useState } from 'react';
import { LocateFixed, Plus, Trash2 } from 'lucide-react';
import { machinesApi, partiesApi } from '../../api';
import { Field, Modal, SearchSelect } from '../../components/ui';
import { showToast } from '../../utils/helpers';

export const PARTY_TYPES = ['Customer', 'Prospect', 'Dealer', 'Distributor'];
export const PARTY_STATUSES = ['Active', 'Inactive', 'Follow-up'];

const EMPTY_PARTY = {
    companyName: '', partyName: '', partyNickname: '', alternativeNames: '', primaryMobile: '', alternativeMobile: '', whatsappNumber: '',
    email: '', partyType: 'Customer', assignedSalesperson: '', partyStatus: 'Active', followUpDate: '',
    fullAddress: '', area: '', city: '', district: '', state: '', country: 'India', pincode: '',
    locationName: '', mapsUrl: '', latitude: '', longitude: '', clientRequirements: '', remarks: ''
};

const EMPTY_MACHINE = { name: '', category: '', model: '', quantity: 1, purchaseDate: '', purchaseStatus: 'Purchased' };

/**
 * Add / edit a party, including the machines it has bought.
 *   party        - existing party (with its machines) when editing, null when adding
 *   salespersons - options for the "Assigned salesperson" select
 *   onSaved      - called after everything is saved
 */
export default function PartyForm({ party, salespersons, onClose, onSaved }) {
    const editing = Boolean(party);
    const [form, setForm] = useState(() => ({ ...EMPTY_PARTY, ...(party || {}) }));
    const [machines, setMachines] = useState(() => (party?.machines || []).map((m) => ({ ...m })));
    const [busy, setBusy] = useState(false);
    const [locating, setLocating] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
    const setMachine = (index, key, value) => setMachines((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

    const useMyLocation = () => {
        if (!navigator.geolocation) return showToast('This browser cannot share your location', 'error');
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setForm((f) => ({ ...f, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }));
                setLocating(false);
                showToast('Location filled in');
            },
            () => {
                setLocating(false);
                showToast('Could not read your location. Check the browser permission', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const validate = () => {
        const next = {};
        if (!form.companyName.trim()) next.companyName = 'Enter the company name';
        if (!form.partyName.trim()) next.partyName = 'Enter the contact person';
        if (!form.primaryMobile.trim()) next.primaryMobile = 'Enter a mobile number';
        if (!form.assignedSalesperson) next.assignedSalesperson = 'Choose a salesperson';
        if (!form.fullAddress.trim()) next.fullAddress = 'Enter the full address';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    // Machines are separate records: create new rows, update changed ones, delete the removed ones.
    const saveMachines = async (partyId) => {
        const keptIds = new Set(machines.filter((m) => m.id).map((m) => m.id));
        for (const original of party?.machines || []) {
            if (!keptIds.has(original.id)) await machinesApi.remove(original.id);
        }
        for (const row of machines) {
            if (!row.name.trim()) continue;
            const payload = { ...row, partyId, quantity: Number(row.quantity) || 1 };
            if (row.id) await machinesApi.update(payload);
            else await machinesApi.create(payload);
        }
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!validate()) return;
        setBusy(true);
        try {
            const { machines: _ignored, salespersonName: _name, ...payload } = form;
            const saved = editing
                ? await partiesApi.update({ ...payload, id: party.id })
                : await partiesApi.create(payload);
            await saveMachines(saved.id);
            showToast(editing ? 'Party updated' : 'Party added');
            onSaved();
        } catch (error) {
            showToast(error.message || 'Could not save the party', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            as="form"
            size="lg"
            title={editing ? 'Edit party' : 'Add party'}
            onClose={onClose}
            onSubmit={submit}
            footer={(
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Add party'}</button>
                </>
            )}
        >
            <section className="form-section">
                <h4>Basic details</h4>
                <div className="form-grid">
                    <Field label="Company name" required error={errors.companyName} htmlFor="pf-company">
                        <input id="pf-company" className="input" value={form.companyName} onChange={set('companyName')} />
                    </Field>
                    <Field label="Contact person" required error={errors.partyName} htmlFor="pf-party">
                        <input id="pf-party" className="input" value={form.partyName} onChange={set('partyName')} />
                    </Field>
                    <Field label="Nickname" htmlFor="pf-nick">
                        <input id="pf-nick" className="input" value={form.partyNickname} onChange={set('partyNickname')} />
                    </Field>
                    <Field label="Alternative names" hint="Other names this party is known by. They are searchable." htmlFor="pf-altnames">
                        <input id="pf-altnames" className="input" value={form.alternativeNames} onChange={set('alternativeNames')} />
                    </Field>
                    <Field label="Party type" htmlFor="pf-type">
                        <select id="pf-type" className="select" value={form.partyType} onChange={set('partyType')}>
                            {PARTY_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </Field>
                    <Field label="Assigned salesperson" required error={errors.assignedSalesperson} htmlFor="pf-sp">
                        <SearchSelect id="pf-sp" value={form.assignedSalesperson} onChange={(v) => setForm((f) => ({ ...f, assignedSalesperson: v }))} placeholder="Select a salesperson" searchPlaceholder="Search salespersons..."
                            options={salespersons.map((s) => ({ value: s.id, label: s.fullName, sub: s.mobile }))} />
                    </Field>
                    <Field label="Status" htmlFor="pf-status">
                        <select id="pf-status" className="select" value={form.partyStatus} onChange={set('partyStatus')}>
                            {PARTY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Follow-up date" htmlFor="pf-follow">
                        <input id="pf-follow" className="input" type="date" value={form.followUpDate} onChange={set('followUpDate')} />
                    </Field>
                </div>
            </section>

            <section className="form-section">
                <h4>Contact</h4>
                <div className="form-grid">
                    <Field label="Primary mobile" required error={errors.primaryMobile} htmlFor="pf-mobile">
                        <input id="pf-mobile" className="input" type="tel" value={form.primaryMobile} onChange={set('primaryMobile')} />
                    </Field>
                    <Field label="Alternative mobile" htmlFor="pf-alt">
                        <input id="pf-alt" className="input" type="tel" value={form.alternativeMobile} onChange={set('alternativeMobile')} />
                    </Field>
                    <Field label="WhatsApp number" htmlFor="pf-wa">
                        <input id="pf-wa" className="input" type="tel" value={form.whatsappNumber} onChange={set('whatsappNumber')} />
                    </Field>
                    <Field label="Email" htmlFor="pf-email">
                        <input id="pf-email" className="input" type="email" value={form.email} onChange={set('email')} />
                    </Field>
                </div>
            </section>

            <section className="form-section">
                <h4>Address and location</h4>
                <div className="form-grid">
                    <Field label="Full address" required error={errors.fullAddress} className="span-2" htmlFor="pf-address">
                        <textarea id="pf-address" className="textarea" value={form.fullAddress} onChange={set('fullAddress')} />
                    </Field>
                    <Field label="Area / locality" htmlFor="pf-area"><input id="pf-area" className="input" value={form.area} onChange={set('area')} /></Field>
                    <Field label="City" htmlFor="pf-city"><input id="pf-city" className="input" value={form.city} onChange={set('city')} /></Field>
                    <Field label="District" htmlFor="pf-district"><input id="pf-district" className="input" value={form.district} onChange={set('district')} /></Field>
                    <Field label="State" htmlFor="pf-state"><input id="pf-state" className="input" value={form.state} onChange={set('state')} /></Field>
                    <Field label="Country" htmlFor="pf-country"><input id="pf-country" className="input" value={form.country} onChange={set('country')} /></Field>
                    <Field label="Pincode" htmlFor="pf-pin"><input id="pf-pin" className="input" value={form.pincode} onChange={set('pincode')} /></Field>
                    <Field label="Landmark / location name" htmlFor="pf-loc"><input id="pf-loc" className="input" value={form.locationName} onChange={set('locationName')} /></Field>
                    <Field label="Google Maps link" htmlFor="pf-maps"><input id="pf-maps" className="input" type="url" value={form.mapsUrl} onChange={set('mapsUrl')} /></Field>
                    <Field label="Latitude" htmlFor="pf-lat"><input id="pf-lat" className="input" type="number" step="any" value={form.latitude} onChange={set('latitude')} /></Field>
                    <Field label="Longitude" htmlFor="pf-lng"><input id="pf-lng" className="input" type="number" step="any" value={form.longitude} onChange={set('longitude')} /></Field>
                    <div className="span-2">
                        <button type="button" className="btn btn-sm" onClick={useMyLocation} disabled={locating}>
                            <LocateFixed /> {locating ? 'Finding you...' : 'Use my current location'}
                        </button>
                    </div>
                </div>
            </section>

            <section className="form-section">
                <h4>Machines</h4>
                <div className="machine-rows">
                    {machines.length === 0 && <p className="muted" style={{ fontSize: 14 }}>No machines recorded for this party yet.</p>}
                    {machines.map((m, index) => (
                        <div key={m.id || `new-${index}`} className="machine-row">
                            <Field label="Machine"><input className="input" value={m.name} onChange={(e) => setMachine(index, 'name', e.target.value)} placeholder="e.g. Flexo printing machine" /></Field>
                            <Field label="Category"><input className="input" value={m.category} onChange={(e) => setMachine(index, 'category', e.target.value)} /></Field>
                            <Field label="Model"><input className="input" value={m.model} onChange={(e) => setMachine(index, 'model', e.target.value)} /></Field>
                            <Field label="Qty"><input className="input" type="number" min="1" value={m.quantity} onChange={(e) => setMachine(index, 'quantity', e.target.value)} /></Field>
                            <Field label="Purchased on"><input className="input" type="date" value={m.purchaseDate} onChange={(e) => setMachine(index, 'purchaseDate', e.target.value)} /></Field>
                            <Field label="Status">
                                <select className="select" value={m.purchaseStatus || 'Purchased'} onChange={(e) => setMachine(index, 'purchaseStatus', e.target.value)}>
                                    <option>Purchased</option>
                                    <option>Pending</option>
                                </select>
                            </Field>
                            <button type="button" className="icon-btn danger" onClick={() => setMachines((rows) => rows.filter((_, i) => i !== index))} aria-label="Remove machine"><Trash2 /></button>
                        </div>
                    ))}
                    <div>
                        <button type="button" className="btn btn-sm" onClick={() => setMachines((rows) => [...rows, { ...EMPTY_MACHINE }])}><Plus /> Add machine</button>
                    </div>
                </div>
            </section>

            <section className="form-section">
                <h4>Notes</h4>
                <div className="form-grid">
                    <Field label="Client requirements" className="span-2" htmlFor="pf-req"><textarea id="pf-req" className="textarea" value={form.clientRequirements} onChange={set('clientRequirements')} /></Field>
                    <Field label="Remarks" className="span-2" htmlFor="pf-remarks"><textarea id="pf-remarks" className="textarea" value={form.remarks} onChange={set('remarks')} /></Field>
                </div>
            </section>
        </Modal>
    );
}
