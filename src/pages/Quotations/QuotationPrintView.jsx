import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileDown, Info, Printer, SlidersHorizontal } from 'lucide-react';
import {
    buildSheetHtml,
    DEFAULT_CALIBRATION,
    loadCalibration,
    saveCalibration
} from '../../components/quotation/quotationSheet';
import { PageHeader } from '../../components/ui';
import { useCompany } from '../../context/CompanyContext';

const PAGE_W = 794; // A4 width in CSS pixels
const PAGE_H = 1123;

function Slider({ label, value, min, max, step, unit, onChange }) {
    return (
        <label className="cal-field">
            <span>{label}: <strong>{value}{unit}</strong></span>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
        </label>
    );
}

/**
 * Print screen for one quotation.
 * Shows the A4 sheet like the pre-printed paper. "Print on pre-printed paper" prints ONLY the
 * entered data; "Download PDF" prints the full sheet including the letterhead.
 *   autoDownload - open the print dialog with the letterhead straight away (used by Share > Download PDF)
 */
export default function QuotationPrintView({ data, onClose, autoDownload = false }) {
    const { company } = useCompany();
    const frameRef = useRef(null);
    const boxRef = useRef(null);
    const [calibration, setCalibration] = useState(loadCalibration);
    const [showAdjust, setShowAdjust] = useState(false);
    const [view, setView] = useState('sheet'); // 'sheet' = like the paper, 'print' = only what will print
    const [scale, setScale] = useState(1);
    const [loaded, setLoaded] = useState(false);

    const html = useMemo(
        () => buildSheetHtml(data, calibration, { printOnlyPreview: view === 'print', company }),
        [data, calibration, view, company]
    );

    // Fit the A4 sheet to the available width.
    useEffect(() => {
        const box = boxRef.current;
        if (!box) return undefined;
        const update = () => setScale(Math.min(1, (box.clientWidth - 34) / PAGE_W));
        update();
        const observer = new ResizeObserver(update);
        observer.observe(box);
        return () => observer.disconnect();
    }, []);

    const print = (withLetterhead) => {
        const frame = frameRef.current;
        if (!frame?.contentWindow) return;
        frame.contentDocument.body.classList.toggle('data-only', !withLetterhead);
        frame.contentWindow.focus();
        frame.contentWindow.print();
    };

    // Share > Download PDF lands here with autoDownload: print the full sheet once it has rendered.
    useEffect(() => {
        if (autoDownload && loaded) print(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoDownload, loaded]);

    const updateCalibration = (patch) => {
        const next = { ...calibration, ...patch };
        setCalibration(next);
        saveCalibration(next);
    };

    const resetCalibration = () => {
        setCalibration({ ...DEFAULT_CALIBRATION });
        saveCalibration(DEFAULT_CALIBRATION);
    };

    return (
        <div>
            <PageHeader title={`Quotation ${data.quotationNumber}`} subtitle={data.companyName}>
                <button type="button" className="btn" onClick={onClose}><ArrowLeft /> Back</button>
                <button type="button" className="btn" onClick={() => print(true)} title="Prints the full sheet including the letterhead">
                    <FileDown /> Download PDF
                </button>
                <button type="button" className="btn btn-primary" onClick={() => print(false)}>
                    <Printer /> Print on pre-printed paper
                </button>
            </PageHeader>

            <div className="print-hint">
                <Info aria-hidden="true" />
                <span>
                    Put your pre-printed quotation paper in the printer. Only the <strong>blue text</strong> is printed;
                    the rest of the sheet (shown here for reference) is already on the paper.
                </span>
            </div>

            <div className="print-toolbar">
                <div className="segmented" role="group" aria-label="Preview mode">
                    <button type="button" className={view === 'sheet' ? 'active' : ''} onClick={() => setView('sheet')}>Full sheet</button>
                    <button type="button" className={view === 'print' ? 'active' : ''} onClick={() => setView('print')}>Print only</button>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => setShowAdjust((v) => !v)} aria-expanded={showAdjust}>
                    <SlidersHorizontal /> Adjust position
                </button>
            </div>

            {showAdjust && (
                <div className="cal-panel">
                    <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>
                        Print a test on plain paper held against the pre-printed one, then nudge the text until it
                        lines up. Saved on this computer.
                    </p>
                    <div className="cal-panel-grid">
                        <Slider label="Move right" value={calibration.offsetX} min={-20} max={20} step={0.5} unit=" mm" onChange={(v) => updateCalibration({ offsetX: v })} />
                        <Slider label="Move down" value={calibration.offsetY} min={-20} max={20} step={0.5} unit=" mm" onChange={(v) => updateCalibration({ offsetY: v })} />
                        <Slider label="Text size" value={calibration.fontSize} min={7} max={12} step={0.5} unit=" pt" onChange={(v) => updateCalibration({ fontSize: v })} />
                    </div>
                    <button type="button" className="btn btn-sm" onClick={resetCalibration}>Reset</button>
                </div>
            )}

            <div className="sheet-box" ref={boxRef}>
                <div style={{ height: PAGE_H * scale, width: PAGE_W * scale }}>
                    <iframe
                        ref={frameRef}
                        title="Quotation sheet"
                        srcDoc={html}
                        onLoad={() => setLoaded(true)}
                        style={{
                            width: PAGE_W,
                            height: PAGE_H,
                            border: 'none',
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                            background: '#fff'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
