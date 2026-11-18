import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';

const POPOVER_MAX_H = 320;
const SEARCH_FROM = 6; // lists shorter than this skip the search box

/**
 * Dropdown with a search box, for long lists (parties, salespersons, cities...).
 *   value        - selected value ('' = nothing)
 *   onChange     - (value) => void
 *   options      - [{ value, label, sub? }]   `sub` is a smaller second line used for searching too
 *   emptyLabel   - when set, adds a first option with value '' (e.g. "All cities", "In stock (no party)")
 *   placeholder  - shown when nothing is selected and there is no emptyLabel
 * Keyboard: type to filter, Up/Down to move, Enter to choose, Esc to close.
 */
export default function SearchSelect({
    id, value, onChange, options, emptyLabel, placeholder = 'Select', searchPlaceholder = 'Search...',
    className = '', disabled = false, 'aria-label': ariaLabel
}) {
    const listId = useId();
    const triggerRef = useRef(null);
    const popRef = useRef(null);
    const searchRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [pos, setPos] = useState(null);

    const items = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const matches = options.filter((o) => {
            const haystack = `${o.label} ${o.sub || ''}`.toLowerCase();
            return words.every((w) => haystack.includes(w));
        });
        const empty = emptyLabel !== undefined && words.length === 0 ? [{ value: '', label: emptyLabel, isEmpty: true }] : [];
        return [...empty, ...matches];
    }, [options, query, emptyLabel]);

    const selected = options.find((o) => o.value === value);
    const triggerText = selected ? selected.label : (value === '' && emptyLabel !== undefined ? emptyLabel : placeholder);
    const showSearch = options.length >= SEARCH_FROM;

    const place = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const width = Math.max(rect.width, 240);
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const below = window.innerHeight - rect.bottom;
        const openUp = below < 220 && rect.top > below;
        setPos(openUp
            ? { left, width, bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(POPOVER_MAX_H, rect.top - 16) }
            : { left, width, top: rect.bottom + 4, maxHeight: Math.min(POPOVER_MAX_H, below - 16) });
    };

    useLayoutEffect(() => {
        if (open) place();
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (!popRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setOpen(false);
        };
        const reposition = () => place();
        document.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [open]);

    // The popover only exists once it has a position, so focus it at that moment (not when 'open' flips).
    const ready = open && pos !== null;
    useEffect(() => {
        if (!ready) return;
        setActive(Math.max(0, items.findIndex((o) => o.value === value)));
        (showSearch ? searchRef.current : popRef.current)?.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready]);

    useEffect(() => {
        if (!open) setPos(null);
    }, [open]);

    useEffect(() => { setActive(0); }, [query]);

    // keep the highlighted option in view
    useEffect(() => {
        popRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [active, open]);

    const close = (refocus = true) => {
        setOpen(false);
        setQuery('');
        if (refocus) triggerRef.current?.focus();
    };

    const choose = (option) => {
        if (!option) return;
        onChange(option.value);
        close();
    };

    const onKeyDown = (event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
        else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
        else if (event.key === 'End') { event.preventDefault(); setActive(items.length - 1); }
        else if (event.key === 'Enter') { event.preventDefault(); choose(items[active]); }
        else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } // do not also close a dialog behind it
        else if (event.key === 'Tab') close(false);
    };

    const onTriggerKeyDown = (event) => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); }
    };

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-label={ariaLabel}
                disabled={disabled}
                className={`select combo-trigger ${selected || (value === '' && emptyLabel !== undefined) ? '' : 'is-placeholder'} ${className}`}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={onTriggerKeyDown}
            >
                <span className="truncate">{triggerText}</span>
            </button>

            {open && pos && (
                <div ref={popRef} className="combo-pop" style={pos} tabIndex={-1} onKeyDown={onKeyDown}>
                    {showSearch && (
                        <div className="combo-search">
                            <Search aria-hidden="true" />
                            <input
                                ref={searchRef}
                                className="input"
                                placeholder={searchPlaceholder}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                aria-label="Search the list"
                                aria-controls={listId}
                                autoComplete="off"
                            />
                        </div>
                    )}
                    <ul id={listId} role="listbox" className="combo-list">
                        {items.length === 0 && <li className="combo-none">Nothing matches “{query}”</li>}
                        {items.map((option, index) => (
                            <li
                                key={`${option.value}-${index}`}
                                role="option"
                                aria-selected={option.value === value}
                                data-active={index === active}
                                className={`combo-option ${index === active ? 'active' : ''} ${option.isEmpty ? 'is-empty' : ''}`}
                                onMouseEnter={() => setActive(index)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => choose(option)}
                            >
                                <span style={{ minWidth: 0 }}>
                                    <span className="combo-label">{option.label}</span>
                                    {option.sub && <span className="combo-sub">{option.sub}</span>}
                                </span>
                                {option.value === value && <Check aria-hidden="true" />}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}
