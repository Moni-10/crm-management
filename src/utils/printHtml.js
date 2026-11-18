// Prints a standalone HTML document through a hidden iframe (no pop-up window, so nothing to block).
// In the print dialog the person can also choose "Save as PDF".
export function printHtml(html) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);

    const cleanup = () => setTimeout(() => frame.remove(), 1000);
    frame.onload = () => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        cleanup();
    };
    frame.srcdoc = html;
}

export const escapeHtml = (text) =>
    String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

// A simple printable table report: title, optional subtitle, then headers + rows (arrays of cell text).
export function printTableReport({ title, subtitle = '', headers, rows }) {
    const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    printHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 16mm; }
body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10.5pt; }
h1 { font-size: 18pt; margin: 0 0 2px; }
p { margin: 0 0 14px; color: #555; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ddd; vertical-align: top; }
th { background: #f2f2f2; font-size: 9.5pt; }
.head { border-bottom: 3px solid #d6232a; margin-bottom: 12px; }
</style></head><body>
<div class="head"><h1>${escapeHtml(title)}</h1></div>
<p>${escapeHtml(subtitle)} Generated ${escapeHtml(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }))}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`);
}
