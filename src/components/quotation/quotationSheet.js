import { DEFAULT_COMPANY } from '../../config/company';

// Builds the A4 quotation sheet as a standalone HTML document.
//
// The sheet has two layers:
//   .lh  - the pre-printed letterhead (company header, boxes, table frame, footer)
//   .dt  - the data we fill in (customer, ref/date, items, totals)
// On screen both are visible so the preview looks like the real paper. When printing on
// pre-printed paper the .lh layer is hidden (body.data-only), so only the data is printed
// and lands in the blank spaces of the paper already in the printer.
//
// All positions are millimetres from the top-left corner of the A4 page, measured from the
// MMW quotation paper. The data layer can be nudged with the calibration offsets.

export const DEFAULT_CALIBRATION = { offsetX: 0, offsetY: 0, fontSize: 9.5 };

const CALIBRATION_KEY = 'quotationPrintCalibration';

export function loadCalibration() {
    try {
        const saved = JSON.parse(localStorage.getItem(CALIBRATION_KEY));
        return { ...DEFAULT_CALIBRATION, ...saved };
    } catch {
        return { ...DEFAULT_CALIBRATION };
    }
}

export function saveCalibration(calibration) {
    try {
        localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration));
    } catch {
        // storage unavailable (private mode): calibration just won't persist
    }
}

const escapeHtml = (text) =>
    String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

const multiline = (text) => escapeHtml(text).replace(/\r?\n/g, '<br>');

const formatDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
    return match ? `${match[3]}-${match[2]}-${match[1]}` : escapeHtml(value || '');
};

// Splits an amount into the "Rs." and "P." columns of the paper.
const splitAmount = (amount) => {
    const value = Math.round((Number(amount) || 0) * 100);
    return {
        rupees: Math.floor(value / 100).toLocaleString('en-IN'),
        paise: String(value % 100).padStart(2, '0')
    };
};

// Rough line count, used to shrink the text when a quotation has many items.
const estimateLines = (items, data) => {
    const wrap = (text, perLine) => Math.max(1, Math.ceil(String(text || '').length / perLine));
    let lines = 0;
    for (const item of items) {
        lines += 2; // name/model line + qty line
        if (item.specifications) lines += wrap(item.specifications, 62);
        lines += 0.6; // gap
    }
    for (const text of [data.paymentTerms, data.deliveryTerms, data.notes]) {
        if (text) lines += wrap(text, 62) + 0.3;
    }
    return lines;
};

const ITEM_AREA_LINES = 22;

function itemRows(items) {
    return items.map((item, index) => {
        const { rupees, paise } = splitAmount(item.amount);
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.unitPrice) || 0;
        const title = [item.machineName, item.machineModel && `Model: ${item.machineModel}`].filter(Boolean).join(' - ');
        return `
        <div class="row item">
            <div class="c-no">${index + 1}</div>
            <div class="c-part">
                <div class="b">${escapeHtml(title)}</div>
                ${item.specifications ? `<div>${multiline(item.specifications)}</div>` : ''}
                <div>Qty: ${qty} Nos. @ Rs. ${rate.toLocaleString('en-IN')}/- each</div>
            </div>
            <div class="c-rs">${rupees}</div>
            <div class="c-p">${paise}</div>
        </div>`;
    }).join('');
}

function termsRows(data) {
    const lines = [
        data.paymentTerms && `<div><span class="b">Payment:</span> ${multiline(data.paymentTerms)}</div>`,
        data.deliveryTerms && `<div><span class="b">Delivery:</span> ${multiline(data.deliveryTerms)}</div>`,
        data.notes && `<div><span class="b">Note:</span> ${multiline(data.notes)}</div>`
    ].filter(Boolean);
    if (lines.length === 0) return '';
    return `<div class="row terms"><div class="c-no"></div><div class="c-part">${lines.join('')}</div><div></div><div></div></div>`;
}

// Sub total, discount and GST rows appear only when they apply; the TOTAL row always does.
export function quotationTotals(data) {
    const subtotal = (data.machineDetails || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const discount = Math.min(Number(data.discount) || 0, subtotal);
    const taxable = subtotal - discount;
    const gstPercent = Number(data.gstTax) || 0;
    const gst = taxable * gstPercent / 100;
    return { subtotal, discount, taxable, gstPercent, gst, grand: taxable + gst };
}

const totalsRowCount = (t) => 1 + (t.discount > 0 || t.gstPercent > 0 ? 1 : 0) + (t.discount > 0 ? 1 : 0) + (t.gstPercent > 0 ? 1 : 0);

function totalsRows(data) {
    const t = quotationTotals(data);
    const line = (label, amount, cls = '') => {
        const { rupees, paise } = splitAmount(amount);
        return `<div class="row ${cls}"><div></div><div class="c-part r">${label}</div><div class="c-rs">${rupees}</div><div class="c-p">${paise}</div></div>`;
    };
    const rows = [];
    if (t.discount > 0 || t.gstPercent > 0) rows.push(line('Sub Total', t.subtotal));
    if (t.discount > 0) rows.push(line('Less: Discount', t.discount));
    if (t.gstPercent > 0) rows.push(line(`GST @ ${t.gstPercent}%`, t.gst));
    rows.push(line('TOTAL', t.grand, 'total'));
    return rows.join('');
}

const STYLES = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #e9ecf1; }
body { font-family: Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { position: relative; width: 210mm; height: 297mm; overflow: hidden; background: #fff; }
.abs { position: absolute; }
.b { font-weight: 700; }
.r { text-align: right; }

/* ---------- pre-printed letterhead ---------- */
.lh { color: #111; font-size: 8pt; line-height: 1.35; }
.lh .red { color: #d6232a; }
.lh .serif { font-family: 'Times New Roman', Times, serif; }
.lh .title { left: 0; right: 0; top: 30mm; text-align: center; font-size: 25pt; font-weight: 700; letter-spacing: 0.3mm; }
.lh .dots { flex: 1; border-bottom: 1px dotted #000; margin: 0 1mm 1mm; }
.lh .refline { left: 109mm; width: 90mm; display: flex; align-items: flex-end; font-weight: 700; }
.lh .frame { left: 10mm; top: 98mm; width: 190mm; height: 160mm; border: 0.35mm solid #000; }
.lh .vline { top: 98mm; height: 160mm; border-left: 0.35mm solid #000; }
.lh .hline { left: 10mm; top: 108mm; width: 190mm; border-top: 0.35mm solid #000; }

/* ---------- data we print ---------- */
.dt { font-size: var(--fs); line-height: 1.35; transform: translate(var(--ox), var(--oy)); }
.dt .row { display: grid; grid-template-columns: 17mm 124mm 28mm 13mm; }
.dt .c-no { text-align: center; }
.dt .c-part { padding: 0 3mm; }
.dt .c-rs { text-align: right; padding-right: 2mm; }
.dt .c-p { text-align: center; }
.dt .item, .dt .terms { margin-bottom: 1.6mm; }
.dt .terms { font-size: calc(var(--fs) - 1pt); }
.dt .total { font-weight: 700; font-size: calc(var(--fs) + 1pt); }

@media screen {
    .dt { color: #0a2a8a; }
    body { padding: 0; }
    body.preview-print .lh { display: none; }
}
@media print {
    html, body { background: #fff; }
    body.data-only .lh { display: none; }
    .dt { color: #000; }
}
`;

// Letterhead pieces built from the saved company details (Settings > Company).
const idLines = (c) => [c.gstin && `GSTIN: ${escapeHtml(c.gstin)}`, c.iec && `IEC.NO.: ${escapeHtml(c.iec)}`].filter(Boolean).join('<br>');
const titleSize = (name) => (name.length > 26 ? Math.max(14, (25 * 26) / name.length).toFixed(1) : 25);
const taglineHtml = (tagline) => {
    const [first = '', ...rest] = String(tagline || '').split(/\r?\n/).filter(Boolean);
    return [first && `<i>${escapeHtml(first)}</i>`, ...rest.map(escapeHtml)].filter(Boolean).join('<br>');
};
const officeBlock = (c) => [
    'Office Cum Works :',
    ...String(c.address || '').split(/\r?\n/).filter(Boolean).map(escapeHtml),
    c.email && `Email : ${escapeHtml(c.email)}`,
    c.website && `Website : ${escapeHtml(c.website)}`
].filter(Boolean).join('<br>');
// The logo is placed exactly as uploaded (only limited in size to fit the slot); otherwise the short name.
const brandSlot = (c) => c.logo
    ? `<img src="${c.logo}" alt="" style="display:block; margin:0 auto 1mm; max-height:11mm; max-width:50mm; width:auto; height:auto">`
    : `<div class="red b serif" style="font-size:17pt; line-height:1; letter-spacing:-0.2mm">${escapeHtml(c.shortName)}</div>`;

const letterhead = (company) => `
<div class="lh">
    <div class="abs b" style="left:11mm; top:15mm; font-size:7.5pt; line-height:1.5">${idLines(company)}</div>
    <div class="abs" style="left:80mm; width:52mm; top:12mm; text-align:center">
        ${brandSlot(company)}
        <div class="b" style="font-size:12pt; text-decoration:underline; letter-spacing:0.15mm">QUOTATION</div>
    </div>
    <div class="abs b" style="right:8mm; top:12mm; text-align:right; font-size:7.5pt; line-height:1.5">${multiline(company.phones)}</div>

    <div class="abs title red serif" style="font-size:${titleSize(company.name)}pt">${escapeHtml(company.name.toUpperCase())}</div>

    <div class="abs red b" style="left:11mm; top:46mm; font-size:7.5pt; line-height:1.4">${taglineHtml(company.tagline)}</div>
    <div class="abs b" style="left:113mm; top:46.5mm; font-size:7pt; line-height:1.45">${officeBlock(company)}</div>

    <div class="abs" style="left:9mm; top:53mm; width:92mm; height:31mm; border:0.35mm solid #000"></div>

    <div class="abs refline" style="top:77mm"><span>Our Ref</span><span class="dots"></span><span>Dated</span><span class="dots"></span></div>
    <div class="abs refline" style="top:83.5mm"><span>Your Ref</span><span class="dots"></span><span>Dated</span><span class="dots"></span></div>

    <div class="abs" style="left:10mm; top:87.2mm; width:190mm; font-size:7.5pt; line-height:1.2"><b>Dear Sir/s,</b><div style="text-indent:15mm">In compliance with your above referred enquiry, we have pleasure in quoting the following prices which we trust will enable you to favour us with your valued order:</div></div>

    <div class="abs frame"></div>
    <div class="abs hline"></div>
    <div class="abs vline" style="left:27mm"></div>
    <div class="abs vline" style="left:151mm"></div>
    <div class="abs vline" style="left:179mm"></div>
    <div class="abs vline" style="left:192mm"></div>
    <div class="abs b" style="left:10mm; width:17mm; top:101.5mm; text-align:center; font-size:8pt">No.</div>
    <div class="abs b" style="left:27mm; width:124mm; top:101.5mm; text-align:center; font-size:8pt; letter-spacing:0.9mm">PARTICULARS</div>
    <div class="abs b" style="left:151mm; width:41mm; top:98.8mm; text-align:center; font-size:7.5pt">AMOUNT</div>
    <div class="abs b" style="left:152mm; top:103.5mm; font-size:7.5pt">Rs.</div>
    <div class="abs b" style="left:180mm; top:103.5mm; font-size:7.5pt">P.</div>

    <div class="abs" style="left:30mm; width:118mm; top:249mm; font-size:8.5pt; line-height:1.35"><b>NOTE :</b> GST, Loading, Insurance, Packing, Transportation,<br><span style="margin-left:12mm">Installation Charges will be extra.</span></div>

    <div class="abs" style="left:11mm; top:260.5mm; font-size:7.5pt">For Terms &amp; General Conditions of Sales please see overleaf.</div>
    <div class="abs red b serif" style="left:136mm; top:260mm; font-size:10pt"><i>for</i> ${escapeHtml(company.name.toUpperCase())}</div>
    <div class="abs b" style="left:174mm; top:275mm; font-size:8.5pt"><i>Manager / Prop.</i></div>
</div>`;

/**
 * Full HTML document for one quotation.
 *   data        - quotation object (same shape the form/API uses)
 *   calibration - { offsetX, offsetY, fontSize } nudges the data layer for your printer
 *   printOnlyPreview - on screen, hide the letterhead too (shows exactly what will print)
 */
export function buildSheetHtml(data, calibration = DEFAULT_CALIBRATION, { printOnlyPreview = false, company = DEFAULT_COMPANY } = {}) {
    const items = data.machineDetails || [];
    const totalsTop = 244 - totalsRowCount(quotationTotals(data)) * 5.2;
    const fits = ITEM_AREA_LINES / Math.max(estimateLines(items, data), 1);
    const fontSize = Math.max(6.5, Math.min(calibration.fontSize, calibration.fontSize * fits));

    const customerLines = [
        data.companyName && `<div class="b">M/s. ${escapeHtml(data.companyName)}</div>`,
        data.partyName && `<div>Kind Attn: ${escapeHtml(data.partyName)}</div>`,
        data.address && `<div>${multiline(data.address)}</div>`,
        data.mobile && `<div>Mob: ${escapeHtml(data.mobile)}</div>`
    ].filter(Boolean).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Quotation ${escapeHtml(data.quotationNumber || '')}</title>
<style>${STYLES}</style>
</head>
<body class="${printOnlyPreview ? 'preview-print' : ''}">
<div class="sheet">
    ${letterhead(company)}
    <div class="dt" style="--fs:${fontSize}pt; --ox:${calibration.offsetX}mm; --oy:${calibration.offsetY}mm">
        <div class="abs" style="left:11mm; top:55mm; width:88mm; height:28mm; overflow:hidden">${customerLines}</div>
        <div class="abs b" style="left:123mm; top:75.6mm; width:40mm">${escapeHtml(data.quotationNumber || '')}</div>
        <div class="abs b" style="left:175mm; top:75.6mm; width:24mm">${formatDate(data.quotationDate)}</div>

        <div class="abs" style="left:10mm; top:110mm; width:190mm; height:${totalsTop - 112}mm; overflow:hidden">
            ${itemRows(items)}
            ${termsRows(data)}
        </div>
        <div class="abs" style="left:10mm; top:${totalsTop}mm; width:190mm">
            ${totalsRows(data)}
        </div>
    </div>
</div>
</body>
</html>`;
}
