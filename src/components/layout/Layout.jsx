import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    BarChart3, Building2, CalendarDays, Clock, Cog, DatabaseBackup, FileText, LayoutDashboard, Menu, Phone, Users, X
} from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import BrandMark from './BrandMark';
import GlobalSearch from './GlobalSearch';
import ProfileMenu from './ProfileMenu';
import ThemeToggle from './ThemeToggle';

const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }]
    },
    {
        label: 'Customers',
        items: [
            { to: '/parties', label: 'Parties', icon: Building2 },
            { to: '/salespersons', label: 'Salespersons', icon: Users },
            { to: '/machines', label: 'Machines', icon: Cog },
            { to: '/calling-details', label: 'Calling Details', icon: Phone }
        ]
    },
    {
        label: 'Sales',
        items: [
            { to: '/quotations', label: 'Quotations', icon: FileText },
            { to: '/followups', label: 'Follow-ups', icon: Clock },
            { to: '/calendar', label: 'Calendar', icon: CalendarDays }
        ]
    },
    {
        label: 'Insights',
        items: [
            { to: '/reports', label: 'Reports', icon: BarChart3 },
            { to: '/backup', label: 'Backup & restore', icon: DatabaseBackup }
        ]
    }
];

const isActive = (to, pathname) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

export default function Layout() {
    const { pathname } = useLocation();
    const { company } = useCompany();
    const [menuOpen, setMenuOpen] = useState(false);

    // Close the mobile menu after navigating.
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    return (
        <div className="app-shell">
            <aside className={`app-sidebar ${menuOpen ? 'open' : ''}`} aria-label="Main">
                <div className="brand">
                    <BrandMark />
                    <div style={{ minWidth: 0 }}>
                        <div className="brand-name">{company.name}</div>
                        <div className="brand-sub">Sales CRM</div>
                    </div>
                    <button type="button" className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                        <X />
                    </button>
                </div>

                <nav className="nav">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.label} className="nav-group">
                            <div className="nav-label">{group.label}</div>
                            {group.items.map(({ to, label, icon: Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className={`nav-link ${isActive(to, pathname) ? 'active' : ''}`}
                                    aria-current={isActive(to, pathname) ? 'page' : undefined}
                                >
                                    <Icon aria-hidden="true" />
                                    <span>{label}</span>
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-foot">
                    <div className="cmyk-strip" aria-hidden="true"><span /><span /><span /><span /></div>
                    <p>{company.tagline.split(/\r?\n/).filter(Boolean).slice(-1)[0] || 'Sales CRM'}</p>
                </div>
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
                    <ProfileMenu />
                </header>

                <main className="app-main" key={pathname}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
