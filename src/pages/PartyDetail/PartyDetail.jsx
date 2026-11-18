import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Copy, FileText, MapPin, MessageCircle, Navigation, Pencil, Phone, Printer, Share2, Trash2
} from 'lucide-react';
import { partiesApi, quotationsApi, salespersonsApi } from '../../api';
import { Avatar, Badge, EmptyState, ErrorState, Loading, Modal, useConfirm } from '../../components/ui';
import { useLoad } from '../../hooks/useLoad';
import { formatCurrency, formatDate, showToast, whatsappUrl } from '../../utils/helpers';
import { directionsLink, mapsLink } from '../../utils/maps';
import { buildPartyReportHtml } from '../../utils/partyReport';
import { buildShareMessage, SHARE_FIELDS, SHARE_TYPES } from '../../utils/partyShare';
import { printHtml } from '../../utils/printHtml';
import PartyForm from '../Parties/PartyForm';

function Info({ label, children }) {
    return (
        <div className="info-item">
            <dt>{label}</dt>
            <dd>{children || <span className="muted">Not set</span>}</dd>
        </div>
    );
}

function ShareModal({ party, onClose }) {
    const [type, setType] = useState('complete');
    const [fields, setFields] = useState(SHARE_FIELDS.map((f) => f.key));
    const message = useMemo(() => buildShareMessage(party, type, fields), [party, type, fields]);

    const toggleField = (key) => setFields((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            showToast('Message copied');
        } catch {
            showToast('Could not copy the message', 'error');
        }
    };

    return (
        <Modal
            title={`Share ${party.companyName}`}
            onClose={onClose}
            footer={(
                <>
                    <button type="button" className="btn" onClick={copy}><Copy /> Copy</button>
                    <a className="btn btn-primary" href={whatsappUrl('', message)} target="_blank" rel="noreferrer"><MessageCircle /> Send on WhatsApp</a>
                </>
            )}
        >
            <div className="option-list" role="radiogroup" aria-label="What to share">
                {SHARE_TYPES.map((option) => (
                    <label key={option.id} className={`option ${type === option.id ? 'selected' : ''}`}>
                        <input type="radio" name="share-type" checked={type === option.id} onChange={() => setType(option.id)} />
                        <div><strong>{option.label}</strong><span>{option.description}</span></div>
                    </label>
                ))}
            </div>
            {type === 'custom' && (
                <div className="form-grid" style={{ marginBottom: 16 }}>
                    {SHARE_FIELDS.map((f) => (
                        <label key={f.key} className="checkbox">
                            <input type="checkbox" checked={fields.includes(f.key)} onChange={() => toggleField(f.key)} /> {f.label}
                        </label>
                    ))}
                </div>
            )}
            <div className="field-label" style={{ marginBottom: 6 }}>Message preview</div>
            <div className="share-preview">{message}</div>
        </Modal>
    );
}

export default function PartyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [sharing, setSharing] = useState(false);
    const [editing, setEditing] = useState(false);

    const { data, loading, error, reload } = useLoad(async () => {
        const [party, quotations, salespersons] = await Promise.all([partiesApi.get(id), quotationsApi.list(), salespersonsApi.list()]);
        return { party, quotations: quotations.filter((q) => q.partyId === id), salespersons };
    }, null);

    if (loading && !data) return <Loading label="Loading party..." />;
    if (error) {
        return (
            <div>
                <Link to="/parties" className="back-link"><ArrowLeft /> Parties</Link>
                <ErrorState message={error === 'Not found' ? 'This party was not found. It may have been deleted.' : error} onRetry={reload} />
            </div>
        );
    }

    const { party, quotations, salespersons } = data;
    const maps = mapsLink(party);
    const directions = directionsLink(party);
    const whatsappNumber = party.whatsappNumber || party.primaryMobile;

    const copyLocation = async () => {
        try {
            await navigator.clipboard.writeText(maps);
            showToast('Location link copied');
        } catch {
            showToast('Could not copy the link', 'error');
        }
    };

    const remove = async () => {
        const ok = await confirm({ title: `Delete ${party.companyName}?`, message: 'The party and its machines are removed.', confirmLabel: 'Delete party', danger: true });
        if (!ok) return;
        try {
            await partiesApi.remove(party.id);
            showToast('Party deleted');
            navigate('/parties', { replace: true });
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    return (
        <div>
            <Link to="/parties" className="back-link"><ArrowLeft /> Parties</Link>

            <div className="detail-hero">
                <Avatar name={party.companyName} size="lg" />
                <div style={{ flex: 1, minWidth: 220 }}>
                    <h1>{party.companyName}</h1>
                    <p>{party.partyName} · {party.partyType}</p>
                </div>
                <Badge>{party.partyStatus}</Badge>
            </div>

            <div className="page-actions" style={{ marginBottom: 24 }}>
                <a className="btn btn-primary" href={`tel:${party.primaryMobile}`}><Phone /> Call</a>
                <a className="btn" href={whatsappUrl(whatsappNumber)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
                {maps && <a className="btn" href={maps} target="_blank" rel="noreferrer"><MapPin /> Open in Maps</a>}
                {directions && <a className="btn" href={directions} target="_blank" rel="noreferrer"><Navigation /> Directions</a>}
                {maps && <button type="button" className="btn" onClick={copyLocation}><Copy /> Copy location</button>}
                <button type="button" className="btn" onClick={() => setSharing(true)}><Share2 /> Share</button>
                <button type="button" className="btn" onClick={() => printHtml(buildPartyReportHtml(party, quotations))}><Printer /> Print / PDF</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}><Pencil /> Edit</button>
                <button type="button" className="btn btn-ghost" onClick={remove}><Trash2 /> Delete</button>
            </div>

            <div className="detail-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card">
                        <div className="card-head"><h3>Contact and address</h3></div>
                        <dl className="card-body info-grid" style={{ margin: 0 }}>
                            <Info label="Primary mobile">{party.primaryMobile}</Info>
                            <Info label="Alternative mobile">{party.alternativeMobile}</Info>
                            <Info label="WhatsApp">{party.whatsappNumber}</Info>
                            <Info label="Email">{party.email && <a href={`mailto:${party.email}`}>{party.email}</a>}</Info>
                            <Info label="Address">{party.fullAddress}</Info>
                            <Info label="Area">{party.area}</Info>
                            <Info label="City">{party.city}</Info>
                            <Info label="District">{party.district}</Info>
                            <Info label="State">{[party.state, party.country].filter(Boolean).join(', ')}</Info>
                            <Info label="Pincode">{party.pincode}</Info>
                            <Info label="Landmark">{party.locationName}</Info>
                            <Info label="Coordinates">{party.latitude !== '' && party.longitude !== '' ? `${party.latitude}, ${party.longitude}` : ''}</Info>
                        </dl>
                    </div>

                    <div className="card">
                        <div className="card-head"><h3>Machines ({party.machines.length})</h3></div>
                        {party.machines.length === 0 ? (
                            <EmptyState title="No machines recorded">Add machines from Edit to see what this party has bought.</EmptyState>
                        ) : (
                            <div className="table-wrap">
                                <table className="table">
                                    <thead><tr><th>Machine</th><th>Model</th><th className="num">Qty</th><th>Purchased</th></tr></thead>
                                    <tbody>
                                        {party.machines.map((m) => (
                                            <tr key={m.id}>
                                                <td><div className="cell-main">{m.name}</div><div className="cell-sub">{m.category}</div></td>
                                                <td>{m.model || '-'}</td>
                                                <td className="num">{m.quantity}</td>
                                                <td>{formatDate(m.purchaseDate) || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {(party.clientRequirements || party.remarks) && (
                        <div className="card">
                            <div className="card-head"><h3>Notes</h3></div>
                            <dl className="card-body info-grid" style={{ margin: 0, gridTemplateColumns: '1fr' }}>
                                {party.clientRequirements && <Info label="Client requirements">{party.clientRequirements}</Info>}
                                {party.remarks && <Info label="Remarks">{party.remarks}</Info>}
                            </dl>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card">
                        <div className="card-head"><h3>Account</h3></div>
                        <dl className="card-body info-grid" style={{ margin: 0, gridTemplateColumns: '1fr' }}>
                            <Info label="Salesperson">{party.salespersonName}</Info>
                            <Info label="Follow-up date">{formatDate(party.followUpDate)}</Info>
                            <Info label="Added on">{formatDate(party.createdAt)}</Info>
                        </dl>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <h3><FileText aria-hidden="true" /> Quotations</h3>
                            <Link to="/quotations?new=1" className="card-link">New</Link>
                        </div>
                        {quotations.length === 0 ? (
                            <EmptyState title="No quotations yet" />
                        ) : (
                            <ul className="feed card-body" style={{ margin: 0 }}>
                                {quotations.map((q) => (
                                    <li key={q.id}>
                                        <div style={{ flex: 1 }}>
                                            <Link to={`/quotations?edit=${q.id}`} className="cell-main">{q.quotationNumber}</Link>
                                            <div className="feed-time">{formatDate(q.quotationDate)} · {formatCurrency(q.totalAmount)}</div>
                                        </div>
                                        <Badge>{q.status}</Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {sharing && <ShareModal party={party} onClose={() => setSharing(false)} />}
            {editing && (
                <PartyForm
                    party={party}
                    salespersons={salespersons}
                    onClose={() => setEditing(false)}
                    onSaved={() => { setEditing(false); reload({ silent: true }); }}
                />
            )}
        </div>
    );
}
