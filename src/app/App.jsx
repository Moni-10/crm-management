import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { healthApi } from '../api';
import Layout from '../components/layout/Layout';
import { ConfirmProvider, Loading, Toaster } from '../components/ui';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CompanyProvider } from '../context/CompanyContext';
import { ThemeProvider } from '../context/ThemeContext';
import Backup from '../pages/Backup/Backup';
import Calendar from '../pages/Calendar/Calendar';
import CallingDetails from '../pages/CallingDetails/CallingDetails';
import CompanyTeam from '../pages/Company/CompanyTeam';
import CompanyProfile from '../pages/Company/CompanyProfile';
import Dashboard from '../pages/Dashboard/Dashboard';
import FollowUps from '../pages/FollowUps/FollowUps';
import Leads from '../pages/Leads/Leads';
import Login from '../pages/Login/Login';
import Machines from '../pages/Machines/Machines';
import Parties from '../pages/Parties/Parties';
import PartyDetail from '../pages/PartyDetail/PartyDetail';
import Quotations from '../pages/Quotations/Quotations';
import Reports from '../pages/Reports/Reports';
import Salespersons from '../pages/Salespersons/Salespersons';
import SalespersonDetail from '../pages/Salespersons/SalespersonDetail';
import Search from '../pages/Search/Search';
import Roles from '../pages/Roles/Roles';
import Settings from '../pages/Settings/Settings';
import Users from '../pages/Users/Users';

const centered = {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    gap: '12px', minHeight: '100vh', textAlign: 'center', padding: '20px'
};

// Waits for the backend (and its MySQL connection) before rendering the app.
function useBackendStatus() {
    const [status, setStatus] = useState('connecting');

    const connect = useCallback(() => {
        setStatus('connecting');
        healthApi.check().then(() => setStatus('ready')).catch(() => setStatus('failed'));
    }, []);

    useEffect(connect, [connect]);

    return { status, retry: connect };
}

// Everything inside requires a login; otherwise go to /login and come back afterwards.
function RequireAuth() {
    const { status } = useAuth();
    const location = useLocation();

    if (status === 'loading') return <div style={centered}><Loading label="Checking your login..." /></div>;
    if (status !== 'authed') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    return <Outlet />;
}

// Shows the page only when the role allows it (the server enforces the same rule on the data).
function Guard({ perm, children }) {
    const { can } = useAuth();
    if (can(perm)) return children;
    return (
        <div style={{ ...centered, minHeight: '50vh' }}>
            <h2>No access</h2>
            <p style={{ maxWidth: 420 }}>Your role does not include this page. Ask an admin to grant you access.</p>
        </div>
    );
}

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<RequireAuth />}>
                    <Route element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="dashboard" element={<Navigate to="/" replace />} />
                        <Route path="company" element={<Guard perm="company.view"><CompanyTeam /></Guard>} />
                        <Route path="company-profile" element={<Guard perm="company.view"><CompanyProfile /></Guard>} />
                        <Route path="search" element={<Search />} />
                        <Route path="salespersons" element={<Guard perm="salespersons.view"><Salespersons /></Guard>} />
                        <Route path="salespersons/:id" element={<Guard perm="salespersons.view"><SalespersonDetail /></Guard>} />
                        <Route path="parties" element={<Guard perm="parties.view"><Parties /></Guard>} />
                        <Route path="parties/:id" element={<Guard perm="parties.view"><PartyDetail /></Guard>} />
                        <Route path="quotations" element={<Guard perm="quotations.view"><Quotations /></Guard>} />
                        <Route path="machines" element={<Guard perm="machines.view"><Machines /></Guard>} />
                        <Route path="calling-details" element={<Guard perm="calls.view"><CallingDetails /></Guard>} />
                        <Route path="leads" element={<Guard perm="leads.view"><Leads /></Guard>} />
                        <Route path="calendar" element={<Guard perm="calendar.view"><Calendar /></Guard>} />
                        <Route path="followups" element={<Guard perm="followups.view"><FollowUps /></Guard>} />
                        <Route path="reports" element={<Guard perm="reports.view"><Reports /></Guard>} />
                        <Route path="backup" element={<Guard perm="backup.view"><Backup /></Guard>} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="users" element={<Guard perm="users.manage"><Users /></Guard>} />
                        <Route path="roles" element={<Guard perm="roles.manage"><Roles /></Guard>} />
                    </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default function App() {
    const { status, retry } = useBackendStatus();

    let content;
    if (status === 'connecting') {
        content = <div style={centered}><Loading label="Connecting to the CRM server..." /></div>;
    } else if (status === 'failed') {
        content = (
            <div style={centered}>
                <h2>Cannot reach the CRM server</h2>
                <p style={{ maxWidth: 420 }}>
                    Make sure MySQL (WAMP) is running, then start the app with <code>npm run dev</code>.
                </p>
                <button className="btn btn-primary" onClick={retry}>Try again</button>
            </div>
        );
    } else {
        content = <AuthProvider><AppRoutes /></AuthProvider>;
    }

    return (
        <ThemeProvider>
            <ConfirmProvider>
                {status === 'ready' ? <CompanyProvider>{content}</CompanyProvider> : content}
                <Toaster />
            </ConfirmProvider>
        </ThemeProvider>
    );
}
