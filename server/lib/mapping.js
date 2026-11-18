// Field definition: { key: 'camelCaseName', col: 'snake_column', type?: 'str'|'num'|'int'|'date', required?: true }

export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export const generateId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const toSqlDateTime = (date) => date.toISOString().slice(0, 19).replace('T', ' ');
export const nowSql = () => toSqlDateTime(new Date());

// Used when importing records that already carry a createdAt timestamp.
export const isoToSql = (iso) => {
    const date = iso ? new Date(iso) : null;
    return date && !Number.isNaN(date.getTime()) ? toSqlDateTime(date) : null;
};

// DATETIME values come back as 'YYYY-MM-DD HH:MM:SS' (UTC); the client expects ISO strings.
const toIso = (value) => (value ? `${String(value).replace(' ', 'T')}Z` : value);

const toSqlValue = (field, value) => {
    if (value === undefined || value === null || value === '') return null;
    switch (field.type) {
        case 'num': {
            const n = Number(value);
            return Number.isFinite(n) ? n : null;
        }
        case 'int': {
            const n = parseInt(value, 10);
            return Number.isFinite(n) ? n : null;
        }
        case 'date':
            return String(value).slice(0, 10);
        default:
            return String(value);
    }
};

// Client object -> { column: value } for the columns we know about.
export function toRow(fields, body) {
    const row = {};
    for (const field of fields) {
        if (!(field.key in body)) continue;
        const value = toSqlValue(field, body[field.key]);
        if (field.required && value === null) {
            throw new HttpError(400, `${field.key} is required`);
        }
        row[field.col] = value;
    }
    return row;
}

// DB row -> client object. Empty values become '' so React inputs stay controlled.
export function fromRow(fields, row, alias = '') {
    const out = { id: row.id, createdAt: toIso(row.created_at), updatedAt: toIso(row.updated_at) };
    for (const field of fields) {
        const value = row[alias + field.col];
        if (value === null || value === undefined) {
            out[field.key] = '';
        } else if (field.type === 'num' || field.type === 'int') {
            out[field.key] = Number(value);
        } else {
            out[field.key] = value;
        }
    }
    return out;
}
