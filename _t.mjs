import express from 'express';
import crud from './server/routes/crud.js';
import oldExcel from './server/routes/old-excel.js';
import { pool } from './server/db/pool.js';

const cities = ['Delhi', 'Mumbai', 'Pune', 'Surat', 'Jaipur', 'Kanpur', 'Noida', 'Indore', 'Nagpur', 'Agra'];
const machines = ['paper bag making machine', 'flexo printing machine', 'tissue paper machine', 'slitting rewinder', 'foil printing', 'lamination machine'];
const statuses = ['New', 'Contacted', 'Follow-up', 'Interested', 'Won', 'Lost'];
const outcomes = ['Follow-up', 'Interested', 'Call back', 'Quotation sent', 'No answer', 'Not interested', 'Won', 'Lost'];
const now = new Date();
const N = 600000;
let s0 = Date.now();
for (let b = 0; b < N / 5000; b++) {
    const L = []; const F = [];
    for (let i = 0; i < 5000; i++) {
        const n = b * 5000 + i;
        L.push([`id_l${n}`, `Company ${n} Packaging`, `Person ${n % 977}`, String(9000000000 + n), `lead${n}@mail.com`, machines[n % 6], cities[n % 10], 'India', 'Manual', statuses[n % 6], null, null, `note ${n % 50}`, now, now]);
        F.push([`id_f${n}`, `Party ${n} Industries`, `Person ${n % 500}`, String(8000000000 + n), machines[n % 6], cities[n % 10], `2026-0${(n % 9) + 1}-1${n % 9}`, ['Pooja', 'Aman', 'Neha'][n % 3], outcomes[n % 8], `remark ${n % 70}`, now, now]);
    }
    await pool.query('INSERT INTO crm_leads (id, company_name, contact_person, mobile, email, machine_interest, city, state, source, status, follow_up_date, assigned_salesperson, notes, created_at, updated_at) VALUES ?', [L]);
    await pool.query('INSERT INTO followup_log (id, party_name, contact_person, mobile, machine, location, followup_date, taken_by, outcome, notes, created_at, updated_at) VALUES ?', [F]);
}
console.log(`seeded ${N} leads + ${N} follow-ups in ${((Date.now() - s0) / 1000).toFixed(0)}s`);

const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { role: 'admin', name: 'T' }; next(); });
app.use('/api/old-excel', oldExcel);
app.use('/api', crud);
app.use((e, req, res, next) => res.status(e.status || 500).json({ error: e.message }));
const server = app.listen(3059);
const get = async (path) => (await fetch(`http://localhost:3059/api${path}`)).json();
const post = async (path, body, method = 'POST') => (await fetch(`http://localhost:3059/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const timed = async (label, fn) => { const s = Date.now(); const r = await fn(); console.log(label.padEnd(46), `${String(Date.now() - s).padStart(5)}ms`, r ?? ''); };

for (const [name, path, noKey] of [['LEADS', 'leads', 'leadNo'], ['FOLLOW-UPS', 'followuplog', 'followUpNo']]) {
    console.log(`\n== ${name} (${N} rows)`);
    await timed('page 1 (newest on top)', async () => { const r = await get(`/${path}/query?pageSize=50`); return `total ${r.total}, top no. ${r.items[0][noKey]}, 50th no. ${r.items[49][noKey]}`; });
    await timed('page 222', async () => { const r = await get(`/${path}/query?pageSize=50&page=222`); return `top no. ${r.items[0][noKey]} (expect ${N - 221 * 50})`; });
    await timed('page 11000 (deep)', async () => { const r = await get(`/${path}/query?pageSize=50&page=11000`); return `top no. ${r.items[0][noKey]} (expect ${N - 10999 * 50})`; });
    await timed('last page (12000)', async () => { const r = await get(`/${path}/query?pageSize=50&page=12000`); return `rows ${r.items.length}, lowest no. ${r.items.at(-1)[noKey]}`; });
    await timed('oldest first page 1', async () => { const r = await get(`/${path}/query?pageSize=50&sort=oldest`); return `top no. ${r.items[0][noKey]}`; });
    for (const target of [2345, 417000, 1, N]) {
        await timed(`jump to no. ${target}`, async () => {
            const loc = await get(`/${path}/locate?number=${target}&pageSize=50&sort=newest`);
            const page = await get(`/${path}/query?pageSize=50&page=${loc.page}`);
            const there = page.items.some((i) => i[noKey] === target);
            return `-> page ${loc.page}, row visible on that page: ${there ? 'YES' : 'NO'}`;
        });
    }
    await timed('jump to no. 999999999 (missing)', async () => JSON.stringify(await get(`/${path}/locate?number=999999999`)));
    const fk = path === 'leads' ? 'status=Won' : 'outcome=Won';
    await timed(`filter ${fk} + jump to a Won no.`, async () => {
        const wonNo = path === 'leads' ? 4 + 6 * 1000 : 6 + 8 * 1000; // a row that is Won
        const loc = await get(`/${path}/locate?number=${wonNo + 1}&${fk}&pageSize=50`);
        const loc2 = await get(`/${path}/locate?number=${wonNo}&${fk}&pageSize=50`);
        return `non-Won no. found=${loc.found}; Won no. found=${loc2.found} page ${loc2.page}`;
    });
    await timed('search "Industries 5999" + page', async () => { const r = await get(`/${path}/query?q=${path === 'leads' ? 'Company%205999' : 'Party%205999'}&pageSize=50`); return `${r.total} matches`; });
    await timed('search phone', async () => { const r = await get(`/${path}/query?q=${path === 'leads' ? '9000123456' : '8000123456'}`); return `${r.total} match`; });
}

// new records go to the top; deleting leaves gaps but jumping stays correct
const created = await post('/leads', { companyName: 'Brand New Lead', status: 'New' });
const top = await get('/leads/query?pageSize=3');
console.log('\nnew lead: no.', created.leadNo, '| top of page 1:', top.items[0].companyName, top.items[0].leadNo);
await fetch(`http://localhost:3059/api/leads/${top.items[1].id}`, { method: 'DELETE' });
const loc = await get(`/leads/locate?number=${top.items[2].leadNo}&pageSize=50`);
console.log('after deleting the one above it, locate still right: page', loc.page, 'position', loc.position, '(expect position 2)');
const fl = await post('/followuplog', { partyName: 'Fresh Follow-up' });
console.log('new follow-up no.', fl.followUpNo, '| top:', (await get('/followuplog/query?pageSize=1')).items[0].partyName);

server.close(); await pool.end();
