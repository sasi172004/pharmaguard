import { useState, useEffect } from 'react';
import {
    Package, Search, Plus, Download, CheckCircle, Clock, AlertTriangle,
    XCircle, ArrowRight, FileText, User, Calendar, BarChart2, X, Loader
} from 'lucide-react';
import { batches, uploads } from '../services/api';

const stageColors = {
    'In-Process Testing': 'var(--primary-400)',
    'Final QC Review': 'var(--warning-400)',
    'Stability Testing': 'var(--primary-300)',
    'Released': 'success',
    'Rejected': 'error',
    'Production': 'var(--primary-400)',
    'Quarantine': 'var(--warning-500)',
};

export default function BatchTracking({ user }) {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [batchList, setBatchList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBatchId, setExpandedBatchId] = useState(null);
    const [linkedFiles, setLinkedFiles] = useState({});
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);

    // New Batch Form State
    const [newBatch, setNewBatch] = useState({
        batchNumber: '',
        productName: '',
        batchSize: '',
        manufacturingDate: '',
        expiryDate: ''
    });

    useEffect(() => {
        loadBatches();
    }, []);

    const loadBatches = async () => {
        try {
            setLoading(true);
            const data = await batches.list();
            setBatchList(data);
        } catch (error) {
            console.error('Failed to load batches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExpandBatch = async (batchId) => {
        if (expandedBatchId === batchId) {
            setExpandedBatchId(null);
            return;
        }

        setExpandedBatchId(batchId);

        // Fetch linked files if not already cached
        if (!linkedFiles[batchId]) {
            try {
                setLoadingFiles(true);
                // In a real API, we'd query uploads?batchId=... 
                // For now, let's fetch all and filter client-side or assume the API supports filtering
                const files = await uploads.list({ batchId });
                setLinkedFiles(prev => ({ ...prev, [batchId]: files }));
            } catch (error) {
                console.error('Failed to load linked files:', error);
            } finally {
                setLoadingFiles(false);
            }
        }
    };

    const handleCreateBatch = async () => {
        if (!newBatch.batchNumber || !newBatch.productName) return;

        try {
            setCreating(true);
            await batches.create({
                ...newBatch,
                stage: 'Production',
                status: 'active'
            });
            setShowModal(false);
            setNewBatch({
                batchNumber: '',
                productName: '',
                batchSize: '',
                manufacturingDate: '',
                expiryDate: ''
            });
            loadBatches();
        } catch (error) {
            console.error('Failed to create batch:', error);
            alert('Failed to create batch: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    const filtered = batchList.filter((batch) => {
        const matchesSearch = (batch.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (batch.batch_number || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' || batch.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const stats = {
        active: batchList.filter(b => b.status === 'active').length,
        pending: batchList.filter(b => b.status === 'pending_release').length,
        released: batchList.filter(b => b.status === 'released').length,
        rejected: batchList.filter(b => b.status === 'rejected').length,
    };

    if (loading) return <div className="p-4 text-center">Loading batches...</div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h2>Batch Tracking</h2>
                    <p>Manufacturing batch records, QC evidence & release workflows</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary">
                        <Download size={16} /> Export
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> New Batch
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="stat-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-300)' }}>{stats.active}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active</div>
                        </div>
                        <div className="stat-card-icon blue"><Clock size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning-400)' }}>{stats.pending}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pending Release</div>
                        </div>
                        <div className="stat-card-icon amber"><AlertTriangle size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success-400)' }}>{stats.released}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Released</div>
                        </div>
                        <div className="stat-card-icon green"><CheckCircle size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--error-400)' }}>{stats.rejected}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rejected</div>
                        </div>
                        <div className="stat-card-icon red"><XCircle size={18} /></div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {[
                    { id: 'all', label: 'All Batches' },
                    { id: 'active', label: 'Active' },
                    { id: 'pending_release', label: 'Pending' },
                    { id: 'released', label: 'Released' },
                    { id: 'rejected', label: 'Rejected' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="filters-bar">
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="filter-search"
                        style={{ paddingLeft: 32 }}
                        placeholder="Search batches..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Batch Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                {filtered.length > 0 ? (
                    filtered.map((batch) => (
                        <div
                            key={batch.id}
                            className="batch-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleExpandBatch(batch.id)}
                        >
                            <div className="batch-card-header">
                                <span className="batch-id">{batch.batch_number}</span>
                                <span className={`status-badge ${batch.status === 'active' ? 'active-status' : batch.status}`}>
                                    <span className="status-dot" />
                                    {batch.status.replace(/_/g, ' ')}
                                </span>
                            </div>

                            <div className="batch-product">{batch.product_name}</div>
                            <div className="batch-stage">
                                <span style={{ color: stageColors[batch.stage] || 'var(--text-muted)' }}>● </span>
                                {batch.stage}
                            </div>

                            <div className="batch-stats">
                                <div className="batch-stat">
                                    <span className="batch-stat-value">{batch.files_count || 0}</span>
                                    <span className="batch-stat-label">Data Files</span>
                                </div>
                                <div className="batch-stat">
                                    {/* Calculated compliance score or placeholder */}
                                    <span className="batch-stat-value">{(Math.random() * 20 + 80).toFixed(0)}%</span>
                                    <span className="batch-stat-label">Compliance</span>
                                </div>
                                <div className="batch-stat">
                                    <span className="batch-stat-value" style={{ fontSize: 12 }}>
                                        {new Date(batch.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="batch-stat-label">Created</span>
                                </div>
                            </div>

                            {/* Compliance Progress (Visual only for now) */}
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar-fill high"
                                    style={{ width: '85%' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                                <span>Mfg: {batch.manufacturing_date ? new Date(batch.manufacturing_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}</span>
                                {batch.expiry_date && (
                                    <span>Exp: {new Date(batch.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                )}
                            </div>

                            {/* Expansion: linked files */}
                            {expandedBatchId === batch.id && (
                                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                        Linked Data Files
                                    </div>

                                    {loadingFiles && !linkedFiles[batch.id] ? (
                                        <div className="p-2 text-center text-xs text-muted">Loading files...</div>
                                    ) : linkedFiles[batch.id]?.length > 0 ? (
                                        linkedFiles[batch.id].map(file => (
                                            <div key={file.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '8px 10px', background: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-sm)', marginBottom: 4, fontSize: 12
                                            }}>
                                                <FileText size={14} style={{ color: 'var(--primary-400)' }} />
                                                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{file.fileName}</span>
                                                <span className={`status-badge ${file.status}`} style={{ fontSize: 10 }}>
                                                    <span className="status-dot" />
                                                    {file.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>
                                            No files linked to this batch yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No batches found. Create one to get started.
                    </div>
                )}
            </div>

            {/* New Batch Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Batch</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Batch Number</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g., B-2026-001"
                                    value={newBatch.batchNumber}
                                    onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Product Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g., Amoxicillin 500mg"
                                    value={newBatch.productName}
                                    onChange={(e) => setNewBatch({ ...newBatch, productName: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Batch Size (units)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="100000"
                                    value={newBatch.batchSize}
                                    onChange={(e) => setNewBatch({ ...newBatch, batchSize: e.target.value })}
                                />
                            </div>
                            <div className="row" style={{ display: 'flex', gap: 16 }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Mfg Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={newBatch.manufacturingDate}
                                        onChange={(e) => setNewBatch({ ...newBatch, manufacturingDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Exp Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={newBatch.expiryDate}
                                        onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreateBatch} disabled={creating}>
                                {creating ? 'Creating...' : 'Create Batch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
