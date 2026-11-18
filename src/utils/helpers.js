// Small shared helpers.

// Toasts: any code can call showToast(); the <Toaster /> component (mounted once) displays it.
export const TOAST_EVENT = 'app:toast';

export const showToast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type } }));
};

export const formatDate = (value) => {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (match) {
        // Parse as a local date so "2026-11-15" never shifts a day because of the time zone.
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount) || 0);

// 12,00,000 -> "₹12 L", 2,60,00,000 -> "₹2.6 Cr": compact amounts for stat tiles.
export const formatCompactCurrency = (amount) => {
    const value = Number(amount) || 0;
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(value >= 1e8 ? 0 : 1).replace(/\.0$/, '')} Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(value >= 1e6 ? 0 : 1).replace(/\.0$/, '')} L`;
    return formatCurrency(value);
};

export const getInitials = (name) =>
    String(name || '?')
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);

// Stable colour per name, so each person keeps the same avatar colour everywhere.
export const avatarTone = (name) => {
    let hash = 0;
    for (const char of String(name || '')) hash = (hash * 31 + char.charCodeAt(0)) % 1000;
    return `c${(hash % 4) + 1}`;
};

export const todayIso = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Status label -> badge tone (see .badge in base.css)
const STATUS_TONES = {
    Active: 'success', Accepted: 'success', Approved: 'success', Purchased: 'success', completed: 'success',
    'Follow-up': 'warning', Sent: 'info', Prospect: 'info', Pending: 'warning', Draft: 'neutral', scheduled: 'info',
    Inactive: 'neutral', Rejected: 'danger', Expired: 'danger'
};
export const statusTone = (status) => STATUS_TONES[status] || 'neutral';

export const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

// Opens WhatsApp for a number; 10-digit Indian numbers get the 91 prefix.
export const whatsappUrl = (mobile, text = '') => {
    const digits = digitsOnly(mobile);
    const number = digits.length === 10 ? `91${digits}` : digits;
    return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
