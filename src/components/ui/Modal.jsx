import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Dialog with a title, scrollable body and optional footer.
 *   size   - 'sm' | 'md' | 'lg'
 *   footer - buttons shown in the footer bar
 * Closes with Escape or a click on the backdrop; focus moves into the dialog and returns on close.
 */
export default function Modal({ title, onClose, children, footer, size = 'md', as: Wrapper = 'div', onSubmit }) {
    const titleId = useId();
    const dialogRef = useRef(null);

    useEffect(() => {
        const previous = document.activeElement;
        const dialog = dialogRef.current;
        const firstField = dialog?.querySelector('input:not([readonly]), select, textarea');
        (firstField || dialog)?.focus();

        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
            previous?.focus?.();
        };
    }, [onClose]);

    const content = (
        <>
            <div className="modal-head">
                <h2 id={titleId}>{title}</h2>
                <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                    <X />
                </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
        </>
    );

    return (
        <div
            className="modal-backdrop"
            onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div
                ref={dialogRef}
                className={`modal ${size === 'md' ? '' : size}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                {Wrapper === 'form'
                    ? <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>{content}</form>
                    : content}
            </div>
        </div>
    );
}
