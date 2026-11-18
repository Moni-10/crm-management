import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { setUnauthorizedHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);

// status: 'loading' (checking a saved login) | 'authed' | 'anon'
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState(tokenStore.get() ? 'loading' : 'anon');

    const logout = useCallback(() => {
        tokenStore.clear();
        setUser(null);
        setStatus('anon');
    }, []);

    // Restore a saved login on page load.
    useEffect(() => {
        if (!tokenStore.get()) return undefined;
        let cancelled = false;
        authApi.me()
            .then(({ user: me }) => {
                if (cancelled) return;
                setUser(me);
                setStatus('authed');
            })
            .catch(() => {
                if (cancelled) return;
                tokenStore.clear();
                setStatus('anon');
            });
        return () => { cancelled = true; };
    }, []);

    // Any API call that comes back 401 sends the person to the login screen.
    useEffect(() => {
        setUnauthorizedHandler(logout);
        return () => setUnauthorizedHandler(() => {});
    }, [logout]);

    const login = useCallback(async (email, password) => {
        const { token, user: me } = await authApi.login(email, password);
        tokenStore.set(token);
        setUser(me);
        setStatus('authed');
    }, []);

    const updateName = useCallback(async (name) => {
        const { user: me } = await authApi.updateProfile(name);
        setUser(me);
    }, []);

    const changePassword = useCallback(async (currentPassword, newPassword) => {
        const { token, user: me } = await authApi.changePassword(currentPassword, newPassword);
        tokenStore.set(token); // the old token stops working once the password changes
        setUser(me);
    }, []);

    const value = useMemo(
        () => ({ user, status, login, logout, updateName, changePassword }),
        [user, status, login, logout, updateName, changePassword]
    );
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
    return context;
};
