import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Database, Eye, EyeOff, ImagePlus, KeyRound, LogOut, Palette, ShieldAlert, Trash2, User } from 'lucide-react';
import { adminApi } from '../../api';
import { Field, Modal, PageHeader, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { useTheme } from '../../context/ThemeContext';
import { logoFileToDataUrl } from '../../utils/image';
import { showToast } from '../../utils/helpers';

const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'company', label: 'Company', icon: Building2, adminOnly: true },
    { id: 'security', label: 'Password', icon: KeyRound },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'data', label: 'Data', icon: Database, adminOnly: true }
];

const PREF_REMINDERS = 'pref:reminders';
export const remindersEnabled = () => {
    try { return localStorage.getItem(PREF_REMINDERS) !== 'off'; } catch { return true; }
};

// One layout for every settings section: title + description, body, optional action footer.
function SettingsCard({ title, description, footer, onSubmit, danger, icon: Icon, children }) {
    const Wrapper = onSubmit ? 'form' : 'div';
    return (
        <Wrapper className={`card settings-card ${danger ? 'danger-zone' : ''}`} onSubmit={onSubmit}>
            <div className="settings-card-head">
                <h3>{Icon && <Icon aria-hidden="true" />}{title}</h3>
                {description && <p>{description}</p>}
            </div>
            <div className="settings-card-body">{children}</div>
            {footer && <div className="settings-card-foot">{footer}</div>}
        </Wrapper>
    );
}

function PasswordInput({ id, value, onChange, autoComplete }) {
    const [show, setShow] = useState(false);
    return (
        <div className="input-with-action">
            <input id={id} className="input" type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
            <button type="button" className="icon-btn sm" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff /> : <Eye />}
            </button>
        </div>
    );
}

function ProfileTab() {
    const { user, updateName } = useAuth();
    const [name, setName] = useState(user.name);
    const [busy, setBusy] = useState(false);

    const save = async (event) => {
        event.preventDefault();
        if (!name.trim()) return showToast('Enter your name', 'error');
        setBusy(true);
        try {
            await updateName(name.trim());
            showToast('Profile updated');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <SettingsCard
            title="Your profile"
            description="How you appear in the app. Your email is your login."
            onSubmit={save}
            footer={<button type="submit" className="btn btn-primary" disabled={busy || name.trim() === user.name}>{busy ? 'Saving...' : 'Save changes'}</button>}
        >
            <div className="form-grid">
                <Field label="Name" htmlFor="pf-name" required>
                    <input id="pf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Role" htmlFor="pf-role">
                    <input id="pf-role" className="input" value={user.role === 'admin' ? 'Admin' : user.role} readOnly />
                </Field>
                <Field label="Email" htmlFor="pf-email" hint="Ask an admin if this needs to change." className="span-2">
                    <input id="pf-email" className="input" value={user.email} readOnly />
                </Field>
            </div>
        </SettingsCard>
    );
}

function CompanyTab() {
    const { company, save } = useCompany();
    const [form, setForm] = useState({ ...company });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    const chooseLogo = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
            setForm((f) => ({ ...f, logo: '' }));
            const logo = await logoFileToDataUrl(file);
            setForm((f) => ({ ...f, logo }));
        } catch (err) {
            setForm((f) => ({ ...f, logo: company.logo }));
            showToast(err.message, 'error');
        }
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!form.name.trim()) return setError('Enter the company name');
        setError('');
        setBusy(true);
        try {
            await save(form);
            showToast('Company details saved');
        } catch (err) {
            showToast(err.message || 'Could not save', 'error');
        } finally {
            setBusy(false);
        }
    };

    const changed = JSON.stringify(form) !== JSON.stringify(company);

    return (
        <SettingsCard
            title="Company details"
            description="Shown in the sidebar, on the login screen and on the quotation letterhead (preview and PDF)."
            onSubmit={submit}
            footer={(
                <>
                    {changed && <span className="muted" style={{ fontSize: 13, marginRight: 'auto' }}>You have unsaved changes</span>}
                    <button type="submit" className="btn btn-primary" disabled={busy || !changed}>{busy ? 'Saving...' : 'Save company details'}</button>
                </>
            )}
        >
            <section className="form-section">
                <h4>Branding</h4>
                <div className="logo-uploader">
                    <div className="logo-preview" aria-label="Logo preview">
                        {form.logo ? <img src={form.logo} alt="Company logo" /> : <span className="muted">No logo</span>}
                    </div>
                    <div className="logo-controls">
                        <div className="page-actions">
                            <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                                <ImagePlus /> {form.logo ? 'Change logo' : 'Upload logo'}
                                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={chooseLogo} className="sr-only" />
                            </label>
                            {form.logo && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setForm((f) => ({ ...f, logo: '' }))}><Trash2 /> Remove</button>}
                        </div>
                        <span className="muted" style={{ fontSize: 13 }}>PNG, JPG, WebP or SVG under 1 MB. It is shown exactly as you upload it.</span>
                    </div>
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                    <Field label="Company name" required error={error} htmlFor="co-name"><input id="co-name" className="input" value={form.name} onChange={set('name')} /></Field>
                    <Field label="Short name" hint="Shown in the logo tile when there is no logo." htmlFor="co-short"><input id="co-short" className="input" maxLength={20} value={form.shortName} onChange={set('shortName')} /></Field>
                </div>
            </section>

            <section className="form-section">
                <h4>Contact</h4>
                <div className="form-grid">
                    <Field label="Email" htmlFor="co-email"><input id="co-email" className="input" type="email" value={form.email} onChange={set('email')} /></Field>
                    <Field label="Website" htmlFor="co-web"><input id="co-web" className="input" value={form.website} onChange={set('website')} /></Field>
                    <Field label="Address" hint="One line per row." htmlFor="co-addr"><textarea id="co-addr" className="textarea" value={form.address} onChange={set('address')} /></Field>
                    <Field label="Phone numbers" hint="One line per row." htmlFor="co-phones"><textarea id="co-phones" className="textarea" value={form.phones} onChange={set('phones')} /></Field>
                </div>
            </section>

            <section className="form-section">
                <h4>Letterhead</h4>
                <div className="form-grid">
                    <Field label="GSTIN" htmlFor="co-gstin"><input id="co-gstin" className="input" value={form.gstin} onChange={set('gstin')} /></Field>
                    <Field label="IEC no." htmlFor="co-iec"><input id="co-iec" className="input" value={form.iec} onChange={set('iec')} /></Field>
                    <Field label="Tagline" hint="One line per row. Printed under the company name." className="span-2" htmlFor="co-tag">
                        <textarea id="co-tag" className="textarea" style={{ minHeight: 72 }} value={form.tagline} onChange={set('tagline')} />
                    </Field>
                </div>
            </section>
        </SettingsCard>
    );
}

function SecurityTab() {
    const { changePassword } = useAuth();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const save = async (event) => {
        event.preventDefault();
        setError('');
        if (next.length < 8) return setError('The new password must be at least 8 characters');
        if (next !== confirm) return setError('The two new passwords do not match');
        setBusy(true);
        try {
            await changePassword(current, next);
            setCurrent(''); setNext(''); setConfirm('');
            showToast('Password changed');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <SettingsCard
            title="Change password"
            description="You stay logged in on this device. Any other device is logged out."
            onSubmit={save}
            footer={<button type="submit" className="btn btn-primary" disabled={busy || !current || !next || !confirm}>{busy ? 'Updating...' : 'Update password'}</button>}
        >
            {error && <div className="alert error" role="alert" style={{ marginBottom: 16 }}><span>{error}</span></div>}
            <div className="form-grid">
                <Field label="Current password" htmlFor="pw-current" className="span-2">
                    <PasswordInput id="pw-current" value={current} onChange={setCurrent} autoComplete="current-password" />
                </Field>
                <Field label="New password" htmlFor="pw-new" hint="At least 8 characters.">
                    <PasswordInput id="pw-new" value={next} onChange={setNext} autoComplete="new-password" />
                </Field>
                <Field label="Confirm new password" htmlFor="pw-confirm">
                    <PasswordInput id="pw-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
                </Field>
            </div>
        </SettingsCard>
    );
}

function PreferencesTab() {
    const { theme, setTheme } = useTheme();
    const [reminders, setReminders] = useState(remindersEnabled);

    const toggleReminders = (checked) => {
        setReminders(checked);
        try { localStorage.setItem(PREF_REMINDERS, checked ? 'on' : 'off'); } catch { /* storage unavailable */ }
    };

    return (
        <SettingsCard title="Preferences" description="Saved on this device. Changes apply straight away.">
            <div className="setting-row">
                <div><strong>Theme</strong><span>Light or dark. You can also switch from the sun/moon button in the header.</span></div>
                <div className="segmented" role="group" aria-label="Theme">
                    <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Light</button>
                    <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Dark</button>
                </div>
            </div>
            <div className="setting-row">
                <div><strong>Today&apos;s reminders</strong><span>Show follow-ups and events due today at the top of the dashboard.</span></div>
                <label className="switch">
                    <input type="checkbox" checked={reminders} onChange={(e) => toggleReminders(e.target.checked)} aria-label="Show today's reminders" />
                    <i />
                </label>
            </div>
        </SettingsCard>
    );
}

function DataTab() {
    const confirm = useConfirm();
    const [hasData, setHasData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const refresh = () => adminApi.dataStatus().then((r) => setHasData(r.hasData)).catch(() => setHasData(null));
    useEffect(() => { refresh(); }, []);

    const loadSample = async () => {
        const ok = await confirm({
            title: 'Load sample data?',
            message: 'Adds demo salespersons, parties, machines, quotations and events so you can try the app.',
            confirmLabel: 'Load sample data'
        });
        if (!ok) return;
        setBusy(true);
        try {
            const { counts } = await adminApi.loadSampleData();
            showToast(`Added ${counts.parties} parties, ${counts.quotations} quotations and more`);
            refresh();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    const clearAll = async (event) => {
        event.preventDefault();
        setError('');
        setBusy(true);
        try {
            await adminApi.clearData(password);
            setClearing(false);
            setPassword('');
            showToast('All data deleted');
            refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <SettingsCard
                title="Sample data"
                description="Fill an empty database with demo records to explore the app."
                footer={(
                    <>
                        {hasData === true && <span className="muted" style={{ fontSize: 13, marginRight: 'auto' }}>Available only while the database is empty.</span>}
                        <button type="button" className="btn" onClick={loadSample} disabled={busy || hasData === true}>Load sample data</button>
                    </>
                )}
            >
                <p>Adds demo salespersons, parties, machines, quotations and calendar events.</p>
            </SettingsCard>

            <SettingsCard
                danger
                icon={ShieldAlert}
                title="Delete all data"
                description="Permanently deletes every party, salesperson, machine, quotation and event. Login accounts and company details are kept."
                footer={<button type="button" className="btn btn-danger" onClick={() => { setClearing(true); setError(''); }} disabled={hasData === false}>Delete all data</button>}
            >
                <p>This cannot be undone. Download a backup from Backup and restore first if you might need the data.</p>
            </SettingsCard>

            {clearing && (
                <Modal
                    as="form"
                    size="sm"
                    title="Delete all data?"
                    onClose={() => setClearing(false)}
                    onSubmit={clearAll}
                    footer={(
                        <>
                            <button type="button" className="btn" onClick={() => setClearing(false)}>Cancel</button>
                            <button type="submit" className="btn btn-danger" disabled={busy || !password}>Delete everything</button>
                        </>
                    )}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p>This cannot be undone. Enter your password to confirm.</p>
                        {error && <div className="alert error" role="alert"><span>{error}</span></div>}
                        <Field label="Your password" htmlFor="clear-pw">
                            <PasswordInput id="clear-pw" value={password} onChange={setPassword} autoComplete="current-password" />
                        </Field>
                    </div>
                </Modal>
            )}
        </>
    );
}

export default function Settings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabs = TABS.filter((tab) => !tab.adminOnly || user.role === 'admin');
    const requested = searchParams.get('tab');
    const active = tabs.some((tab) => tab.id === requested) ? requested : 'profile';

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div>
            <PageHeader title="Settings" subtitle="Your account, your company and how the app behaves." />
            <div className="settings-layout">
                <nav className="settings-nav" aria-label="Settings sections">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            className={active === id ? 'active' : ''}
                            aria-current={active === id ? 'page' : undefined}
                            onClick={() => setSearchParams(id === 'profile' ? {} : { tab: id })}
                        >
                            <Icon aria-hidden="true" /> {label}
                        </button>
                    ))}
                    <div className="settings-nav-sep" />
                    <button type="button" onClick={handleLogout}><LogOut aria-hidden="true" /> Log out</button>
                </nav>
                <div className="settings-content" key={active}>
                    {active === 'profile' && <ProfileTab />}
                    {active === 'company' && <CompanyTab />}
                    {active === 'security' && <SecurityTab />}
                    {active === 'preferences' && <PreferencesTab />}
                    {active === 'data' && <DataTab />}
                </div>
            </div>
        </div>
    );
}
