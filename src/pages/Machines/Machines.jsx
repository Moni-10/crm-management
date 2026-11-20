import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cog, LayoutGrid, Pencil, Plus, Rows3, Search, Trash2, Upload } from 'lucide-react';
import { machinesApi, partiesApi } from '../../api';
import BulkUploadModal from '../../components/bulk/BulkUploadModal';
import ExportButton from '../../components/bulk/ExportButton';
import { Badge, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, SearchSelect, useConfirm } from '../../components/ui';
import { MACHINE_COLUMNS } from '../../config/columns';
import { useLoad } from '../../hooks/useLoad';
import { formatDate, showToast } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const EMPTY = { name: '', category: '', model: '', quantity: 1, purchaseDate: '', purchaseStatus: 'Purchased', partyId: '' };

function MachineForm({ machine, parties, onClose, onSaved }) {
    const editing = Boolean(machine);
    const [form, setForm] = useState({ ...EMPTY, ...(machine || {}) });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        if (!form.name.trim()) return setError('Enter the machine name');
        setBusy(true);
        try {
            const { partyName: _ignored, ...payload } = form;
            payload.quantity = Number(payload.quantity) || 1;
            if (editing) await machinesApi.update({ ...payload, id: machine.id });
            else await machinesApi.create(payload);
            showToast(editing ? 'Machine updated' : 'Machine added');
            onSaved();
        } catch (err) {
            showToast(err.message || 'Could not save', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            as="form"
            title={editing ? 'Edit machine' : 'Add machine'}
            onClose={onClose}
            onSubmit={submit}
            footer={(
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Add machine'}</button>
                </>
            )}
        >
            <div className="form-grid">
                <Field label="Machine name" required error={error} className="span-2" htmlFor="m-name">
                    <input id="m-name" className="input" value={form.name} onChange={set('name')} />
                </Field>
                <Field label="Category" htmlFor="m-cat"><input id="m-cat" className="input" value={form.category} onChange={set('category')} placeholder="e.g. Printing" /></Field>
                <Field label="Model" htmlFor="m-model"><input id="m-model" className="input" value={form.model} onChange={set('model')} /></Field>
                <Field label="Quantity" htmlFor="m-qty"><input id="m-qty" className="input" type="number" min="1" value={form.quantity} onChange={set('quantity')} /></Field>
                <Field label="Purchase date" htmlFor="m-date"><input id="m-date" className="input" type="date" value={form.purchaseDate} onChange={set('purchaseDate')} /></Field>
                <Field label="Status" htmlFor="m-status">
                    <select id="m-status" className="select" value={form.purchaseStatus} onChange={set('purchaseStatus')}>
                        <option>Purchased</option>
                        <option>Pending</option>
                    </select>
                </Field>
                <Field label="Bought by" hint="Leave empty for machines in stock." htmlFor="m-party">
                    <SearchSelect id="m-party" value={form.partyId} onChange={(v) => setForm((f) => ({ ...f, partyId: v }))} emptyLabel="In stock (no party)" searchPlaceholder="Search parties..."
                        options={parties.map((p) => ({ value: p.id, label: p.companyName, sub: [p.partyName, p.city].filter(Boolean).join(' · ') }))} />
                </Field>
            </div>
        </Modal>
    );
}

export default function Machines() {
    const { can } = useAuth();
    const confirm = useConfirm();
    const { data, loading, error, reload } = useLoad(async () => {
        const [machines, parties] = await Promise.all([machinesApi.list(), partiesApi.list()]);
        return { machines, parties };
    });
    const [view, setView] = useState('directory');
    const [query, setQuery] = useState('');
    const [formMachine, setFormMachine] = useState(false);
    const [showBulk, setShowBulk] = useState(false);

    const machines = data?.machines;
    const visible = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        return (machines || []).filter((m) => {
            const haystack = [m.name, m.category, m.model, m.partyName].join(' ').toLowerCase();
            return words.every((w) => haystack.includes(w));
        });
    }, [machines, query]);

    // Directory: one card per machine name + model, listing who bought it.
    const groups = useMemo(() => {
        const map = new Map();
        for (const m of visible) {
            const key = `${m.name.toLowerCase()}|${m.model.toLowerCase()}`;
            if (!map.has(key)) map.set(key, { key, name: m.name, category: m.category, model: m.model, total: 0, stock: 0, buyers: [], records: [] });
            const group = map.get(key);
            group.total += m.quantity;
            group.records.push(m);
            if (m.partyId) group.buyers.push(m);
            else group.stock += m.quantity;
        }
        return [...map.values()].sort((a, b) => b.total - a.total);
    }, [visible]);

    const remove = async (machine) => {
        const ok = await confirm({ title: `Delete ${machine.name}?`, message: 'This machine record is removed.', confirmLabel: 'Delete machine', danger: true });
        if (!ok) return;
        try {
            await machinesApi.remove(machine.id);
            showToast('Machine deleted');
            reload({ silent: true });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (error) return <ErrorState message={error} onRetry={reload} />;

    return (
        <div>
            <PageHeader title="Machines" subtitle={machines ? `${machines.length} records across ${groups.length} machine types` : ''}>
                {can('machines.export') && <ExportButton filename="machines" count={visible.length} getSheets={() => [{ name: 'Machines', columns: MACHINE_COLUMNS, records: visible }]} />}
                {can('machines.import') && <button type="button" className="btn" onClick={() => setShowBulk(true)}><Upload /> Bulk upload</button>}
                {can('machines.create') && <button type="button" className="btn btn-primary" onClick={() => setFormMachine(true)}><Plus /> Add machine</button>}
            </PageHeader>

            <div className="toolbar">
                <div className="search-field grow">
                    <Search aria-hidden="true" />
                    <input className="input" placeholder="Search by machine, model, category or buyer" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search machines" />
                </div>
                <div className="segmented" role="group" aria-label="View">
                    <button type="button" className={view === 'directory' ? 'active' : ''} onClick={() => setView('directory')}><LayoutGrid size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Directory</button>
                    <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><Rows3 size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> All records</button>
                </div>
            </div>

            {loading && !machines ? <Loading label="Loading machines..." /> : visible.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={Cog}
                        title={query ? 'No machines match' : 'No machines yet'}
                        action={can('machines.create') && !query && <button type="button" className="btn btn-primary" onClick={() => setFormMachine(true)}><Plus /> Add a machine</button>}
                    >
                        {query ? 'Try a different search.' : 'Record which machines each party has bought.'}
                    </EmptyState>
                </div>
            ) : view === 'directory' ? (
                <div className="card-grid">
                    {groups.map((g) => (
                        <article key={g.key} className="card machine-card">
                            <div>
                                <h3>{g.name}</h3>
                                <p style={{ fontSize: 14 }}>{[g.model && `Model ${g.model}`, g.category].filter(Boolean).join(' · ') || 'No model or category'}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Badge tone="info" plain>{g.total} total</Badge>
                                <Badge tone="success" plain>{g.buyers.length} buyer{g.buyers.length === 1 ? '' : 's'}</Badge>
                                {g.stock > 0 && <Badge tone="warning" plain>{g.stock} in stock</Badge>}
                            </div>
                            <div className="machine-buyers">
                                {g.records.map((r) => (
                                    <div key={r.id} className="machine-buyer" style={{ alignItems: 'center' }}>
                                        {r.partyId ? <Link to={`/parties/${r.partyId}`}>{r.partyName}</Link> : <span className="muted">In stock</span>}
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <span className="muted" style={{ marginRight: 6 }}>x {r.quantity}</span>
                                            {can('machines.edit') && <button type="button" className="icon-btn sm" onClick={() => setFormMachine(r)} aria-label={`Edit ${r.name}`}><Pencil /></button>}
                                            {can('machines.delete') && <button type="button" className="icon-btn sm danger" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}><Trash2 /></button>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="card">
                    <div className="table-wrap">
                        <table className="table stack">
                            <thead><tr><th>Machine</th><th>Model</th><th className="num">Qty</th><th>Bought by</th><th>Purchased</th><th className="actions"><span className="sr-only">Actions</span></th></tr></thead>
                            <tbody>
                                {visible.map((m) => (
                                    <tr key={m.id}>
                                        <td data-label="Machine"><div style={{ textAlign: 'left' }}><div className="cell-main">{m.name}</div><div className="cell-sub">{m.category}</div></div></td>
                                        <td data-label="Model">{m.model || '-'}</td>
                                        <td data-label="Qty" className="num">{m.quantity}</td>
                                        <td data-label="Bought by">{m.partyId ? <Link to={`/parties/${m.partyId}`}>{m.partyName}</Link> : <Badge tone="warning" plain>In stock</Badge>}</td>
                                        <td data-label="Purchased">{formatDate(m.purchaseDate) || '-'}</td>
                                        <td className="actions">
                                            <div className="row-actions">
                                                {can('machines.edit') && <button type="button" className="icon-btn" onClick={() => setFormMachine(m)} aria-label={`Edit ${m.name}`}><Pencil /></button>}
                                                {can('machines.delete') && <button type="button" className="icon-btn danger" onClick={() => remove(m)} aria-label={`Delete ${m.name}`}><Trash2 /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {formMachine && (
                <MachineForm
                    machine={formMachine === true ? null : formMachine}
                    parties={data?.parties || []}
                    onClose={() => setFormMachine(false)}
                    onSaved={() => { setFormMachine(false); reload({ silent: true }); }}
                />
            )}
            {showBulk && (
                <BulkUploadModal
                    title="Bulk upload machines"
                    columns={MACHINE_COLUMNS}
                    hint="Party can be the company name or primary mobile of an existing party. Leave it empty for stock machines."
                    onUpload={machinesApi.bulkCreate}
                    onDone={() => reload({ silent: true })}
                    onClose={() => setShowBulk(false)}
                />
            )}
        </div>
    );
}
