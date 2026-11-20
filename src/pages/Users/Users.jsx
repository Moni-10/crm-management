import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { rolesApi, usersApi } from '../../api';
import { Badge, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/helpers';

const EMPTY = { name: '', email: '', password: '', role: 'user', active: true };

function UserForm({ user, roles, onClose, onSaved }) {
    const editing = Boolean(user?.id);
    const [form, setForm] = useState(editing ? { name: user.name, email: user.email, password: '', role: user.role, active: user.active } : EMPTY);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            if (editing) {
                const body = { name: form.name, role: form.role, active: form.active };
                if (form.password) body.password = form.password;
                await usersApi.update(user.id, body);
            } else {
                await usersApi.create(form);
            }
            showToast(editing ? 'User updated' : 'User created');
            onSaved();
        } catch (e) {
            setError(e.message);
            setBusy(false);
        }
    };

    return (
        <Modal
            as="form"
            onSubmit={submit}
            title={editing ? 'Edit user' : 'Add user'}
            onClose={onClose}
            footer={(
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
                </>
            )}
        >
            {error && <div className="alert error" role="alert" style={{ marginBottom: 12 }}><span>{error}</span></div>}
            <div className="form-grid">
                <Field label="Name" required htmlFor="u-name"><input id="u-name" className="input" value={form.name} onChange={set('name')} required /></Field>
                <Field label="Email" required htmlFor="u-email">
                    <input id="u-email" className="input" type="email" value={form.email} onChange={set('email')} required disabled={editing} />
                </Field>
                <Field label="Role" htmlFor="u-role">
                    <select id="u-role" className="input" value={form.role} onChange={set('role')}>
                        {roles.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                    </select>
                </Field>
                <Field
                    label={editing ? 'New password' : 'Password'}
                    required={!editing}
                    hint={editing ? 'Leave empty to keep the current password' : 'At least 8 characters'}
                    htmlFor="u-pass"
                >
                    <input id="u-pass" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required={!editing} minLength={form.password || !editing ? 8 : undefined} />
                </Field>
                {editing && (
                    <label className="checkbox span-2">
                        <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
                        Account is active (untick to block sign-in)
                    </label>
                )}
            </div>
        </Modal>
    );
}

export default function Users() {
    const { user: me } = useAuth();
    const confirm = useConfirm();
    const [users, setUsers] = useState(null);
    const [roles, setRoles] = useState([]);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null);

    const load = useCallback(() => {
        setError('');
        Promise.all([usersApi.list(), rolesApi.list()])
            .then(([u, r]) => { setUsers(u); setRoles(r); })
            .catch((e) => setError(e.message));
    }, []);
    useEffect(load, [load]);

    const roleName = (slug) => roles.find((r) => r.slug === slug)?.name || slug;

    const remove = async (u) => {
        if (!(await confirm({ title: 'Delete user', message: `Delete ${u.name} (${u.email})? They will no longer be able to sign in.`, confirmLabel: 'Delete', danger: true }))) return;
        try {
            await usersApi.remove(u.id);
            showToast('User deleted');
            load();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={load} />;
    if (!users) return <Loading label="Loading users..." />;

    return (
        <div>
            <PageHeader title="Users" subtitle={`${users.length} accounts`}>
                <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus /> Add user</button>
            </PageHeader>
            <div className="card">
                {users.length === 0 ? (
                    <EmptyState icon={UserCog} title="No users" />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th className="actions" /></tr></thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td>{u.name}{u.id === me?.id && <span className="hint"> (you)</span>}</td>
                                        <td>{u.email}</td>
                                        <td><Badge tone={u.role === 'admin' ? 'info' : undefined} plain>{roleName(u.role)}</Badge></td>
                                        <td><Badge tone={u.active ? 'success' : 'danger'}>{u.active ? 'Active' : 'Disabled'}</Badge></td>
                                        <td className="actions">
                                            <button type="button" className="icon-btn" onClick={() => setForm(u)} aria-label={`Edit ${u.name}`} title="Edit / reset password"><Pencil /></button>
                                            {u.id !== me?.id && (
                                                <button type="button" className="icon-btn danger" onClick={() => remove(u)} aria-label={`Delete ${u.name}`}><Trash2 /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <p className="hint" style={{ marginTop: 12 }}><KeyRound size={14} style={{ verticalAlign: 'middle' }} /> Setting a new password signs that user out everywhere.</p>
            {form && <UserForm user={form} roles={roles} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
        </div>
    );
}
