// Sample data. From the command line: npm run seed  (add -- --force to wipe and reseed).
// Also used by Settings > Data in the app.
import { pathToFileURL } from 'node:url';
import { migrate } from './migrate.js';
import { logActivity } from '../lib/activity.js';
import { pool } from './pool.js';
import { resources } from '../resources/index.js';

const { salespersons, parties, machines, quotations, events } = resources;

const SALESPEOPLE = [
    ['Jaspal', 'Jaspal', '9810011020', 'jaspal@mmw.in', 'Sales', 'EMP201'],
    ['Pooja', 'Pooja', '9810011021', 'pooja@mmw.in', 'Sales', 'EMP202'],
    ['Aman', 'Aman', '9810011022', 'aman@mmw.in', 'Sales', 'EMP203'],
    ['Neha Khan', 'Neha', '9810011023', 'neha.khan@mmw.in', 'Sales', 'EMP204'],
    ['Neha Mishra', 'Neha', '9810011024', 'neha.mishra@mmw.in', 'Sales', 'EMP205'],
    ['Muskan', 'Muskan', '9810011025', 'muskan@mmw.in', 'Sales', 'EMP206'],
    ['Rajwant', 'Rajwant', '9810011026', 'rajwant@mmw.in', 'Sales', 'EMP207'],
    ['Renu', 'Renu', '9810011027', 'renu@mmw.in', 'Sales', 'EMP208'],
    ['Satish', 'Satish', '9810011028', 'satish@mmw.in', 'Sales', 'EMP209'],
    ['Swati', 'Swati', '9810011029', 'swati@mmw.in', 'Sales', 'EMP210'],
    ['Uma', 'Uma', '9810011030', 'uma@mmw.in', 'Sales', 'EMP211']
];

// [company, contact, mobile, city, state, pincode, area, type, status, salesperson index]
const PARTIES = [
    ['Shree Packaging Pvt Ltd', 'Sunil Gupta', '9811122233', 'Ghaziabad', 'Uttar Pradesh', '201009', 'Sahibabad Industrial Area', 'Customer', 'Active', 0],
    ['Balaji Flexi Films', 'Mahesh Agarwal', '9811122234', 'Noida', 'Uttar Pradesh', '201305', 'Sector 63', 'Customer', 'Active', 0],
    ['Om Polymers', 'Deepak Jain', '9811122235', 'Faridabad', 'Haryana', '121003', 'NIT Industrial Area', 'Customer', 'Active', 0],
    ['Gupta Roto Print', 'Anil Gupta', '9811122236', 'Delhi', 'Delhi', '110041', 'Mundka', 'Customer', 'Active', 1],
    ['Jai Mata Di Packers', 'Rakesh Kumar', '9811122237', 'Delhi', 'Delhi', '110095', 'Jhilmil', 'Prospect', 'Follow-up', 1],
    ['Kailash Industries', 'Pramod Sharma', '9811122238', 'Sonipat', 'Haryana', '131001', 'HSIIDC Rai', 'Customer', 'Active', 1],
    ['National Laminators', 'Faisal Khan', '9811122239', 'Moradabad', 'Uttar Pradesh', '244001', 'Civil Lines', 'Dealer', 'Active', 2],
    ['Sai Flexo Pack', 'Nitin Patil', '9811122240', 'Pune', 'Maharashtra', '411019', 'Pimpri MIDC', 'Customer', 'Active', 2],
    ['Arihant Printers', 'Mukesh Shah', '9811122241', 'Ahmedabad', 'Gujarat', '382445', 'Vatva GIDC', 'Customer', 'Active', 2],
    ['Raj Enterprises', 'Rajesh Mehta', '9811122242', 'Surat', 'Gujarat', '395006', 'Sachin GIDC', 'Prospect', 'Follow-up', 2],
    ['Vardhman Converters', 'Ashok Singhal', '9811122243', 'Ludhiana', 'Punjab', '141003', 'Focal Point', 'Customer', 'Active', 3],
    ['Punjab Packaging Co', 'Harpreet Singh', '9811122244', 'Jalandhar', 'Punjab', '144004', 'Industrial Estate', 'Customer', 'Inactive', 3],
    ['Dubai Pack Trading LLC', 'Mohammed Ali', '971501234567', 'Dubai', 'UAE', '', 'Al Quoz', 'Distributor', 'Active', 3],
    ['Lanka Flexo Pvt Ltd', 'Nuwan Perera', '94771234567', 'Colombo', 'Sri Lanka', '', 'Ratmalana', 'Prospect', 'Follow-up', 3],
    ['Ganesh Poly Pack', 'Santosh Pawar', '9811122245', 'Nashik', 'Maharashtra', '422010', 'Ambad MIDC', 'Customer', 'Active', 4],
    ['Hindustan Labels', 'Ravi Nair', '9811122246', 'Bengaluru', 'Karnataka', '560058', 'Peenya', 'Customer', 'Active', 4],
    ['Southern Rotoprint', 'Murugan S', '9811122247', 'Chennai', 'Tamil Nadu', '600058', 'Ambattur', 'Customer', 'Active', 4],
    ['Eastern Flexi Works', 'Subrata Das', '9811122248', 'Kolkata', 'West Bengal', '700091', 'Salt Lake', 'Prospect', 'Active', 5],
    ['Bharat Cartons', 'Vinod Tiwari', '9811122249', 'Kanpur', 'Uttar Pradesh', '208022', 'Panki', 'Customer', 'Active', 5],
    ['Modern Paper Conversion', 'Sandeep Bansal', '9811122250', 'Bareilly', 'Uttar Pradesh', '243006', 'Rampur Road', 'Customer', 'Active', 5],
    ['Star Wrap Industries', 'Imran Qureshi', '9811122251', 'Indore', 'Madhya Pradesh', '452015', 'Pithampur', 'Prospect', 'Follow-up', 5],
    ['Krishna Rotogravure', 'Dinesh Yadav', '9811122252', 'Jaipur', 'Rajasthan', '302022', 'Sitapura', 'Customer', 'Active', 0],
    ['Tirupati Pack Solutions', 'Venkat Reddy', '9811122253', 'Hyderabad', 'Telangana', '500055', 'Jeedimetla', 'Customer', 'Active', 4],
    ['Alpha Print & Pack', 'Gaurav Kapoor', '9811122254', 'Gurugram', 'Haryana', '122001', 'Manesar', 'Customer', 'Active', 1]
];

// [name, category, model, party index (or null = in stock), quantity, purchase date]
const MACHINES = [
    ['Rotogravure Printing Machine', 'Printing', 'RG-8C', 0, 1, '2024-03-12'],
    ['Slitter Rewinder', 'Converting', 'SR-1000', 0, 1, '2024-03-12'],
    ['Flexo Printing Machine', 'Printing', 'FX-6C', 1, 1, '2023-11-05'],
    ['Lamination Machine', 'Converting', 'LM-1100', 2, 1, '2022-08-20'],
    ['Rotogravure Printing Machine', 'Printing', 'RG-10C', 3, 1, '2025-01-18'],
    ['Pouch Making Machine', 'Converting', 'PM-400', 5, 2, '2024-07-02'],
    ['Solventless Laminator', 'Converting', 'SL-1300', 6, 1, '2025-04-09'],
    ['Flexo Printing Machine', 'Printing', 'FX-8C', 7, 1, '2024-10-27'],
    ['Slitter Rewinder', 'Converting', 'SR-1300', 8, 1, '2023-05-14'],
    ['Extrusion Coating Plant', 'Coating', 'EC-1200', 10, 1, '2022-12-01'],
    ['Rotogravure Printing Machine', 'Printing', 'RG-8C', 12, 2, '2025-06-30'],
    ['Pouch Making Machine', 'Converting', 'PM-600', 14, 1, '2024-02-22'],
    ['Flexo Printing Machine', 'Printing', 'FX-4C', 15, 1, '2023-09-09'],
    ['Lamination Machine', 'Converting', 'LM-900', 16, 1, '2024-12-12'],
    ['Slitter Rewinder', 'Converting', 'SR-1000', 17, 1, '2025-02-03'],
    ['Rotogravure Printing Machine', 'Printing', 'RG-6C', 18, 1, '2023-06-25'],
    ['Corrugation Plant', 'Paper', 'CP-1400', 19, 1, '2022-04-18'],
    ['Bag Making Machine', 'Converting', 'BM-250', 21, 1, '2025-08-14'],
    ['Flexo Printing Machine', 'Printing', 'FX-6C', 22, 1, '2025-09-21'],
    ['Slitter Rewinder', 'Converting', 'SR-1300', null, 3, null],
    ['Rotogravure Printing Machine', 'Printing', 'RG-8C', null, 1, null],
    ['Pouch Making Machine', 'Converting', 'PM-400', null, 2, null]
];

// [number, party index, status, days ago, items: [name, model, specs, qty, unit price], payment, delivery]
const QUOTATIONS = [
    ['MMW-2026-001', 0, 'Approved', 70, [['Rotogravure Printing Machine', 'RG-8C', '8 colour, 1000 mm web width, 150 mpm, unwinder and rewinder', 1, 1200000], ['Slitter Rewinder', 'SR-1000', 'Max 1000 mm, 300 mpm', 1, 250000]], '50% advance with order, balance before dispatch', 'Within 45 days from receipt of advance'],
    ['MMW-2026-002', 4, 'Sent', 55, [['Flexo Printing Machine', 'FX-6C', '6 colour, 850 mm, ceramic anilox', 1, 950000]], '40% advance, 50% on readiness, 10% after commissioning', '60 days'],
    ['MMW-2026-003', 9, 'Draft', 40, [['Pouch Making Machine', 'PM-400', 'Three side seal, servo driven', 2, 420000]], '100% advance', '30 days'],
    ['MMW-2026-004', 10, 'Approved', 33, [['Extrusion Coating Plant', 'EC-1200', '1200 mm, with corona treater', 1, 2600000]], '30% advance, 60% against PI, 10% after installation', '90 days'],
    ['MMW-2026-005', 12, 'Sent', 25, [['Rotogravure Printing Machine', 'RG-8C', '8 colour, export model', 2, 1250000], ['Slitter Rewinder', 'SR-1300', 'Max 1300 mm', 2, 310000]], '30% advance by TT, balance against BL copy', '75 days from advance'],
    ['MMW-2026-006', 13, 'Sent', 18, [['Flexo Printing Machine', 'FX-4C', '4 colour, 650 mm', 1, 680000]], '50% advance, balance before dispatch', '45 days'],
    ['MMW-2026-007', 17, 'Draft', 9, [['Lamination Machine', 'LM-1100', 'Dry laminator with chiller', 1, 780000], ['Slitter Rewinder', 'SR-1000', 'Max 1000 mm', 1, 250000]], '50% advance, balance before dispatch', '40 days'],
    ['MMW-2026-008', 20, 'Rejected', 6, [['Corrugation Plant', 'CP-1400', '1400 mm, 3 ply', 1, 1850000]], '30% advance, balance in two instalments', '100 days'],
    ['MMW-2026-009', 22, 'Sent', 3, [['Bag Making Machine', 'BM-250', 'Flat and gusset bags', 1, 540000], ['Pouch Making Machine', 'PM-600', 'Stand-up pouch with zipper', 1, 890000]], '50% advance, balance before dispatch', '50 days'],
    ['MMW-2026-010', 2, 'Draft', 1, [['Solventless Laminator', 'SL-1300', '1300 mm, high speed', 1, 1480000]], '40% advance, balance before dispatch', '60 days']
];

// [title, days from today, type, party index or null]
const EVENTS = [
    ['Call Shree Packaging about annual service', 1, 'followup', 0],
    ['Demo at Jai Mata Di Packers', 3, 'meeting', 4],
    ['Send revised quotation to Raj Enterprises', 4, 'followup', 9],
    ['Machine inspection - Vardhman Converters', 6, 'visit', 10],
    ['Trade fair - Delhi Pragati Maidan', 10, 'meeting', null],
    ['Payment follow-up: Balaji Flexi Films', 2, 'followup', 1],
    ['Commissioning at Sai Flexo Pack', 8, 'visit', 7],
    ['Weekly sales review', 0, 'meeting', null]
];

const daysFromNow = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
};

const DATA_TABLES = ['calls', 'quotation_items', 'quotations', 'events', 'machines', 'parties', 'salespersons', 'activity'];

export async function clearData() {
    for (const table of DATA_TABLES) await pool.query(`DELETE FROM ${table}`);
}

export async function hasData() {
    const [[{ total }]] = await pool.query(
        'SELECT (SELECT COUNT(*) FROM salespersons) + (SELECT COUNT(*) FROM parties) + (SELECT COUNT(*) FROM quotations) AS total'
    );
    return total > 0;
}

// Returns the counts that were added, or null when the database already has data (and force is off).
export async function seedSampleData({ force = false } = {}) {
    await migrate();
    if (await hasData()) {
        if (!force) return null;
        await clearData();
    }

    const people = [];
    for (const [fullName, nickname, mobile, email, department, employeeId] of SALESPEOPLE) {
        people.push(await salespersons.create({ fullName, nickname, mobile, email, department, employeeId }));
    }

    const partyRecords = [];
    for (const [companyName, partyName, primaryMobile, city, state, pincode, area, partyType, partyStatus, sp] of PARTIES) {
        partyRecords.push(await parties.create({
            companyName,
            partyName,
            primaryMobile,
            whatsappNumber: primaryMobile,
            email: `${partyName.split(' ')[0].toLowerCase()}@${companyName.split(' ')[0].toLowerCase()}.example.com`,
            partyType,
            partyStatus,
            assignedSalesperson: people[sp].id,
            followUpDate: partyStatus === 'Follow-up' ? daysFromNow(2 + partyRecords.length % 7) : '',
            fullAddress: `${area}, ${city}${pincode ? ` - ${pincode}` : ''}`,
            area,
            city,
            state,
            pincode,
            clientRequirements: partyType === 'Prospect' ? 'Looking for a new printing / converting line' : ''
        }));
    }

    for (const [name, category, model, partyIndex, quantity, purchaseDate] of MACHINES) {
        await machines.create({
            name, category, model, quantity,
            purchaseDate: purchaseDate || '',
            partyId: partyIndex === null ? '' : partyRecords[partyIndex].id
        });
    }

    for (const [quotationNumber, partyIndex, status, daysAgo, items, paymentTerms, deliveryTerms] of QUOTATIONS) {
        const party = partyRecords[partyIndex];
        const machineDetails = items.map(([machineName, machineModel, specifications, quantity, unitPrice]) => ({
            machineName, machineModel, specifications, quantity, unitPrice, amount: quantity * unitPrice
        }));
        await quotations.create({
            quotationNumber,
            quotationDate: daysFromNow(-daysAgo),
            partyId: party.id,
            companyName: party.companyName,
            partyName: party.partyName,
            salespersonName: party.salespersonName,
            mobile: party.primaryMobile,
            address: party.fullAddress,
            status,
            paymentTerms,
            deliveryTerms,
            machineDetails,
            totalAmount: machineDetails.reduce((sum, m) => sum + m.amount, 0)
        });
    }

    for (const [title, offset, eventType, partyIndex] of EVENTS) {
        await events.create({
            title,
            date: daysFromNow(offset),
            eventType,
            status: 'scheduled',
            partyId: partyIndex === null ? '' : partyRecords[partyIndex].id
        });
    }

    // The records above each logged an activity line; replace them with one summary.
    await pool.query('DELETE FROM activity');
    await logActivity('system', 'Sample data loaded');

    return {
        salespersons: SALESPEOPLE.length,
        parties: PARTIES.length,
        machines: MACHINES.length,
        quotations: QUOTATIONS.length,
        events: EVENTS.length
    };
}

// Run from the command line only (not when imported by the server).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const counts = await seedSampleData({ force: process.argv.includes('--force') });
        console.log(counts
            ? `Seeded ${counts.salespersons} salespersons, ${counts.parties} parties, ${counts.machines} machines, ${counts.quotations} quotations and ${counts.events} events.`
            : 'The database already has data. Run "npm run seed -- --force" to wipe it and reseed.');
    } catch (error) {
        console.error('Seeding failed:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}
