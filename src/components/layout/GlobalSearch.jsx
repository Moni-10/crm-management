import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { searchApi } from '../../api';
import { countResults, SEARCH_GROUPS } from '../../utils/searchGroups';

const DEBOUNCE_MS = 250;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

// Search box in the top bar: searches salespersons, parties, machines, quotations, calling data and events.
// Press Ctrl+K (Cmd+K on Mac) from anywhere to jump into it.
export default function GlobalSearch() {
    const navigate = useNavigate();
    const boxRef = useRef(null);
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Debounced search; stale responses are ignored.
    useEffect(() => {
        const term = query.trim();
        if (!term) {
            setResults(null);
            setLoading(false);
            return undefined;
        }
        let cancelled = false;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await searchApi.search(term, 5);
                if (!cancelled) setResults(data);
            } catch {
                if (!cancelled) setResults(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query]);

    // Close when clicking outside; Ctrl/Cmd+K focuses the box.
    useEffect(() => {
        const onPointerDown = (event) => {
            if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
        };
        const onKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    const go = (path) => {
        setOpen(false);
        setQuery('');
        setResults(null);
        navigate(path);
    };

    const submit = (event) => {
        event.preventDefault();
        if (query.trim()) go(`/search?q=${encodeURIComponent(query.trim())}`);
    };

    const total = countResults(results);
    const showPanel = open && query.trim() !== '';

    return (
        <div className="gs" ref={boxRef}>
            <form className="gs-field" onSubmit={submit} role="search">
                <Search aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="search"
                    className="gs-input"
                    placeholder="Search everything"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => e.key === 'Escape' && (setOpen(false), e.currentTarget.blur())}
                    aria-label="Search everything"
                />
                <span className="gs-kbd" aria-hidden="true">{isMac ? '⌘K' : 'Ctrl K'}</span>
            </form>

            {showPanel && (
                <div className="gs-panel">
                    {loading && !results && <div className="gs-note">Searching...</div>}
                    {!loading && results && total === 0 && (
                        <div className="gs-note">Nothing found for “{query.trim()}”</div>
                    )}

                    {results && SEARCH_GROUPS.map((group) => {
                        const items = results[group.key] || [];
                        if (items.length === 0) return null;
                        const Icon = group.icon;
                        return (
                            <div key={group.key} className="gs-group">
                                <div className="gs-group-title">{group.label}</div>
                                {items.map((item) => (
                                    <button key={item.id} type="button" className="gs-item" onClick={() => go(group.link(item))}>
                                        <span className="gs-item-icon"><Icon aria-hidden="true" /></span>
                                        <span className="gs-item-text">
                                            <span className="gs-item-title">{group.title(item)}</span>
                                            <span className="gs-item-sub">{group.subtitle(item)}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        );
                    })}

                    {results && total > 0 && (
                        <button type="button" className="gs-all" onClick={submit}>
                            See all results for “{query.trim()}” <ArrowRight size={14} style={{ display: 'inline', verticalAlign: '-2px' }} aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
