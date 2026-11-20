import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    BarChart3, Bell, Building2, CalendarDays, Clock, DatabaseBackup, FileText, LayoutDashboard, Mail, MapPin, Menu, Phone, Users, X, ChevronLeft, Settings, ContactRound, UserCog, ShieldCheck, Database
} from 'lucide-react';
import BrandMark from './BrandMark';
import GlobalSearch from './GlobalSearch';
import ProfileMenu from './ProfileMenu';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../../context/AuthContext';

const COMPANY_INFO = {
    name: 'Mohindra Mechanical Works',
    owners: [
        { id: 1, name: 'S. Mohinder Singh', designation: 'Founder', email: 'mohinder@mmw.in', phone: '9810011000', avatar: '👨‍💼' },
        { id: 2, name: 'Azadvinder Singh', designation: 'Co-Founder', email: 'azad@mmw.in', phone: '9810011001', avatar: '👨‍💼' }
    ],
    departments: [
        {
            name: 'Technical',
            icon: '💻',
            employees: [
                { id: 101, name: 'Vedant Tripathi', designation: 'Digital Marketing Expert', email: 'vedant@mmw.in', phone: '9810011010', avatar: '👨‍💻' },
                { id: 102, name: 'Nishu Kashyap', designation: 'Full Stack Developer', email: 'nishu@mmw.in', phone: '9810011011', avatar: '👩‍💻' },
                { id: 103, name: 'Laxmi Singh', designation: 'WordPress Developer', email: 'laxmi@mmw.in', phone: '9810011012', avatar: '👩‍💻' },
                { id: 104, name: 'Bhupender Singh', designation: 'SEO Intern', email: 'bhupender@mmw.in', phone: '9810011013', avatar: '👨‍💻' }
            ]
        },
        {
            name: 'Sales',
            icon: '📈',
            employees: [
                { id: 201, name: 'Jaspal', designation: 'Sales Manager', email: 'jaspal@mmw.in', phone: '9810011020', avatar: '👨‍💼' },
                { id: 202, name: 'Pooja', designation: 'Sales Executive', email: 'pooja@mmw.in', phone: '9810011021', avatar: '👩‍💼' },
                { id: 203, name: 'Aman', designation: 'Sales Executive', email: 'aman@mmw.in', phone: '9810011022', avatar: '👨‍💼' },
                { id: 204, name: 'Neha Khan', designation: 'Sales Executive', email: 'neha.khan@mmw.in', phone: '9810011023', avatar: '👩‍💼' },
                { id: 205, name: 'Neha Mishra', designation: 'Sales Executive', email: 'neha.mishra@mmw.in', phone: '9810011024', avatar: '👩‍💼' },
                { id: 206, name: 'Muskan', designation: 'Sales Executive', email: 'muskan@mmw.in', phone: '9810011025', avatar: '👩‍💼' },
                { id: 207, name: 'Rajwant', designation: 'Sales Executive', email: 'rajwant@mmw.in', phone: '9810011026', avatar: '👨‍💼' },
                { id: 208, name: 'Renu', designation: 'Sales Executive', email: 'renu@mmw.in', phone: '9810011027', avatar: '👩‍💼' },
                { id: 209, name: 'Satish', designation: 'Sales Executive', email: 'satish@mmw.in', phone: '9810011028', avatar: '👨‍💼' },
                { id: 210, name: 'Swati', designation: 'Sales Executive', email: 'swati@mmw.in', phone: '9810011029', avatar: '👩‍💼' },
                { id: 211, name: 'Uma', designation: 'Sales Executive', email: 'uma@mmw.in', phone: '9810011030', avatar: '👩‍💼' }
            ]
        }
    ]
};

const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [
            { to: '/', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/company', perm: 'company.view', label: 'Company Team', icon: Users },
            { to: '/company-profile', perm: 'company.view', label: 'Company Profile', icon: ContactRound }
        ]
    },
    {
        label: 'Customers',
        items: [
            { to: '/parties', perm: 'parties.view', label: 'Parties', icon: Building2 },
            { to: '/salespersons', perm: 'salespersons.view', label: 'Salespersons', icon: Users },
            { to: '/leads', perm: 'leads.view', label: 'Leads', icon: Database },
            { to: '/calling-details', perm: 'calls.view', label: 'Calling Data', icon: Phone }
        ]
    },
    {
        label: 'Sales',
        items: [
            { to: '/quotations', perm: 'quotations.view', label: 'Quotations', icon: FileText },
            { to: '/followups', perm: 'followups.view', label: 'Follow-ups', icon: Clock },
            { to: '/calendar', perm: 'calendar.view', label: 'Calendar', icon: CalendarDays }
        ]
    },
    {
        label: 'Insights',
        items: [
            { to: '/reports', perm: 'reports.view', label: 'Reports', icon: BarChart3 },
            { to: '/backup', perm: 'backup.view', label: 'Backup & restore', icon: DatabaseBackup },
            { to: '/settings', label: 'Settings', icon: Settings }
        ]
    },
    {
        label: 'Access',
        items: [
            { to: '/users', perm: 'users.manage', label: 'Users', icon: UserCog },
            { to: '/roles', perm: 'roles.manage', label: 'Roles & permissions', icon: ShieldCheck }
        ]
    }
];

const isActive = (to, pathname) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

export default function Layout() {
    const { pathname } = useLocation();
    const { user, can } = useAuth();
    const navGroups = NAV_GROUPS
        .map((group) => ({ ...group, items: group.items.filter((item) => !item.perm || can(item.perm)) }))
        .filter((group) => group.items.length > 0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [companyExpanded, setCompanyExpanded] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    // Close the mobile menu after navigating.
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    return (
        <div className="app-shell">
            <aside className={`app-sidebar ${menuOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`} aria-label="Main">
                <div className="brand">
                    <BrandMark />
                    <button type="button" className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                        <X />
                    </button>
                </div>

                <nav className="nav">
                    {navGroups.map((group) => (
                        <div key={group.label} className="nav-group">
                            {!sidebarCollapsed && <div className="nav-label">{group.label}</div>}
                            {group.items.map(({ to, label, icon: Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className={`nav-link ${isActive(to, pathname) ? 'active' : ''}`}
                                    aria-current={isActive(to, pathname) ? 'page' : undefined}
                                    title={sidebarCollapsed ? label : undefined}
                                >
                                    <Icon aria-hidden="true" />
                                    {!sidebarCollapsed && <span>{label}</span>}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                </div>
                <button type="button" className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
                    <ChevronLeft size={18} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                </button>
            </aside>

            {menuOpen && <div className="app-backdrop" onClick={() => setMenuOpen(false)} />}

            <div className="app-body">
                <header className="topbar">
                    <button type="button" className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                        <Menu />
                    </button>
                    <GlobalSearch />
                    <div className="topbar-spacer" />
                    <ThemeToggle />
                    <div className="notification-wrap">
                        <button type="button" className="notification-btn" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Notifications" aria-expanded={notificationsOpen}>
                            <Bell /><span>3</span>
                        </button>
                        {notificationsOpen && <div className="notification-menu">
                            <div className="notification-head"><strong>Notifications</strong><span>3 new</span></div>
                            <div className="notification-item unread"><i /> <div><strong>Follow-up due today</strong><span>3 customer follow-ups need attention.</span></div></div>
                            <div className="notification-item unread"><i /> <div><strong>New quotation created</strong><span>Quotation activity was updated.</span></div></div>
                            <div className="notification-item unread"><i /> <div><strong>Backup reminder</strong><span>It is time to create a fresh backup.</span></div></div>
                        </div>}
                    </div>
                    <ProfileMenu />
                </header>

                <main className="app-main" key={pathname}>
                    <Outlet />
                </main>
                <footer className="app-contact-footer">
                    <div className="app-footer-details">
                        <a href="tel:+919988440777"><Phone />+91 99884 40777</a>
                        <a href="mailto:info@mohindraroto.com"><Mail />info@mohindraroto.com</a>
                        <span><MapPin />New Delhi, India 110018</span>
                    </div>
                    <strong>Mohindra Mechanical Works</strong>
                </footer>
            </div>
        </div>
    );
}
