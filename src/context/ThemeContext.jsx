import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const readTheme = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

// The initial theme is applied by a small script in index.html (before first paint); this keeps it in sync.
export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(readTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const setTheme = useCallback((next) => {
        setThemeState(next);
        try { localStorage.setItem('theme', next); } catch { /* storage unavailable */ }
    }, []);

    const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

    const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
    return context;
};
