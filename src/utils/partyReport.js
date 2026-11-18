import { escapeHtml } from './printHtml';
import { formatDate } from './helpers';

const inr = (value) => `Rs. ${(Number(value) || 0).toLocaleString('en-IN')}`;

const row = (label, value) => (value ? `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>` : '');

// A printable A4 summary of one party: details, machines and quotations.
export function buildPartyReportHtml(party, quotations = []) {
    const machines = (party.machines || []).map((m) => `
        <tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.category)}</td><td>${escapeHtml(m.model)}</td>
        <td class="r">${m.quantity}</td><td>${escapeHtml(formatDate(m.purchaseDate))}</td></tr>`).join('');

    const quotes = quotations.map((q) => `
        <tr><td>${escapeHtml(q.quotationNumber)}</td><td>${escapeHtml(formatDate(q.quotationDate))}</td>
        <td>${escapeHtml(q.status)}</td><td class="r">${inr(q.totalAmount)}</td></tr>`).join('');

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${escapeHtml(party.companyName)}</title>
<style>
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11pt; line-height: 1.45; }
h1 { font-size: 20pt; margin: 0 0 2px; }
h2 { font-size: 12pt; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #111; }
.sub { color: #555; margin: 0 0 6px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 6px 8px; text-align: left; vertical-align: top; border-bottom: 1px solid #ddd; }
.details th { width: 32%; font-weight: 600; color: #444; }
.list th { background: #f2f2f2; font-size: 10pt; }
.r { text-align: right; }
.foot { margin-top: 28px; font-size: 9pt; color: #777; }
.head { border-bottom: 3px solid #d6232a; padding-bottom: 8px; margin-bottom: 4px; }
</style></head>
<body>
<div class="head"><h1>${escapeHtml(party.companyName)}</h1><p class="sub">${escapeHtml(party.partyName)} · ${escapeHtml(party.partyType)} · ${escapeHtml(party.partyStatus)}</p></div>

<h2>Contact</h2>
<table class="details">
${row('Primary mobile', party.primaryMobile)}${row('Alternative mobile', party.alternativeMobile)}${row('WhatsApp', party.whatsappNumber)}
${row('Email', party.email)}${row('Salesperson', party.salespersonName)}${row('Follow-up date', formatDate(party.followUpDate))}
</table>

<h2>Address</h2>
<table class="details">
${row('Address', party.fullAddress)}${row('Area', party.area)}${row('City', party.city)}${row('District', party.district)}
${row('State', party.state)}${row('Country', party.country)}${row('Pincode', party.pincode)}${row('Landmark', party.locationName)}
</table>

${machines ? `<h2>Machines</h2><table class="list"><tr><th>Machine</th><th>Category</th><th>Model</th><th class="r">Qty</th><th>Purchased</th></tr>${machines}</table>` : ''}
${quotes ? `<h2>Quotations</h2><table class="list"><tr><th>Number</th><th>Date</th><th>Status</th><th class="r">Amount</th></tr>${quotes}</table>` : ''}
${party.clientRequirements ? `<h2>Client requirements</h2><p>${escapeHtml(party.clientRequirements)}</p>` : ''}
${party.remarks ? `<h2>Remarks</h2><p>${escapeHtml(party.remarks)}</p>` : ''}

<p class="foot">Generated ${escapeHtml(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }))} · Mohindra Mechanical Works</p>
</body></html>`;
}
