import writeXlsxFile from 'write-excel-file/browser';

const MAX_WIDTH = 50;

const headerCell = (label) => ({ value: label, fontWeight: 'bold', backgroundColor: '#E8EEF7' });

// Text stays text (so mobile numbers keep leading zeros); columns marked type: 'number' stay numeric.
const toCell = (column, record) => {
    const raw = record[column.exportKey || column.key];
    if (raw === null || raw === undefined || raw === '') return null;
    if (column.type === 'number') return Number.isFinite(Number(raw)) ? Number(raw) : null;
    return String(raw);
};

const toSheet = ({ name, columns, records }) => {
    const data = [
        columns.map((column) => headerCell(column.label)),
        ...records.map((record) => columns.map((column) => toCell(column, record)))
    ];
    const widths = columns.map((column) => {
        const longest = records.reduce(
            (max, record) => Math.max(max, String(record[column.exportKey || column.key] ?? '').length),
            column.label.length
        );
        return { width: Math.min(longest + 2, MAX_WIDTH) };
    });
    return { data, sheet: name, columns: widths, stickyRowsCount: 1 };
};

/**
 * Downloads an .xlsx file.
 * sheets: [{ name, columns: [{ key, label, exportKey?, type? }], records: [] }]
 */
export async function exportToExcel(filename, sheets) {
    const stamp = new Date().toISOString().slice(0, 10);
    await writeXlsxFile(sheets.map(toSheet)).toFile(`${filename}-${stamp}.xlsx`);
}
