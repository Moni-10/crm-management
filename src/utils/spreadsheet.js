// Reads a .csv or .xlsx file into a plain array of rows (each row is an array of cell values).

// Minimal RFC 4180 CSV parser: quoted fields, escaped quotes and newlines inside quotes.
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    const input = text.replace(/^﻿/, '');

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (inQuotes) {
            if (char === '"' && input[i + 1] === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && input[i + 1] === '\n') i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }
    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

export async function readSpreadsheet(file) {
    if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser');
        return readSheet(file);
    }
    if (/\.csv$/i.test(file.name)) {
        return parseCsv(await file.text());
    }
    throw new Error('Please choose a .csv or .xlsx file');
}

const escapeCsv = (value) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

// Downloads a template file: header row plus one example row.
export function downloadCsv(filename, headers, exampleRow) {
    const lines = [headers, exampleRow].map((cells) => cells.map((c) => escapeCsv(String(c))).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

const normalize = (text) => String(text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const cellToString = (cell) => {
    if (cell === null || cell === undefined) return '';
    if (cell instanceof Date) return cell.toISOString().slice(0, 10);
    return String(cell).trim();
};

/**
 * Turns raw rows into records using the first row as headers.
 * columns: [{ key, label, required? }] — a header matches a column by its key or its label.
 * Returns { records, rowNumbers, unknownHeaders, missingRequired }.
 */
export function rowsToRecords(rows, columns) {
    const [headerRow = [], ...dataRows] = rows;
    const byHeader = new Map();
    for (const column of columns) {
        byHeader.set(normalize(column.key), column);
        byHeader.set(normalize(column.label), column);
    }

    const mapping = headerRow.map((header) => byHeader.get(normalize(header)) || null);
    const unknownHeaders = headerRow.filter((header, i) => !mapping[i] && cellToString(header));
    const present = new Set(mapping.filter(Boolean).map((c) => c.key));
    const missingRequired = columns.filter((c) => c.required && !present.has(c.key)).map((c) => c.label);

    const records = [];
    const rowNumbers = [];
    dataRows.forEach((cells, index) => {
        const record = {};
        mapping.forEach((column, i) => {
            if (column) record[column.key] = cellToString(cells[i]);
        });
        if (Object.values(record).every((value) => value === '')) return;
        records.push(record);
        rowNumbers.push(index + 2); // +1 for the header row, +1 because sheets start at row 1
    });

    return { records, rowNumbers, unknownHeaders, missingRequired };
}
