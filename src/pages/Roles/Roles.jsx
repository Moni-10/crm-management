import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { rolesApi } from '../../api';
import { ErrorState, Field, Loading, Modal, PageHeader, useConfirm } from '../../components/ui';
import { showToast } from '../../utils/helpers';

function NewRoleModal({ onClose, onCreated }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const role = await rolesApi.create({ name, description, permissions: [] });
            onCreated(role);
        } catch (e) {
            setError(e.message);
            setBusy(false);
        }
    };

    return (
        <Modal
            as="form" onSubmit={submit} size="sm" title="New role" onClose={onClose}
            footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>Create</button></>}
        >
            {error && <div className="alert error" role="alert" style={{ marginBottom: 12 }}><span>{error}</span></div>}
            <Field label="Role name" required htmlFor="r-name"><input id="r-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field label="Description" htmlFor="r-desc"><input id="r-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <p className="hint">You choose what the role can do on the next screen.</p>
        </Modal>
    );
}

export default function Roles() {
    const confirm = useConfirm();
    const [roles, setRoles] = useState(null);
    const [catalog, setCatalog] = useState(null);
    const [error, setError] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [draft, setDraft] = useState(new Set());
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);

    const load = useCallback((keepId) => {
        setError('');
        Promise.all([rolesApi.list(), rolesApi.catalog()])
            .then(([r, c]) => {
                setRoles(r);
                setCatalog(c.modules);
                setSelectedId((current) => keepId ?? current ?? r.find((x) => x.slug === 'user')?.id ?? r[0]?.id);
            })
            .catch((e) => setError(e.message));
    }, []);
    useEffect(() => load(), [load]);

    const role = useMemo(() => roles?.find((r) => r.id === selectedId), [roles, selectedId]);
    useEffect(() => {
        setDraft(new Set(role?.permissions || []));
        setDirty(false);
    }, [role]);

    const isAdmin = role?.slug === 'admin';

    const toggle = (code, module) => {
        setDraft((current) => {
            const next = new Set(current);
            if (next.has(code)) {
                next.delete(code);
                if (code === `${module}.view`) [...next].filter((c) => c.startsWith(`${module}.`)).forEach((c) => next.delete(c)); // no view = no access
            } else {
                next.add(code);
                next.add(`${module}.view`); // other actions need view
            }
            return next;
        });
        setDirty(true);
    };

    const setModule = (module, on) => {
        setDraft((current) => {
            const next = new Set(current);
            for (const a of module.actions) (on ? next.add(`${module.key}.${a.key}`) : next.delete(`${module.key}.${a.key}`));
            return next;
        });
        setDirty(true);
    };

    const save = async () => {
        setSaving(true);
        try {
            await rolesApi.update(role.id, { permissions: [...draft] });
            showToast('Permissions saved');
            load(role.id);
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!(await confirm({ title: 'Delete role', message: `Delete the role "${role.name}"?`, confirmLabel: 'Delete', danger: true }))) return;
        try {
            await rolesApi.remove(role.id);
            showToast('Role deleted');
            setSelectedId(null);
            load(null);
        } catch (e) {
            showToast(e.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={() => load()} />;
    if (!roles || !catalog) return <Loading label="Loading roles..." />;

    return (
        <div>
            <PageHeader title="Roles & permissions" subtitle="Choose what each role can see and do">
                <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus /> New role</button>
            </PageHeader>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 260px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
                <div className="card card-pad" style={{ display: 'grid', gap: 6 }}>
                    {roles.map((r) => (
                        <button
                            key={r.id} type="button"
                            className={`btn ${r.id === selectedId ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ justifyContent: 'space-between' }}
                            onClick={() => setSelectedId(r.id)}
                        >
                            <span>{r.name}</span><span style={{ opacity: 0.75, fontSize: 12 }}>{r.userCount} user{r.userCount === 1 ? '' : 's'}</span>
                        </button>
                    ))}
                </div>

                {role && (
                    <div className="card">
                        <div className="card-head">
                            <div>
                                <strong>{role.name}</strong>
                                <div className="hint">{role.description || 'Custom role'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {!role.isSystem && <button type="button" className="btn btn-ghost" onClick={remove}><Trash2 /> Delete</button>}
                                {!isAdmin && <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving...' : 'Save changes'}</button>}
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="alert success" style={{ margin: 16 }}>
                                <span><ShieldCheck size={16} style={{ verticalAlign: 'middle' }} /> Admin always has full access, including new modules added later. It cannot be changed.</span>
                            </div>
                        )}
                        <div className="table-wrap">
                            <table className="table">
                                <thead><tr><th>Module</th><th>Permissions</th><th className="actions">All</th></tr></thead>
                                <tbody>
                                    {catalog.map((m) => {
                                        const all = m.actions.every((a) => isAdmin || draft.has(`${m.key}.${a.key}`));
                                        return (
                                            <tr key={m.key}>
                                                <td>{m.label}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                        {m.actions.map((a) => {
                                                            const code = `${m.key}.${a.key}`;
                                                            return (
                                                                <label key={code} className="checkbox">
                                                                    <input
                                                                        type="checkbox" disabled={isAdmin}
                                                                        checked={isAdmin || draft.has(code)}
                                                                        onChange={() => toggle(code, m.key)}
                                                                    />
                                                                    {a.label}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="actions">
                                                    {isAdmin ? <Lock size={16} aria-label="Locked" /> : (
                                                        <input type="checkbox" aria-label={`All ${m.label} permissions`} checked={all} onChange={(e) => setModule(m, e.target.checked)} />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            {creating && <NewRoleModal onClose={() => setCreating(false)} onCreated={(r) => { setCreating(false); showToast('Role created'); load(r.id); }} />}
        </div>
    );
}
