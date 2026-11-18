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
import Dashboard from '../pages/Dashboard/Dashboard';
import FollowUps from '../pages/FollowUps/FollowUps';
import Login from '../pages/Login/Login';
import Machines from '../pages/Machines/Machines';
import Parties from '../pages/Parties/Parties';
import PartyDetail from '../pages/PartyDetail/PartyDetail';
import Quotations from '../pages/Quotations/Quotations';
import Reports from '../pages/Reports/Reports';
import Salespersons from '../pages/Salespersons/Salespersons';
import SalespersonDetail from '../pages/Salespersons/SalespersonDetail';
import Search from '../pages/Search/Search';
import Settings from '../pages/Settings/Settings';

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

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<RequireAuth />}>
                    <Route element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="dashboard" element={<Navigate to="/" replace />} />
                        <Route path="search" element={<Search />} />
                        <Route path="salespersons" element={<Salespersons />} />
                        <Route path="salespersons/:id" element={<SalespersonDetail />} />
                        <Route path="parties" element={<Parties />} />
                        <Route path="parties/:id" element={<PartyDetail />} />
                        <Route path="quotations" element={<Quotations />} />
                        <Route path="machines" element={<Machines />} />
                        <Route path="calling-details" element={<CallingDetails />} />
                        <Route path="calendar" element={<Calendar />} />
                        <Route path="followups" element={<FollowUps />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="backup" element={<Backup />} />
                        <Route path="settings" element={<Settings />} />
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
