import { pool } from '../db/pool.js';
import { HttpError, nowSql } from '../lib/mapping.js';
import { logActivity } from '../lib/activity.js';

// The company's own details (letterhead, sidebar, login). One row, id = 1.
const MAX_LOGO_CHARS = 1_500_000; // about 1 MB of image data

const DEFAULTS = {
    name: 'Mohindra Mechanical Works',
    short_name: 'MMW',
    tagline: 'Manufacturers of Export Quality :\nPAPER CONVERSION MACHINES & PRINTING MACHINES',
    address: 'UNIT-1, RZ-73, NARSINGH GARDEN, NEW DELHI-18\n(NEAR KHYALA VILLAGE)\nUNIT-II, B-143, Sector-1, DSIIDC, Bawana\nIndl. Area, New delhi-110039',
    phones: '(O) Telefax : 011-25981351\nCell No. : 9312944733\n9999778804\n9999984314',
    email: 'info@mohindraroto.com',
    website: 'www.mohindraroto.com',
    gstin: '07AFOPB9017R1ZU',
    iec: '0596068743',
    logo: null
};

const toApi = (row) => ({
    name: row.name,
    shortName: row.short_name || '',
    tagline: row.tagline || '',
    address: row.address || '',
    phones: row.phones || '',
    email: row.email || '',
    website: row.website || '',
    gstin: row.gstin || '',
    iec: row.iec || '',
    logo: row.logo || ''
});

export async function ensureCompanyRow() {
    const [rows] = await pool.query('SELECT id FROM company WHERE id = 1');
    if (rows.length > 0) return;
    await pool.query('INSERT INTO company SET ?', [{ id: 1, ...DEFAULTS, updated_at: nowSql() }]);
}

async function load() {
    const [rows] = await pool.query('SELECT * FROM company WHERE id = 1');
    return toApi(rows[0] || { ...DEFAULTS });
}

// Anyone may read it (the login screen shows the name and logo); only an admin may change it.
export const readCompany = async (req, res, next) => {
    try {
        res.json(await load());
    } catch (error) {
        next(error);
    }
};

export const updateCompany = async (req, res, next) => {
    try {
        const body = req.body || {};
        const name = String(body.name || '').trim();
        if (!name) throw new HttpError(400, 'Company name is required');

        const logo = body.logo ? String(body.logo) : null;
        if (logo) {
            if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(logo)) throw new HttpError(400, 'The logo must be a PNG, JPG, WebP or SVG image');
            if (logo.length > MAX_LOGO_CHARS) throw new HttpError(400, 'The logo is too large. Use an image under 1 MB');
        }

        const text = (value) => (value === undefined || value === null ? null : String(value).trim() || null);
        const row = {
            name,
            short_name: String(body.shortName || '').trim().slice(0, 20),
            tagline: text(body.tagline),
            address: text(body.address),
            phones: text(body.phones),
            email: text(body.email),
            website: text(body.website),
            gstin: text(body.gstin),
            iec: text(body.iec),
            logo,
            updated_at: nowSql()
        };
        await pool.query('UPDATE company SET ? WHERE id = 1', [row]);
        logActivity('system', `Company details updated by ${req.user.name}`);
        res.json(await load());
    } catch (error) {
        next(error);
    }
};

