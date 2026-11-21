import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../../utils/excelExport';
import { showToast } from '../../utils/helpers';

/**
 * "Export" button for a list page.
 *   filename - base name of the downloaded file (the date is appended)
 *   getSheets - () => [{ name, columns, records }] describing what to export
 *   count    - number of rows currently shown; the button is disabled when 0
 */
export default function ExportButton({ filename, getSheets, count }) {
    const [busy, setBusy] = useState(false);

    const handleClick = async () => {
        setBusy(true);
        try {
            await exportToExcel(filename, await getSheets()); // getSheets may be async (e.g. fetch every page)
            showToast(`Exported ${count} row(s) to Excel`);
        } catch (error) {
            console.error('Export failed:', error);
            showToast('Export failed', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className="btn"
            onClick={handleClick}
            disabled={busy || count === 0}
            title={count === 0 ? 'Nothing to export' : `Download ${count} row(s) as an Excel file`}
        >
            <FileSpreadsheet /> {busy ? 'Exporting...' : 'Export'}
        </button>
    );
}
