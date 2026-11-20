import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ImagePlus, Mail, MessageCircle, Pencil, Phone, PhoneCall, Plus, Search, Trash2, Upload, Users } from 'lucide-react';
import { partiesApi, salespersonsApi } from '../../api';
import BulkUploadModal from '../../components/bulk/BulkUploadModal';
import ExportButton from '../../components/bulk/ExportButton';
import { Avatar, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, useConfirm } from '../../components/ui';
import { SALESPERSON_COLUMNS } from '../../config/columns';
import { useLoad } from '../../hooks/useLoad';
import { logoFileToDataUrl } from '../../utils/image';
import { showToast, whatsappUrl } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const EMPTY = { fullName: '', nickname: '', mobile: '', whatsapp: '', email: '', department: '', employeeId: '', photo: '', notes: '' };
const SALES_DEPARTMENT_NAMES = ['Jaspal', 'Pooja', 'Aman', 'Neha Khan', 'Neha Mishra', 'Muskan', 'Rajwant', 'Renu', 'Satish', 'Swati', 'Uma'];

function SalespersonForm({ person, onClose, onSaved }) {
    const editing = Boolean(person);
    const [form, setForm] = useState({ ...EMPTY, ...(person || {}) });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    // Photo: uploaded files are shrunk to a small JPEG; a pasted URL is used as is.
    const choosePhoto = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
            const photo = await logoFileToDataUrl(file, { maxSide: 256, format: 'image/jpeg' });
            setForm((f) => ({ ...f, photo }));
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const submit = async (event) => {
        event.preventDefault();
        const next = {};
        if (!form.fullName.trim()) next.fullName = 'Enter the full name';
        if (!form.mobile.trim()) next.mobile = 'Enter a mobile number';
        setErrors(next);
        if (Object.keys(next).length) return;

        setBusy(true);
        try {
            const payload = { fullName: form.fullName, nickname: form.nickname, mobile: form.mobile, whatsapp: form.whatsapp, email: form.email, department: form.department, employeeId: form.employeeId, photo: form.photo, notes: form.notes };
            if (editing) await salespersonsApi.update({ ...payload, id: person.id });
            else await salespersonsApi.create(payload);
            showToast(editing ? 'Salesperson updated' : 'Salesperson added');
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
            title={editing ? 'Edit salesperson' : 'Add salesperson'}
            onClose={onClose}
            onSubmit={submit}
            footer={(
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Add salesperson'}</button>
                </>
            )}
        >
            <div className="form-grid">
                <Field label="Full name" required error={errors.fullName} htmlFor="sp-name" className="span-2">
                    <input id="sp-name" className="input" value={form.fullName} onChange={set('fullName')} />
                </Field>
                <Field label="Nickname / short name" htmlFor="sp-nick"><input id="sp-nick" className="input" value={form.nickname} onChange={set('nickname')} /></Field>
                <Field label="Mobile number" required error={errors.mobile} htmlFor="sp-mobile"><input id="sp-mobile" className="input" type="tel" value={form.mobile} onChange={set('mobile')} /></Field>
                <Field label="WhatsApp number" htmlFor="sp-wa"><input id="sp-wa" className="input" type="tel" value={form.whatsapp} onChange={set('whatsapp')} /></Field>
                <Field label="Email" htmlFor="sp-email"><input id="sp-email" className="input" type="email" value={form.email} onChange={set('email')} /></Field>
                <Field label="Department" htmlFor="sp-dept"><input id="sp-dept" className="input" value={form.department} onChange={set('department')} /></Field>
                <Field label="Employee ID" htmlFor="sp-emp"><input id="sp-emp" className="input" value={form.employeeId} onChange={set('employeeId')} /></Field>
                <div className="field span-2">
                    <span className="field-label">Photo</span>
                    <div className="photo-field">
                        <Avatar name={form.fullName || '?'} size="lg" src={form.photo} />
                        <div className="photo-field-controls">
                            <div className="page-actions">
                                <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                                    <ImagePlus /> {form.photo ? 'Change photo' : 'Upload photo'}
                                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} className="sr-only" />
                                </label>
                                {form.photo && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setForm((f) => ({ ...f, photo: '' }))}><Trash2 /> Remove</button>}
                            </div>
                            <input
                                className="input"
                                type="url"
                                placeholder="Or paste an image link"
                                aria-label="Photo link"
                                value={form.photo.startsWith('data:') ? '' : form.photo}
                                onChange={set('photo')}
                            />
                        </div>
                    </div>
                </div>
                <Field label="Notes" htmlFor="sp-notes" className="span-2"><textarea id="sp-notes" className="textarea" value={form.notes} onChange={set('notes')} /></Field>
            </div>
        </Modal>
    );
}

export default function Salespersons() {
    const { can } = useAuth();
    const confirm = useConfirm();
    const { data, loading, error, reload } = useLoad(async () => {
        const [salespersons, parties] = await Promise.all([salespersonsApi.list(), partiesApi.list()]);
        return { salespersons, parties };
    });
    const [query, setQuery] = useState('');
    const [formPerson, setFormPerson] = useState(false); // false = closed, true = add, object = edit
    const [showBulk, setShowBulk] = useState(false);

    const partyCounts = useMemo(() => {
        const counts = new Map();
        for (const p of data?.parties || []) counts.set(p.assignedSalesperson, (counts.get(p.assignedSalesperson) || 0) + 1);
        return counts;
    }, [data]);

    const visible = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        return (data?.salespersons || []).filter((s) => {
            const haystack = [s.fullName, s.nickname, s.mobile, s.email, s.department, s.employeeId].join(' ').toLowerCase();
            return words.every((w) => haystack.includes(w));
        });
    }, [data, query]);

    const remove = async (person) => {
        const count = partyCounts.get(person.id) || 0;
        const ok = await confirm({
            title: `Delete ${person.fullName}?`,
            message: count ? `${count} part${count > 1 ? 'ies are' : 'y is'} assigned to them and will become unassigned.` : 'This cannot be undone.',
            confirmLabel: 'Delete salesperson',
            danger: true
        });
        if (!ok) return;
        try {
            await salespersonsApi.remove(person.id);
            showToast('Salesperson deleted');
            reload({ silent: true });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={reload} />;
    const salespersons = data?.salespersons;

    return (
        <div>
            <PageHeader title="Salespersons" subtitle={salespersons ? `${salespersons.length} on the team` : ''}>
                {can('salespersons.export') && <ExportButton filename="salespersons" count={visible.length} getSheets={() => [{ name: 'Salespersons', columns: SALESPERSON_COLUMNS, records: visible }]} />}
                {can('salespersons.import') && <button type="button" className="btn" onClick={() => setShowBulk(true)}><Upload /> Bulk upload</button>}
                {can('salespersons.create') && <button type="button" className="btn btn-primary" onClick={() => setFormPerson(true)}><Plus /> Add salesperson</button>}
            </PageHeader>

            <section className="sales-team-roster">
                <div className="sales-roster-head"><Users /><div><h2>Sales Department</h2><p>{SALES_DEPARTMENT_NAMES.length} team members</p></div></div>
                <div className="sales-name-list">{SALES_DEPARTMENT_NAMES.map((name) => <span key={name}>{name}</span>)}</div>
            </section>

            {salespersons && salespersons.length > 0 && (
                <div className="toolbar">
                    <div className="search-field grow">
                        <Search aria-hidden="true" />
                        <input className="input" placeholder="Search by name, mobile or department" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search salespersons" />
                    </div>
                </div>
            )}

            {loading && !salespersons ? <Loading label="Loading salespersons..." /> : visible.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={Users}
                        title={query ? 'No one matches' : 'No salespersons yet'}
                        action={can('salespersons.create') && !query && <button type="button" className="btn btn-primary" onClick={() => setFormPerson(true)}><Plus /> Add a salesperson</button>}
                    >
                        {query ? 'Try a different search.' : 'Add your team so parties can be assigned to them.'}
                    </EmptyState>
                </div>
            ) : (
                <div className="card-grid">
                    {visible.map((s) => {
                        const count = partyCounts.get(s.id) || 0;
                        return (
                            <article key={s.id} className="card person-card">
                                <div className="person-top">
                                    <Avatar name={s.fullName} size="lg" src={s.photo} />
                                    <div style={{ minWidth: 0 }}>
                                        <h3 className="truncate"><Link to={`/salespersons/${s.id}`} className="sp-name-link">{s.fullName}</Link></h3>
                                        <div className="sub">{s.nickname ? `“${s.nickname}”` : 'No nickname'}</div>
                                    </div>
                                </div>
                                <div className="person-facts">
                                    <div><Phone aria-hidden="true" /><a href={`tel:${s.mobile}`}>{s.mobile}</a></div>
                                    {s.whatsapp && <div><MessageCircle aria-hidden="true" /><a href={whatsappUrl(s.whatsapp)} target="_blank" rel="noreferrer">{s.whatsapp}</a></div>}
                                    {s.email && <div><Mail aria-hidden="true" /><span className="truncate">{s.email}</span></div>}
                                    {(s.department || s.employeeId) && <div><Briefcase aria-hidden="true" /><span>{[s.department, s.employeeId].filter(Boolean).join(' · ')}</span></div>}
                                </div>
                                <Link to={`/salespersons/${s.id}`} className="btn btn-sm sp-open"><PhoneCall /> Clients, machines &amp; quotations</Link>
                                <div className="person-foot">
                                    <Link to={`/parties?salesperson=${s.id}`} className="cell-main">{count} part{count === 1 ? 'y' : 'ies'}</Link>
                                    <div className="row-actions">
                                        {can('salespersons.edit') && <button type="button" className="icon-btn" onClick={() => setFormPerson(s)} aria-label={`Edit ${s.fullName}`}><Pencil /></button>}
                                        {can('salespersons.delete') && <button type="button" className="icon-btn danger" onClick={() => remove(s)} aria-label={`Delete ${s.fullName}`}><Trash2 /></button>}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {formPerson && (
                <SalespersonForm
                    person={formPerson === true ? null : formPerson}
                    onClose={() => setFormPerson(false)}
                    onSaved={() => { setFormPerson(false); reload({ silent: true }); }}
                />
            )}
            {showBulk && (
                <BulkUploadModal
                    title="Bulk upload salespersons"
                    columns={SALESPERSON_COLUMNS}
                    onUpload={salespersonsApi.bulkCreate}
                    onDone={() => reload({ silent: true })}
                    onClose={() => setShowBulk(false)}
                />
            )}
        </div>
    );
}
