import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ChartNoAxesCombined, CircleAlert, Cog, Eye, EyeOff, FileText, Lock, LogIn, Mail, Users } from 'lucide-react';
import { Field } from '../../components/ui';
import logo from '../../assets/logo-small.webp';
import LoginScene from './LoginScene';
import ThemeToggle from '../../components/layout/ThemeToggle';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';

const FEATURES = [
    { icon: Users, label: 'Parties', tone: 'c' },
    { icon: Cog, label: 'Machines', tone: 'm' },
    { icon: FileText, label: 'Quotations', tone: 'y' },
    { icon: ChartNoAxesCombined, label: 'Reports', tone: 'k' },
];

export default function Login() {
    const { status, login } = useAuth();
    const { company } = useCompany();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const destination = location.state?.from || '/';

    if (status === 'authed') return <Navigate to={destination} replace />;

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setBusy(true);
        try {
            await login(email.trim(), password);
            navigate(destination, { replace: true });
        } catch (err) {
            setError(err.message || 'Could not log in');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="login">
            <LoginScene />

            <div className="login-theme"><ThemeToggle /></div>

            <main className="login-main">
                <div className="login-card">
                <aside className="login-side">
                    <div className="login-logo-wrap">
                        <img className="login-logo" src={logo} alt={company.name} />
                    </div>
                    <div className="cmyk-strip"><span /><span /><span /><span /></div>
                    <div className="login-side-name">{company.name}</div>
                    <p className="login-side-tag">
                        Every party, machine &amp; quote <span className="login-grad">in one place.</span>
                    </p>
                    <ul className="login-features">
                        {FEATURES.map(({ icon: Icon, label, tone }) => (
                            <li key={label} className={`tone-${tone}`}>
                                <span className="login-feature-icon"><Icon aria-hidden="true" /></span>
                                {label}
                            </li>
                        ))}
                    </ul>
                </aside>

                <section className="login-body" aria-labelledby="login-title">
                    <span className="login-eyebrow">Welcome back</span>
                    <h1 id="login-title">Data Management</h1>
                    <p className="login-sub">Sign in to manage your CRM data</p>

                    <form className="stack" onSubmit={submit} noValidate>
                        {error && (
                            <div className="alert error" role="alert">
                                <CircleAlert aria-hidden="true" />
                                <span>{error}</span>
                            </div>
                        )}
                        <Field label="Email Address" htmlFor="login-email">
                            <div className="login-input">
                                <Mail className="login-input-icon" aria-hidden="true" />
                                <input
                                    id="login-email"
                                    className="input"
                                    type="email"
                                    autoComplete="username"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                    required
                                    placeholder="your@email.com"
                                />
                            </div>
                        </Field>
                        <Field label="Password" htmlFor="login-password">
                            <div className="login-input input-with-action">
                                <Lock className="login-input-icon" aria-hidden="true" />
                                <input
                                    id="login-password"
                                    className="input"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    className="icon-btn sm"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </button>
                            </div>
                        </Field>
                        <div className="login-row">
                            <label className="login-check">
                                <input type="checkbox" />
                                Remember Me
                            </label>
                            <a href="#" className="login-link">Forgot Password?</a>
                        </div>
                        <button type="submit" className="login-submit" disabled={busy || !email || !password}>
                            <LogIn aria-hidden="true" /> {busy ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div className="login-or"><span>or</span></div>

                    <button type="button" className="login-google">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
                            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                            <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
                            <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
                        </svg>
                        Continue with Google
                    </button>

                    <p className="login-foot">
                        Don't have an account? <a href="#" className="login-link">Contact Us</a>
                    </p>
                </section>
                </div>
            </main>
        </div>
    );
}
