import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';

// Avatar button in the top right: account details, Settings (profile, password) and Log out.
export default function ProfileMenu() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        const onKeyDown = (event) => event.key === 'Escape' && setOpen(false);
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (!user) return null;

    const handleLogout = () => {
        setOpen(false);
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="menu-wrap" ref={ref}>
            <button
                type="button"
                className="profile-btn"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Account menu"
            >
                <span className="avatar" aria-hidden="true">{getInitials(user.name)}</span>
                <span className="profile-name truncate">{user.name}</span>
                <ChevronDown aria-hidden="true" />
            </button>

            {open && (
                <div className="menu profile-menu" role="menu">
                    <div className="profile-head">
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                    </div>
                    <div className="menu-list">
                        <Link to="/settings" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
                            <Settings aria-hidden="true" /> Settings
                        </Link>
                        <Link to="/settings?tab=security" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
                            <KeyRound aria-hidden="true" /> Change password
                        </Link>
                        <div className="menu-sep" />
                        <button type="button" className="menu-item danger" role="menuitem" onClick={handleLogout}>
                            <LogOut aria-hidden="true" /> Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
