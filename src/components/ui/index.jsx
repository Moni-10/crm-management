import { Loader } from 'lucide-react';
import { avatarTone, getInitials, statusTone } from '../../utils/helpers';

export { default as Modal } from './Modal';
export { default as SearchSelect } from './SearchSelect';
export { default as Toaster } from './Toaster';
export { ConfirmProvider, useConfirm } from './ConfirmProvider';

// Label + control + hint/error, wired for accessibility.
export function Field({ label, required, hint, error, className = '', children, htmlFor }) {
    return (
        <div className={`field ${className}`}>
            {label && (
                <label htmlFor={htmlFor}>
                    {label}{required && <span className="req" aria-hidden="true">*</span>}
                </label>
            )}
            {children}
            {hint && !error && <span className="hint">{hint}</span>}
            {error && <span className="error" role="alert">{error}</span>}
        </div>
    );
}

export function PageHeader({ title, subtitle, children }) {
    return (
        <div className="page-header">
            <div>
                <h1>{title}</h1>
                {subtitle && <p className="page-sub">{subtitle}</p>}
            </div>
            {children && <div className="page-actions">{children}</div>}
        </div>
    );
}

export function Badge({ tone, children, plain }) {
    return <span className={`badge ${tone || statusTone(children)} ${plain ? 'plain' : ''}`}>{children}</span>;
}

export function Avatar({ name, size = '', tone, src }) {
    if (src) return <img className={`avatar ${size}`} src={src} alt="" style={{ objectFit: 'cover' }} />;
    return <span className={`avatar ${size} ${tone || avatarTone(name)}`} aria-hidden="true">{getInitials(name)}</span>;
}

export function EmptyState({ icon: Icon, title, children, action }) {
    return (
        <div className="empty">
            {Icon && <Icon aria-hidden="true" />}
            <h3>{title}</h3>
            {children && <p>{children}</p>}
            {action}
        </div>
    );
}

export function Loading({ label = 'Loading...' }) {
    return (
        <div className="loading-state" role="status">
            <Loader className="spinner-icon" size={20} style={{ animation: 'spin 0.9s linear infinite' }} aria-hidden="true" />
            <span>{label}</span>
        </div>
    );
}

export function ErrorState({ message, onRetry }) {
    return (
        <div className="alert error" role="alert">
            <span style={{ flex: 1 }}>{message}</span>
            {onRetry && <button type="button" className="btn btn-sm" onClick={onRetry}>Try again</button>}
        </div>
    );
}
