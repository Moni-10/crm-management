import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Copy, FileDown, MessageCircle, Share2 } from 'lucide-react';
import { showToast, whatsappUrl } from '../../utils/helpers';

const inr = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;

// Plain-text version of a quotation for WhatsApp / copying.
export function quotationText(q) {
    const items = (q.machineDetails || []).map((m, i) => {
        const model = m.machineModel ? ` (${m.machineModel})` : '';
        return `${i + 1}. ${m.machineName}${model} x ${m.quantity} @ ${inr(m.unitPrice)} = ${inr(m.amount)}`;
    });
    return [
        `*Quotation ${q.quotationNumber}* - Mohindra Mechanical Works`,
        q.companyName && `To: ${q.companyName}${q.partyName ? ` (${q.partyName})` : ''}`,
        '',
        ...items,
        '',
        Number(q.discount) > 0 && `Discount: ${inr(q.discount)}`,
        Number(q.gstTax) > 0 && `GST @ ${q.gstTax}%`,
        `*Total: ${inr(q.totalAmount)}*${Number(q.gstTax) > 0 ? '' : ' (GST, loading, insurance, packing, transportation and installation extra)'}`,
        q.paymentTerms && `Payment: ${q.paymentTerms}`,
        q.deliveryTerms && `Delivery: ${q.deliveryTerms}`,
        q.validityDate && `Valid until: ${q.validityDate}`
    ].filter((line) => line !== undefined && line !== null && line !== false).join('\n');
}

/**
 * "Share" dropdown for a quotation: send on WhatsApp, download as PDF, copy the text.
 *   onDownload - produces the PDF (opens the print view's print / save-as-PDF dialog)
 */
export default function ShareMenu({ quotation, onDownload }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const close = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        const onKey = (event) => event.key === 'Escape' && setOpen(false);
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', close);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const run = (action) => () => {
        setOpen(false);
        action();
    };

    const copyText = async () => {
        try {
            await navigator.clipboard.writeText(quotationText(quotation));
            showToast('Quotation text copied');
        } catch {
            showToast('Could not copy', 'error');
        }
    };

    return (
        <div className="menu-wrap" ref={ref}>
            <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
                <Share2 /> Share <ChevronDown />
            </button>
            {open && (
                <div className="menu" role="menu">
                    <a
                        className="menu-item"
                        role="menuitem"
                        href={whatsappUrl(quotation.mobile, quotationText(quotation))}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setOpen(false)}
                    >
                        <MessageCircle style={{ color: '#25a244' }} /> Send on WhatsApp
                    </a>
                    <button type="button" className="menu-item" role="menuitem" onClick={run(onDownload)}>
                        <FileDown /> Download PDF
                    </button>
                    <button type="button" className="menu-item" role="menuitem" onClick={run(copyText)}>
                        <Copy /> Copy text
                    </button>
                </div>
            )}
        </div>
    );
}
