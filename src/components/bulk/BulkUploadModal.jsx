import { useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '../ui';
import { downloadCsv, readSpreadsheet, rowsToRecords } from '../../utils/spreadsheet';

/**
 * Generic "upload a spreadsheet" dialog.
 *
 * props:
 *   title      - dialog title, e.g. "Bulk upload parties"
 *   columns    - [{ key, label, example, required? }] describing the accepted columns
 *   onUpload   - async (records) => { created, failed, errors: [{ row, message }] }
 *   onClose    - called when the dialog is dismissed
 *   onDone     - called on close when at least one row was imported (refresh the page's data)
 *   hint       - optional extra line shown under the column list
 */
export default function BulkUploadModal({ title, columns, onUpload, onClose, onDone, hint }) {
    const [parsed, setParsed] = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const templateName = `${title.replace(/^Bulk upload\s*/i, '').toLowerCase().replace(/\s+/g, '-')}-template.csv`;

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        setParsed(null);
        setResult(null);
        setError('');
        if (!file) return;
        setFileName(file.name);
        try {
            const rows = await readSpreadsheet(file);
            const next = rowsToRecords(rows, columns);
            if (next.missingRequired.length > 0) {
                setError(`Missing required column(s): ${next.missingRequired.join(', ')}`);
            } else if (next.records.length === 0) {
                setError('No data rows found in this file');
            } else {
                setParsed(next);
            }
        } catch (err) {
            setError(err.message || 'Could not read this file');
        }
    };

    const runUpload = async () => {
        setBusy(true);
        setError('');
        try {
            setResult(await onUpload(parsed.records));
        } catch (err) {
            setError(err.message || 'Upload failed');
        } finally {
            setBusy(false);
        }
    };

    // Refresh the page's list only on close: reloading earlier can unmount this dialog mid-result.
    const handleClose = () => {
        onClose();
        if (result?.created > 0) onDone?.();
    };

    const previewColumns = columns.filter((c) => parsed?.records.some((r) => r[c.key])).slice(0, 5);

    return (
        <Modal
            size="lg"
            title={title}
            onClose={handleClose}
            footer={(
                <>
                    <button type="button" className="btn" onClick={handleClose}>{result ? 'Close' : 'Cancel'}</button>
                    {!result && (
                        <button type="button" className="btn btn-primary" onClick={runUpload} disabled={!parsed || busy}>
                            {busy ? 'Importing...' : `Import ${parsed ? parsed.records.length : ''} rows`}
                        </button>
                    )}
                </>
            )}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p>
                    Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file. The first row must be the column headers.
                    Columns marked * are required.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {columns.map((c) => (
                        <span key={c.key} className="badge plain neutral">{c.label}{c.required ? ' *' : ''}</span>
                    ))}
                </div>
                {hint && <p className="muted" style={{ fontSize: 14 }}>{hint}</p>}

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => downloadCsv(templateName, columns.map((c) => c.label), columns.map((c) => c.example ?? ''))}
                    >
                        <Download /> Download template
                    </button>
                    <input type="file" accept=".csv,.xlsx" onChange={handleFile} disabled={busy} aria-label="Choose a file to upload" />
                </div>

                {error && <div className="alert error" role="alert"><span>{error}</span></div>}

                {parsed && !result && (
                    <div>
                        <p style={{ marginBottom: 8 }}><strong>{parsed.records.length}</strong> row(s) ready from {fileName}</p>
                        {parsed.unknownHeaders.length > 0 && (
                            <p className="alert warning" style={{ marginBottom: 8 }}>Ignored unknown column(s): {parsed.unknownHeaders.join(', ')}</p>
                        )}
                        <div className="table-wrap card">
                            <table className="table">
                                <thead><tr>{previewColumns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
                                <tbody>
                                    {parsed.records.slice(0, 5).map((record, i) => (
                                        <tr key={i}>{previewColumns.map((c) => <td key={c.key}>{record[c.key]}</td>)}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {parsed.records.length > 5 && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Showing the first 5 of {parsed.records.length} rows.</p>}
                    </div>
                )}

                {result && (
                    <div>
                        <div className={`alert ${result.created ? 'success' : 'error'}`} role="status">
                            <span><strong>{result.created} imported</strong>{result.failed ? `, ${result.failed} failed` : ''}</span>
                        </div>
                        {result.errors.length > 0 && (
                            <ul style={{ maxHeight: 160, overflowY: 'auto', fontSize: 14, paddingLeft: 20, marginTop: 10 }}>
                                {result.errors.slice(0, 50).map((e, i) => (
                                    <li key={i}>Row {parsed.rowNumbers[e.row - 1] ?? e.row}: {e.message}</li>
                                ))}
                                {result.errors.length > 50 && <li>…and {result.errors.length - 50} more</li>}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
