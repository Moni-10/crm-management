import { Building2, CalendarDays, Cog, FileText, Users } from 'lucide-react';

// How each kind of search result is labelled, summarised and linked.
// Shared by the header search dropdown and the full results page.

export const SEARCH_GROUPS = [
    {
        key: 'parties',
        label: 'Parties',
        icon: Building2,
        title: (p) => p.companyName,
        subtitle: (p) => [p.partyName, p.primaryMobile, p.city].filter(Boolean).join(' · '),
        link: (p) => `/parties/${p.id}`
    },
    {
        key: 'salespersons',
        label: 'Salespersons',
        icon: Users,
        title: (s) => s.fullName + (s.nickname ? ` (${s.nickname})` : ''),
        subtitle: (s) => [s.mobile, s.department, s.employeeId].filter(Boolean).join(' · '),
        link: (s) => `/parties?salesperson=${s.id}`
    },
    {
        key: 'machines',
        label: 'Machines',
        icon: Cog,
        title: (m) => m.name,
        subtitle: (m) => [m.model, m.category, m.partyName].filter(Boolean).join(' · '),
        link: (m) => (m.partyId ? `/parties/${m.partyId}` : '/machines')
    },
    {
        key: 'quotations',
        label: 'Quotations',
        icon: FileText,
        title: (q) => q.quotationNumber,
        subtitle: (q) => [q.companyName, q.status, q.totalAmount ? `₹${Number(q.totalAmount).toLocaleString('en-IN')}` : ''].filter(Boolean).join(' · '),
        link: (q) => `/quotations?edit=${q.id}`
    },
    {
        key: 'events',
        label: 'Events',
        icon: CalendarDays,
        title: (e) => e.title,
        subtitle: (e) => [e.date, e.eventType].filter(Boolean).join(' · '),
        link: (e) => `/calendar?date=${e.date}`
    }
];

export const countResults = (results) =>
    SEARCH_GROUPS.reduce((sum, group) => sum + (results?.[group.key]?.length || 0), 0);
