import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Info } from 'lucide-react';
import { TOAST_EVENT } from '../../utils/helpers';

const ICONS = { success: CheckCircle2, error: CircleAlert, info: Info };
const VISIBLE_MS = 3200;

// Mount once near the root. Shows messages sent with showToast().
export default function Toaster() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const onToast = (event) => {
            const id = `${Date.now()}-${Math.random()}`;
            setToasts((current) => [...current.slice(-3), { id, ...event.detail }]);
            setTimeout(() => setToasts((current) => current.map((t) => (t.id === id ? { ...t, leaving: true } : t))), VISIBLE_MS);
            setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), VISIBLE_MS + 300);
        };
        window.addEventListener(TOAST_EVENT, onToast);
        return () => window.removeEventListener(TOAST_EVENT, onToast);
    }, []);

    return (
        <div className="toast-stack" role="status" aria-live="polite">
            {toasts.map((toast) => {
                const Icon = ICONS[toast.type] || Info;
                return (
                    <div key={toast.id} className={`toast ${toast.type} ${toast.leaving ? 'leaving' : ''}`}>
                        <Icon size={18} aria-hidden="true" />
                        <span>{toast.message}</span>
                    </div>
                );
            })}
        </div>
    );
}
