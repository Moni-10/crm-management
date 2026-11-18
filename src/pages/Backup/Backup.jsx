import { useRef, useState } from 'react';
import { Download, HardDriveDownload, History, Upload } from 'lucide-react';
import { backupApi } from '../../api';
import { PageHeader } from '../../components/ui';
import { readLegacyBrowserData } from '../../utils/legacyBrowserData';
import { showToast } from '../../utils/helpers';

const summarize = (summary) =>
    Object.entries(summary)
        .filter(([, r]) => r.imported || r.failed)
        .map(([name, r]) => `${r.imported} ${name}${r.failed ? ` (${r.failed} failed)` : ''}`)
        .join(', ');

function ActionCard({ icon: Icon, title, children }) {
    return (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="stat-icon primary"><Icon aria-hidden="true" /></span>
            <h3>{title}</h3>
            {children}
        </div>
    );
}

export default function Backup() {
    const fileInput = useRef(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState('');

    const runImport = async (data) => {
        setBusy(true);
        try {
            const summary = await backupApi.import(data);
            const text = summarize(summary);
            setResult(text ? `Restored ${text}.` : 'Nothing was imported.');
            showToast('Restore finished');
        } catch (error) {
            showToast(error.message || 'Restore failed', 'error');
        } finally {
            setBusy(false);
        }
    };

    const downloadBackup = async () => {
        try {
            const data = await backupApi.export();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `party-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('Backup downloaded');
        } catch (error) {
            showToast(error.message || 'Backup failed', 'error');
        }
    };

    const restoreFile = async () => {
        const file = fileInput.current?.files?.[0];
        if (!file) return showToast('Choose a backup file first', 'error');
        try {
            await runImport(JSON.parse(await file.text()));
        } catch {
            showToast('That file is not a valid backup', 'error');
        }
    };

    const importFromBrowser = async () => {
        const data = await readLegacyBrowserData().catch(() => null);
        const count = data ? Object.values(data).reduce((sum, rows) => sum + rows.length, 0) : 0;
        if (!count) return showToast('No old browser data found here', 'info');
        await runImport(data);
    };

    return (
        <div>
            <PageHeader title="Backup and restore" subtitle="Keep a copy of everything in the database, or bring data back." />

            <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <ActionCard icon={HardDriveDownload} title="Back up">
                    <p>Download every party, salesperson, machine, quotation and event as one JSON file.</p>
                    <div><button type="button" className="btn btn-primary" onClick={downloadBackup}><Download /> Download backup</button></div>
                </ActionCard>

                <ActionCard icon={Upload} title="Restore">
                    <p>Load a backup file. Records with the same ID are updated, so restoring twice is safe.</p>
                    <input ref={fileInput} type="file" accept=".json" aria-label="Backup file" />
                    <div><button type="button" className="btn" onClick={restoreFile} disabled={busy}>Restore from file</button></div>
                </ActionCard>

                <ActionCard icon={History} title="Move old browser data">
                    <p>Earlier versions saved data only inside the browser. Open this page in that same browser to copy it into MySQL (safe to repeat).</p>
                    <div><button type="button" className="btn" onClick={importFromBrowser} disabled={busy}>Import from this browser</button></div>
                </ActionCard>
            </div>

            {result && <div className="alert success" role="status" style={{ marginTop: 20 }}><span>{result}</span></div>}
        </div>
    );
}
