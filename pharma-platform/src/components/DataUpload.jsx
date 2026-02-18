import { useState, useEffect } from 'react';
import {
    Upload, FileUp, Filter, Search, Download, CheckCircle,
    AlertTriangle, Clock, Hash, HardDrive, Calendar, User, FileText, X
} from 'lucide-react';
import { uploads, instruments } from '../services/api';

export default function DataUpload() {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [instrumentFilter, setInstrumentFilter] = useState('all');
    const [uploadList, setUploadList] = useState([]);
    const [instrumentList, setInstrumentList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);

    // Fetch data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [uploadsData, instrumentsData] = await Promise.all([
                uploads.list(),
                instruments.list()
            ]);
            setUploadList(uploadsData);
            setInstrumentList(instrumentsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        setUploading(true);
        setUploadStatus({ type: 'info', message: `Uploading ${file.name}...` });

        try {
            // In a real app, you'd select instrument/batch first. 
            // For now we pick the first available instrument or default
            const instrumentId = instrumentList[0]?.id;

            await uploads.upload(file, {
                instrumentId,
                notes: 'Manual upload via web interface'
            });

            setUploadStatus({ type: 'success', message: 'File uploaded & hashed successfully!' });
            loadData(); // Refresh list
            setTimeout(() => setUploadStatus(null), 3000);
        } catch (error) {
            setUploadStatus({ type: 'error', message: error.message || 'Upload failed' });
        } finally {
            setUploading(false);
        }
    };

    // Drag and drop handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files);
        }
    };

    // Filter logic
    const filteredUploads = uploadList.filter((upload) => {
        const matchesSearch = (upload.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (upload.uploadedBy || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesInstrument = instrumentFilter === 'all' || (upload.instrumentName || '').includes(instrumentFilter);
        const matchesTab = activeTab === 'all' ||
            (activeTab === 'verified' && upload.status === 'verified') ||
            (activeTab === 'pending' && upload.status === 'pending_review') ||
            (activeTab === 'flagged' && upload.status === 'flagged');
        return matchesSearch && matchesInstrument && matchesTab;
    });

    const stats = {
        total: uploadList.length,
        verified: uploadList.filter(u => u.status === 'verified').length,
        pending: uploadList.filter(u => u.status === 'pending_review').length,
        flagged: uploadList.filter(u => u.status === 'flagged').length,
    };

    if (loading) return <div className="p-4 text-center">Loading data...</div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h2>Instrument Data Management</h2>
                    <p>Auto-captured files with SHA-256 integrity verification</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary">
                        <Download size={16} /> Export Log
                    </button>
                    <button className="btn btn-primary" onClick={() => document.getElementById('file-upload').click()}>
                        <FileUp size={16} /> Manual Upload
                    </button>
                    <input
                        id="file-upload"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                </div>
            </div>

            {/* Upload Status Notification */}
            {uploadStatus && (
                <div className={`status-badge ${uploadStatus.type === 'error' ? 'flagged' : 'verified'}`}
                    style={{ padding: '12px 20px', marginBottom: 20, width: '100%', justifyContent: 'center', fontSize: 14 }}>
                    {uploadStatus.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                    {uploadStatus.message}
                </div>
            )}

            {/* Upload Zone */}
            <div
                className={`upload-zone ${dragActive ? 'active' : ''}`}
                style={{ marginBottom: 24, borderColor: dragActive ? 'var(--primary-400)' : '' }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {uploading ? (
                    <div style={{ textAlign: 'center' }}>
                        <div className="login-spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--primary-400)', borderWidth: 3 }}></div>
                        <p style={{ marginTop: 16 }}>Processing file integrity check...</p>
                    </div>
                ) : (
                    <>
                        <div className="upload-zone-icon">
                            <Upload size={24} />
                        </div>
                        <h3>Drop instrument files here or <span className="highlight" onClick={() => document.getElementById('file-upload').click()} style={{ cursor: 'pointer' }}>browse</span></h3>
                        <p>Supports .cdf, .csv, .txt, .raw, .xlsx • Max 50MB per file</p>
                        <p style={{ marginTop: 8, fontSize: 11, color: 'var(--primary-400)' }}>
                            Files are automatically hashed (SHA-256) and stored in immutable storage
                        </p>
                    </>
                )}
            </div>

            {/* Mini Stats */}
            <div className="stat-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.total}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Files</div>
                        </div>
                        <div className="stat-card-icon blue"><HardDrive size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success-400)' }}>{stats.verified}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Verified</div>
                        </div>
                        <div className="stat-card-icon green"><CheckCircle size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning-400)' }}>{stats.pending}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pending Review</div>
                        </div>
                        <div className="stat-card-icon amber"><Clock size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--error-400)' }}>{stats.flagged}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Flagged</div>
                        </div>
                        <div className="stat-card-icon red"><AlertTriangle size={18} /></div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {['all', 'verified', 'pending', 'flagged'].map((tab) => (
                    <button
                        key={tab}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="filter-search"
                        style={{ paddingLeft: 32 }}
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select className="filter-select" value={instrumentFilter} onChange={(e) => setInstrumentFilter(e.target.value)}>
                    <option value="all">All Instruments</option>
                    {instrumentList.map(inst => (
                        <option key={inst.id} value={inst.name}>{inst.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>File Name</th>
                            <th>Instrument</th>
                            <th>Batch</th>
                            <th>Uploaded By</th>
                            <th>Size</th>
                            <th>Time</th>
                            <th>Hash (SHA-256)</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUploads.length > 0 ? (
                            filteredUploads.map((upload) => (
                                <tr key={upload.id}>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <FileText size={14} style={{ color: 'var(--primary-400)' }} />
                                            {upload.fileName}
                                        </div>
                                    </td>
                                    <td>{upload.instrumentName || 'Unknown'}</td>
                                    <td>
                                        {upload.batchId ? (
                                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary-400)' }}>
                                                {upload.batchId.substring(0, 8)}...
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <User size={12} />
                                            {upload.uploadedBy}
                                        </div>
                                    </td>
                                    <td>{(upload.size / 1024).toFixed(1)} KB</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={12} />
                                            {new Date(upload.uploadedAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td>
                                        <span title={upload.hash} style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', cursor: 'help' }}>
                                            {upload.hash ? upload.hash.substring(0, 8) + '...' : 'Pending'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${upload.status}`}>
                                            <span className="status-dot" />
                                            {upload.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                    No files found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Instrument Status */}
            <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Connected Instruments</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {instrumentList.map((inst) => (
                        <div key={inst.id} className="card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{inst.name}</span>
                                <span className={`status-badge ${inst.status}`}>
                                    <span className="status-dot" />
                                    {inst.status}
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span>Type: {inst.type}</span>
                                <span>Serial: {inst.serialNumber || 'N/A'}</span>
                                <span>Location: {inst.location}</span>
                                <span style={{ color: inst.nextCalibration && new Date(inst.nextCalibration) < new Date() ? 'var(--error-400)' : 'var(--text-muted)' }}>
                                    Next Calibration: {inst.nextCalibration ? new Date(inst.nextCalibration).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
