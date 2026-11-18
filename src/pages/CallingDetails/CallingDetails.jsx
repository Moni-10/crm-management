import { useState } from 'react';
import { Plus, Phone, Calendar, Trash2, Edit2, Upload, Download, Search } from 'lucide-react';

export default function CallingDetails() {
    const [calls, setCalls] = useState([
        {
            id: 1,
            partyName: 'ABC Industries',
            contactPerson: 'Rajesh Kumar',
            mobileNumber: '9876543210',
            whatsappNumber: '9876543210',
            email: 'rajesh@abc.com',
            city: 'Delhi',
            state: 'Delhi',
            callDate: '2026-11-18',
            callTime: '10:30',
            duration: '15',
            machineInterest: 'Lamination Machine',
            callType: 'Follow-up',
            notes: 'Discussed quotation for new machines',
            handledBy: 'Rahul',
            status: 'completed',
            deleted: false
        },
        {
            id: 2,
            partyName: 'XYZ Packaging',
            contactPerson: 'Priya Sharma',
            mobileNumber: '9876543211',
            whatsappNumber: '9876543211',
            email: 'priya@xyz.com',
            city: 'Mumbai',
            state: 'Maharashtra',
            callDate: '2026-11-18',
            callTime: '14:15',
            duration: '8',
            machineInterest: 'Printing Machine',
            callType: 'Sales',
            notes: 'Follow-up on previous quote',
            handledBy: 'Rahul',
            status: 'completed',
            deleted: false
        }
    ]);

    const [showForm, setShowForm] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [filterCity, setFilterCity] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchText, setSearchText] = useState('');
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        partyName: '',
        contactPerson: '',
        mobileNumber: '',
        whatsappNumber: '',
        email: '',
        city: '',
        state: '',
        callDate: new Date().toISOString().split('T')[0],
        callTime: '10:00',
        duration: '',
        machineInterest: '',
        callType: 'Follow-up',
        notes: '',
        handledBy: '',
        status: 'completed'
    });

    const handleAddCall = (e) => {
        e.preventDefault();
        if (editingId) {
            setCalls(calls.map(c => c.id === editingId ? { ...formData, id: editingId, deleted: false } : c));
            setEditingId(null);
        } else {
            const newCall = {
                id: Math.max(...calls.map(c => c.id), 0) + 1,
                ...formData,
                deleted: false
            };
            setCalls([newCall, ...calls]);
        }
        setFormData({
            partyName: '',
            contactPerson: '',
            mobileNumber: '',
            whatsappNumber: '',
            email: '',
            city: '',
            state: '',
            callDate: new Date().toISOString().split('T')[0],
            callTime: '10:00',
            duration: '',
            machineInterest: '',
            callType: 'Follow-up',
            notes: '',
            handledBy: '',
            status: 'completed'
        });
        setShowForm(false);
    };

    const handleEdit = (call) => {
        setFormData(call);
        setEditingId(call.id);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        setCalls(calls.map(c => c.id === id ? { ...c, deleted: true } : c));
    };

    const handleRestore = (id) => {
        setCalls(calls.map(c => c.id === id ? { ...c, deleted: false } : c));
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const { read, utils } = await import('xlsx');
            const data = await file.arrayBuffer();
            const workbook = read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = utils.sheet_to_json(worksheet);

            const importedCalls = jsonData.map((row, idx) => ({
                id: Math.max(...calls.map(c => c.id), 0) + idx + 1,
                partyName: row['partyName'] || row['Party Name'] || '',
                contactPerson: row['contactPerson'] || row['Contact Person'] || '',
                mobileNumber: row['mobileNumber'] || row['Mobile Number'] || '',
                whatsappNumber: row['whatsappNumber'] || row['WhatsApp Number'] || '',
                email: row['email'] || row['Email'] || '',
                city: row['city'] || row['City'] || '',
                state: row['state'] || row['State'] || '',
                callDate: row['callDate'] || row['Call Date'] || '',
                callTime: row['callTime'] || row['Call Time'] || '',
                duration: row['duration'] || row['Duration'] || '',
                machineInterest: row['machineInterest'] || row['Machine Interest'] || '',
                callType: row['callType'] || row['Call Type'] || 'Follow-up',
                notes: row['notes'] || row['Notes'] || '',
                handledBy: row['handledBy'] || row['Handled By'] || '',
                status: row['status'] || row['Status'] || 'completed',
                deleted: false
            }));

            setCalls([...calls, ...importedCalls]);
            setShowImport(false);
            alert(`Successfully imported ${importedCalls.length} records!`);
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };

    const handleExportExcel = async () => {
        try {
            const { utils, writeFile } = await import('xlsx');
            const dataToExport = calls.filter(c => !c.deleted).map(({ id, deleted, ...rest }) => rest);
            const worksheet = utils.json_to_sheet(dataToExport);
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, worksheet, 'Calling Details');
            writeFile(workbook, `calling-details-${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            alert('Error exporting file: ' + error.message);
        }
    };

    const downloadTemplate = async () => {
        try {
            const { utils, writeFile } = await import('xlsx');
            const templateData = [{
                partyName: 'Sample Company',
                contactPerson: 'John Doe',
                mobileNumber: '9876543210',
                whatsappNumber: '9876543210',
                email: 'john@company.com',
                city: 'Delhi',
                state: 'Delhi',
                callDate: '2026-11-18',
                callTime: '10:00',
                duration: '15',
                machineInterest: 'Lamination Machine',
                callType: 'Sales',
                notes: 'Sample notes',
                handledBy: 'Sales Person Name',
                status: 'completed'
            }];
            const worksheet = utils.json_to_sheet(templateData);
            const workbook = utils.book_new();
            utils.book_append_sheet(workbook, worksheet, 'Template');
            writeFile(workbook, 'calling-details-template.xlsx');
        } catch (error) {
            alert('Error downloading template: ' + error.message);
        }
    };

    const filteredCalls = calls.filter(call => {
        if (call.deleted) return false;
        const matchesSearch = !searchText ||
            call.partyName.toLowerCase().includes(searchText.toLowerCase()) ||
            call.contactPerson.toLowerCase().includes(searchText.toLowerCase()) ||
            call.mobileNumber.includes(searchText);
        const matchesCity = !filterCity || call.city === filterCity;
        const matchesStatus = !filterStatus || call.status === filterStatus;
        return matchesSearch && matchesCity && matchesStatus;
    });

    const deletedCalls = calls.filter(c => c.deleted);

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, marginBottom: 4 }}>Calling Details</h1>
                <p style={{ color: 'var(--text-2)', margin: 0 }}>Track all customer phone calls • {calls.filter(c => !c.deleted).length} records</p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <button
                    className="btn"
                    onClick={() => setShowImport(!showImport)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    <Upload size={18} />
                    Import Excel
                </button>
                <button
                    className="btn"
                    onClick={handleExportExcel}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    <Download size={18} />
                    Export
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => { setEditingId(null); setShowForm(!showForm); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    <Plus size={18} />
                    New Call
                </button>
            </div>

            {showImport && (
                <div style={{ padding: 20, background: 'var(--primary-soft)', border: '1px solid var(--primary)', borderRadius: 10, marginBottom: 20 }}>
                    <h3 style={{ marginTop: 0 }}>📊 Import from Excel</h3>
                    <div style={{ marginBottom: 12 }}>
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleImportExcel}
                            style={{ marginRight: 12 }}
                        />
                    </div>
                    <button
                        className="btn"
                        onClick={downloadTemplate}
                        style={{ marginBottom: 12 }}
                    >
                        Download Template
                    </button>
                    <div>
                        <button
                            className="btn"
                            onClick={() => setShowImport(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 10, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <input
                    type="text"
                    className="input"
                    placeholder="Search party name, contact, mobile..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
                <select
                    className="input"
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                >
                    <option value="">All Cities</option>
                    {[...new Set(calls.map(c => c.city).filter(Boolean))].sort().map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
                <select
                    className="input"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="followup">Follow-up</option>
                </select>
            </div>

            {showForm && (
                <div style={{ padding: 24, background: 'var(--surface-2)', borderRadius: 12, marginBottom: 24 }}>
                    <h2 style={{ fontSize: 18, marginBottom: 20 }}>{editingId ? 'Edit Call' : 'Log a New Call'}</h2>
                    <form onSubmit={handleAddCall}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Party Name</label>
                                <input type="text" className="input" value={formData.partyName} onChange={(e) => setFormData({ ...formData, partyName: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Contact Person</label>
                                <input type="text" className="input" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Mobile</label>
                                <input type="tel" className="input" value={formData.mobileNumber} onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>WhatsApp</label>
                                <input type="tel" className="input" value={formData.whatsappNumber} onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Email</label>
                                <input type="email" className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>City</label>
                                <input type="text" className="input" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Call Date</label>
                                <input type="date" className="input" value={formData.callDate} onChange={(e) => setFormData({ ...formData, callDate: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Call Time</label>
                                <input type="time" className="input" value={formData.callTime} onChange={(e) => setFormData({ ...formData, callTime: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Duration (mins)</label>
                                <input type="text" className="input" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Machine Interest</label>
                                <input type="text" className="input" value={formData.machineInterest} onChange={(e) => setFormData({ ...formData, machineInterest: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Call Type</label>
                                <select className="input" value={formData.callType} onChange={(e) => setFormData({ ...formData, callType: e.target.value })}>
                                    <option>Sales</option>
                                    <option>Follow-up</option>
                                    <option>Support</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Handled By</label>
                                <input type="text" className="input" value={formData.handledBy} onChange={(e) => setFormData({ ...formData, handledBy: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Notes</label>
                            <textarea
                                className="input"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                style={{ minHeight: 80 }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button type="submit" className="btn btn-primary">Save</button>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setShowForm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gap: 12 }}>
                {filteredCalls.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, background: 'var(--surface-2)', borderRadius: 12 }}>
                        <p style={{ color: 'var(--text-2)', fontSize: 15 }}>No calls found</p>
                    </div>
                ) : (
                    filteredCalls.map((call) => (
                        <div key={call.id} style={{ padding: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{call.partyName}</h3>
                                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>
                                        <div>👤 {call.contactPerson} • 📱 {call.mobileNumber}</div>
                                        <div>📍 {call.city}, {call.state}</div>
                                        <div>📅 {call.callDate} at {call.callTime} ({call.duration} mins)</div>
                                        {call.machineInterest && <div>🏭 {call.machineInterest}</div>}
                                    </div>
                                    {call.notes && <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>💬 {call.notes}</p>}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="icon-btn sm"
                                        onClick={() => handleEdit(call)}
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="icon-btn sm"
                                        onClick={() => handleDelete(call.id)}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {deletedCalls.length > 0 && (
                <div style={{ marginTop: 32, padding: 20, background: 'var(--surface-2)', borderRadius: 12 }}>
                    <h3 style={{ marginTop: 0 }}>🗑️ Trash ({deletedCalls.length})</h3>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {deletedCalls.map(call => (
                            <div key={call.id} style={{ padding: 12, background: 'var(--surface-3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13 }}>{call.partyName} • {call.callDate}</span>
                                <button
                                    className="btn"
                                    onClick={() => handleRestore(call.id)}
                                    style={{ fontSize: 12, padding: '4px 8px' }}
                                >
                                    Restore
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
