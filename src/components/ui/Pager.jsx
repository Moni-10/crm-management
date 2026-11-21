import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const fmt = (n) => Number(n).toLocaleString('en-IN');

// Page numbers to show: first, last, and a window around the current page, with "…" for the gaps.
function pageWindow(page, count) {
    const wanted = new Set([1, 2, count - 1, count, page - 2, page - 1, page, page + 1, page + 2]);
    const pages = [...wanted].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
    const out = [];
    pages.forEach((p, i) => {
        if (i > 0 && p - pages[i - 1] > 1) out.push('gap');
        out.push(p);
    });
    return out;
}

/**
 * Pager for very long lists.
 *   page, pageSize, total, loading
 *   onPage(n), onPageSize(n)
 *   pageSizes        - choices for "rows per page"
 *   numberLabel      - e.g. "Lead no." Shows a "go to number" box when onJumpNumber is given
 *   onJumpNumber(n)  - async; should switch to the page that holds record number n (and highlight it)
 */
export default function Pager({ page, pageSize, total, loading, onPage, onPageSize, pageSizes = [25, 50, 100, 200], numberLabel, onJumpNumber }) {
    const count = Math.max(1, Math.ceil(total / pageSize));
    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);
    const [pageInput, setPageInput] = useState('');
    const [numberInput, setNumberInput] = useState('');
    const [jumpError, setJumpError] = useState('');

    const goPage = (event) => {
        event.preventDefault();
        const n = Math.min(Math.max(parseInt(pageInput, 10) || 0, 1), count);
        if (pageInput) { onPage(n); setPageInput(''); setJumpError(''); }
    };

    const goNumber = async (event) => {
        event.preventDefault();
        const n = parseInt(numberInput, 10);
        if (!n) return;
        setJumpError('');
        const ok = await onJumpNumber(n);
        if (typeof ok === 'string') setJumpError(ok);
        else if (ok === false) setJumpError(`${numberLabel} ${fmt(n)} was not found with the current search/filters`);
        else setNumberInput('');
    };

    if (total === 0) return null;

    return (
        <div className="pager">
            <div className="pager-row">
                <span className="pager-info">Showing <b>{fmt(first)}–{fmt(last)}</b> of <b>{fmt(total)}</b></span>

                <div className="pager-nav" role="navigation" aria-label="Pages">
                    <button type="button" className="btn" onClick={() => onPage(1)} disabled={page <= 1 || loading} aria-label="First page" title="First page (newest)"><ChevronsLeft size={16} /></button>
                    <button type="button" className="btn" onClick={() => onPage(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page"><ChevronLeft size={16} /></button>
                    {pageWindow(page, count).map((p, i) => (p === 'gap'
                        ? <span key={`g${i}`} className="pager-gap">…</span>
                        : <button key={p} type="button" className={`btn ${p === page ? 'btn-primary' : ''}`} onClick={() => onPage(p)} disabled={loading} aria-current={p === page ? 'page' : undefined}>{fmt(p)}</button>))}
                    <button type="button" className="btn" onClick={() => onPage(page + 1)} disabled={page >= count || loading} aria-label="Next page"><ChevronRight size={16} /></button>
                    <button type="button" className="btn" onClick={() => onPage(count)} disabled={page >= count || loading} aria-label="Last page" title="Last page (oldest)"><ChevronsRight size={16} /></button>
                </div>
            </div>

            <div className="pager-row">
                <form className="pager-jump" onSubmit={goPage}>
                    <label htmlFor="pager-page">Go to page</label>
                    <input id="pager-page" className="input" inputMode="numeric" placeholder={`1–${fmt(count)}`} value={pageInput} onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))} />
                    <button type="submit" className="btn" disabled={!pageInput}>Go</button>
                </form>

                {onJumpNumber && (
                    <form className="pager-jump" onSubmit={goNumber}>
                        <label htmlFor="pager-number">Go to {numberLabel}</label>
                        <input id="pager-number" className="input" inputMode="numeric" placeholder="e.g. 2345" value={numberInput} onChange={(e) => { setNumberInput(e.target.value.replace(/\D/g, '')); setJumpError(''); }} />
                        <button type="submit" className="btn" disabled={!numberInput}>Find</button>
                    </form>
                )}

                <label className="pager-size">Rows per page
                    <select className="input" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
                        {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>
            </div>
            {jumpError && <div className="pager-error" role="alert">{jumpError}</div>}
        </div>
    );
}
