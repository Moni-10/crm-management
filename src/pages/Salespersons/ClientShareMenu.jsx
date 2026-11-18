import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Copy, FileDown, FileText, Mail, MessageCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';
import { digitsOnly, mailtoUrl, showToast, whatsappUrl } from '../../utils/helpers';
import { quotationText } from '../Quotations/ShareMenu';

// Ready-to-send message for a client: the machine they want, their requirement and who to contact.
export function clientMessage(client, salesperson, companyName) {
    const name = client.contactPerson || client.partyName;
    const machine = [client.machineInterest, client.machineNumber && `(Model ${client.machineNumber})`].filter(Boolean).join(' ');
    return [
        `Namaste ${name} ji,`,
        '',
        `Thank you for your enquiry with *${companyName}*.`,
        machine && `*Machine:* ${machine}`,
        client.requirement && `*Your requirement:* ${client.requirement}`,
        '',
        'We will share the best price and full details with you shortly.',
        `For any query please contact ${salesperson.fullName}${salesperson.mobile ? ` - ${salesperson.mobile}` : ''}.`,
        '',
        'Regards,',
        companyName
    ].filter((line) => line !== undefined && line !== null && line !== false).join('\n');
}

const lower = (v) => String(v || '').trim().toLowerCase();

// Quotations that belong to this client: same company name, or the same mobile number.
export function quotationsForClient(client, quotations) {
    const phones = [client.mobileNumber, client.whatsappNumber].map(digitsOnly).filter((d) => d.length >= 10).map((d) => d.slice(-10));
    return quotations.filter((q) => {
        if (lower(q.companyName) && lower(q.companyName) === lower(client.partyName)) return true;
        const qPhone = digitsOnly(q.mobile).slice(-10);
        return qPhone.length === 10 && phones.includes(qPhone);
    });
}

/**
 * "Send" button for one client row: WhatsApp / email the requirement message, copy it, or send one of
 * the client's quotations. The menu is fixed-positioned so the scrolling table does not clip it.
 */
export default function ClientShareMenu({ client, salesperson, quotations }) {
    const { company } = useCompany();
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    const phone = client.whatsappNumber || client.mobileNumber;
    const message = clientMessage(client, salesperson, company.name);
    const clientQuotes = quotationsForClient(client, quotations);

    useLayoutEffect(() => {
        if (!open || !buttonRef.current) return;
        const r = buttonRef.current.getBoundingClientRect();
        const menuHeight = menuRef.current?.offsetHeight || 260;
        const below = r.bottom + 6 + menuHeight < window.innerHeight;
        setPos({ right: Math.max(8, window.innerWidth - r.right), ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }) });
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const close = (event) => {
            if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false);
        };
        const onKey = (event) => event.key === 'Escape' && setOpen(false);
        const onMove = () => setOpen(false);
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', onMove);
        window.addEventListener('scroll', onMove, true);
        return () => {
            document.removeEventListener('pointerdown', close);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onMove);
            window.removeEventListener('scroll', onMove, true);
        };
    }, [open]);

    const copy = async (text, label) => {
        setOpen(false);
        try {
            await navigator.clipboard.writeText(text);
            showToast(`${label} copied`);
        } catch {
            showToast('Could not copy', 'error');
        }
    };

    const subject = `${client.machineInterest || 'Your enquiry'} - ${company.name}`;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className="icon-btn sm share"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                title="Send message / quotation to client"
                aria-label={`Send message or quotation to ${client.partyName}`}
            >
                <Send size={16} />
            </button>
            {open && (
                <div ref={menuRef} className="menu client-share-menu" role="menu" style={{ position: 'fixed', ...(pos || { visibility: 'hidden' }) }}>
                    <div className="menu-label">Requirement message</div>
                    {phone ? (
                        <a className="menu-item" role="menuitem" href={whatsappUrl(phone, message)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
                            <MessageCircle style={{ color: '#25a244' }} /> WhatsApp to {phone}
                        </a>
                    ) : (
                        <span className="menu-item disabled"><MessageCircle /> No mobile / WhatsApp number</span>
                    )}
                    {client.email ? (
                        <a className="menu-item" role="menuitem" href={mailtoUrl(client.email, subject, message)} onClick={() => setOpen(false)}>
                            <Mail /> Email to {client.email}
                        </a>
                    ) : (
                        <span className="menu-item disabled"><Mail /> No email saved</span>
                    )}
                    <button type="button" className="menu-item" role="menuitem" onClick={() => copy(message, 'Message')}>
                        <Copy /> Copy message
                    </button>

                    <div className="menu-sep" />
                    <div className="menu-label">Quotations {clientQuotes.length > 0 && `(${clientQuotes.length})`}</div>
                    {clientQuotes.length === 0 ? (
                        <Link className="menu-item" role="menuitem" to="/quotations?new=1" onClick={() => setOpen(false)}>
                            <FileText /> No quotation yet — make one
                        </Link>
                    ) : clientQuotes.slice(0, 4).map((q) => (
                        <div key={q.id} className="client-share-quote">
                            <span className="client-share-quote-no">{q.quotationNumber}</span>
                            {phone && (
                                <a className="menu-item" role="menuitem" href={whatsappUrl(phone, quotationText(q))} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
                                    <MessageCircle style={{ color: '#25a244' }} /> WhatsApp
                                </a>
                            )}
                            {client.email && (
                                <a className="menu-item" role="menuitem" href={mailtoUrl(client.email, `Quotation ${q.quotationNumber} - ${company.name}`, quotationText(q))} onClick={() => setOpen(false)}>
                                    <Mail /> Email
                                </a>
                            )}
                            <Link className="menu-item" role="menuitem" to={`/quotations?pdf=${q.id}`} onClick={() => setOpen(false)}>
                                <FileDown /> PDF
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
