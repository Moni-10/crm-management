import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CircleAlert, Eye, EyeOff, LogIn } from 'lucide-react';
import { Field } from '../../components/ui';
import BrandMark from '../../components/layout/BrandMark';
import ThemeToggle from '../../components/layout/ThemeToggle';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';

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
            <section className="login-art" aria-hidden="true">
                <div className="brand">
                    <BrandMark />
                    <div>
                        <div className="brand-name">{company.name}</div>
                        <div className="brand-sub">Sales CRM</div>
                    </div>
                </div>
                <div>
                    <div className="cmyk-strip"><span /><span /><span /><span /></div>
                    <h2>Every party, machine and quote in one place.</h2>
                    <p>Track customers, follow-ups and quotations for paper conversion and printing machines.</p>
                </div>
                <svg className="login-rings" viewBox="0 0 520 520" fill="none" stroke="#fff" strokeOpacity="0.14">
                    <circle cx="260" cy="260" r="250" />
                    <circle cx="260" cy="260" r="190" />
                    <circle cx="260" cy="260" r="130" />
                    <circle cx="260" cy="260" r="70" />
                    <path d="M260 0v520M0 260h520" />
                </svg>
            </section>

            <section className="login-form-wrap">
                <div className="login-card">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                        <ThemeToggle />
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{ width: 60, height: 60, borderRadius: 12, background: 'var(--primary)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'white', fontSize: 28, fontWeight: 700 }}>
                            👤
                        </div>
                        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Login</h1>
                        <p style={{ color: 'var(--text-2)', marginBottom: 0 }}>Access your account to continue</p>
                    </div>

                    <form className="stack" onSubmit={submit} noValidate>
                        {error && (
                            <div className="alert error" role="alert">
                                <CircleAlert aria-hidden="true" />
                                <span>{error}</span>
                            </div>
                        )}
                        <Field label="Email Address" htmlFor="login-email">
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
                        </Field>
                        <Field label="Password" htmlFor="login-password">
                            <div className="input-with-action">
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-2)' }}>
                                <input type="checkbox" style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                                Remember Me
                            </label>
                            <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Forgot Password?</a>
                        </div>
                        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !password} style={{ height: 44, fontSize: 16, fontWeight: 600 }}>
                            <LogIn aria-hidden="true" /> {busy ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div style={{ position: 'relative', margin: '24px 0', textAlign: 'center' }}>
                        <div style={{ borderTop: '1px solid var(--border)' }} />
                        <span style={{ position: 'absolute', left: '50%', top: '-8px', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 12px', color: 'var(--text-3)', fontSize: 13 }}>or</span>
                    </div>

                    <button type="button" style={{ width: '100%', height: 44, border: '1px solid var(--border)', borderRadius: 10, background: 'transparent', color: 'var(--text)', fontSize: 15, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.15s' }} onMouseEnter={(e) => e.target.style.background = 'var(--surface-2)'} onMouseLeave={(e) => e.target.style.background = 'transparent'}>
                        <span style={{ fontSize: 18 }}>🔵</span>
                        Continue with Google
                    </button>

                    <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-3)' }}>
                        Don't have an account? <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Contact Us</a>
                    </div>
                </div>
            </section>
        </div>
    );
}
