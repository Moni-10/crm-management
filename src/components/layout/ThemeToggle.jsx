import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// Light/dark switch in the top bar. The choice is remembered on this device.
export default function ThemeToggle() {
    const { theme, toggle } = useTheme();
    const toDark = theme === 'light';
    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={toDark ? 'Switch to dark theme' : 'Switch to light theme'}
            title={toDark ? 'Dark theme' : 'Light theme'}
        >
            {toDark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
        </button>
    );
}
