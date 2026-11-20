import { pool } from './server/db/pool.js';
import 'dotenv/config';

const companies = [
    {
        id: 1,
        name: 'Mohindra Mechanical Works',
        short_name: 'MMW',
        tagline: 'Manufacturers of Export Quality :\nPAPER CONVERSION MACHINES & PRINTING MACHINES',
        address: 'UNIT-I, RZ-73, NARSINGH GARDEN, NEW DELHI-18\n(NEAR KHYALA VILLAGE)\nUNIT-II, B-143, Sector-1, DSIIDC, Bawsana\nIndi. Area, New delhi-110039',
        phones: '(O) Telefax: 011-25981351\nCell No.: 9312944733\n9999778804\n9999984314',
        email: 'info@mohindraroto.com',
        website: 'www.mohindraroto.com',
        gstin: '07AFQPR8017R1ZU',
        iec: '0586068743'
    },
    {
        id: 2,
        name: 'Mohindra Engineering Company',
        short_name: 'AMEC',
        tagline: 'Manufacturers of Importers of :\nRotogravure Printing, Flexographic Printing, Lamination Machine, Coating Machine, Paper Bag Making, Slitting & Rewinding',
        address: 'Office Cum Works -\nPlot No. 414, HSIIDC, Phase-1,\nBarhi, Distt. Sonipat (HR.), PIN-131101',
        phones: 'Cell No.: 9312944733\n9999778804\n25981351',
        email: 'info@mohindraroto.com',
        website: 'www.mohindraroto.com',
        gstin: '06AFOPB9017R1ZW',
        iec: ''
    },
    {
        id: 3,
        name: 'Roto N Print Pack Industries',
        short_name: 'RNPPI',
        tagline: 'Manufacturers & Export Quality\nPAPER CONVERSION MACHINES & PRINTING MACHINES',
        address: 'RZ-73A, Narsingh Garden,\nNear Khyala Village,\nNew Delhi-110018',
        phones: 'Ph.: 9312944733\n9999778804\n9999984314\n011-25981351',
        email: 'info@mohindraroto.com',
        website: 'www.mohindraroto.com',
        gstin: '07CGQCPS1320M1ZS',
        iec: 'DS9068743'
    },
    {
        id: 4,
        name: 'Azad Paper Industries',
        short_name: 'API',
        tagline: 'Mfrs. & Dealers of :\nNEW / OLD PAPER CONVERSION MACHINES & PRINTING MACHINES',
        address: 'RZ-77, NARSINGH GARDEN,\nKHYALA VILLAGE,\nNEW DELHI-18',
        phones: '(O) Telefax: 011-25981351\nCell No.: 9312944733\n9999778804\n9999984314',
        email: 'info@mohindraroto.com',
        website: 'www.mohindraroto.com',
        gstin: '07BFLPS5664F1ZZ',
        iec: 'DS9068743'
    }
];

async function addCompanies() {
    try {
        console.log('\n🏢 Adding companies to database...\n');

        for (const company of companies) {
            const [existing] = await pool.query('SELECT id FROM company WHERE id = ?', [company.id]);

            if (existing.length > 0) {
                // Update existing
                await pool.query(
                    'UPDATE company SET name = ?, short_name = ?, tagline = ?, address = ?, phones = ?, email = ?, website = ?, gstin = ?, iec = ?, updated_at = NOW() WHERE id = ?',
                    [company.name, company.short_name, company.tagline, company.address, company.phones, company.email, company.website, company.gstin, company.iec, company.id]
                );
                console.log(`✅ Updated: ${company.name}`);
            } else {
                // Insert new
                await pool.query(
                    'INSERT INTO company (id, name, short_name, tagline, address, phones, email, website, gstin, iec, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                    [company.id, company.name, company.short_name, company.tagline, company.address, company.phones, company.email, company.website, company.gstin, company.iec]
                );
                console.log(`✅ Created: ${company.name}`);
            }
        }

        console.log('\n📋 All companies in database:');
        const [allCompanies] = await pool.query('SELECT id, name, short_name FROM company ORDER BY id');
        allCompanies.forEach(c => {
            console.log(`  ${c.id}. ${c.name} (${c.short_name})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addCompanies();
