import { useState, useEffect } from 'react';
import {
    FileText, Plus, Search, Download, Filter, Eye, Edit, CheckCircle,
    Clock, AlertTriangle, BookOpen, ClipboardList, AlertCircle, BarChart2,
    X, Loader
} from 'lucide-react';
import { documents } from '../services/api';

const categoryIconMap = {
    SOP: { icon: <BookOpen size={18} />, className: 'sop' },
    Template: { icon: <ClipboardList size={18} />, className: 'template' },
    Protocol: { icon: <FileText size={18} />, className: 'protocol' },
    Deviation: { icon: <AlertTriangle size={18} />, className: 'deviation' },
    CAPA: { icon: <AlertCircle size={18} />, className: 'capa' },
    Report: { icon: <BarChart2 size={18} />, className: 'report' },
};

const statusLabels = {
    approved: 'Approved',
    under_review: 'Under Review',
    pending_signature: 'Pending Signature',
    in_progress: 'In Progress',
    draft: 'Draft',
};

export default function DocumentControl({ user }) {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // New Document Form State
    const [newDoc, setNewDoc] = useState({
        title: '',
        category: 'SOP',
        department: 'Quality Control',
        description: '',
        version: '1.0'
    });

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            setLoading(true);
            const data = await documents.list();
            setDocs(data);
        } catch (error) {
            console.error('Failed to load documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newDoc.title) return;

        try {
            setCreating(true);
            await documents.create({
                ...newDoc,
                status: 'draft',
                authorId: user?.id,
                authorName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
            });
            setShowModal(false);
            setNewDoc({ title: '', category: 'SOP', department: 'Quality Control', description: '', version: '1.0' });
            loadDocuments();
        } catch (error) {
            console.error('Failed to create document:', error);
            alert('Failed to create document: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    const filtered = docs.filter((doc) => {
        const matchesSearch = (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.author_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' || (doc.category || '').toLowerCase() === activeTab.toLowerCase();
        return matchesSearch && matchesTab;
    });

    const categories = ['all', 'SOP', 'Template', 'Protocol', 'Deviation', 'CAPA', 'Report'];

    const getStatusCount = (statusList) => docs.filter(d => statusList.includes(d.status)).length;

    if (loading) return <div className="p-4 text-center">Loading documents...</div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h2>Document Control</h2>
                    <p>SOPs, protocols & quality documents with full version history</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary">
                        <Download size={16} /> Export
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> New Document
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="stat-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{docs.length}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Documents</div>
                        </div>
                        <div className="stat-card-icon blue"><FileText size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success-400)' }}>
                                {getStatusCount(['approved'])}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Approved</div>
                        </div>
                        <div className="stat-card-icon green"><CheckCircle size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning-400)' }}>
                                {getStatusCount(['under_review', 'pending_signature', 'in_progress'])}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pending Action</div>
                        </div>
                        <div className="stat-card-icon amber"><Clock size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-muted)' }}>
                                {getStatusCount(['draft'])}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Drafts</div>
                        </div>
                        <div className="stat-card-icon red"><Edit size={18} /></div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        className={`tab ${activeTab === cat.toLowerCase() || (activeTab === 'all' && cat === 'all') ? 'active' : ''}`}
                        onClick={() => setActiveTab(cat === 'all' ? 'all' : cat.toLowerCase())}
                    >
                        {cat}
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
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Document Grid */}
            <div className="doc-grid">
                {filtered.length > 0 ? (
                    filtered.map((doc) => {
                        const catConfig = categoryIconMap[doc.category] || { icon: <FileText size={18} />, className: 'sop' };
                        return (
                            <div key={doc.id} className="doc-card">
                                <div className="doc-card-header">
                                    <div className={`doc-card-icon ${catConfig.className}`}>
                                        {catConfig.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="doc-card-title">{doc.title}</div>
                                        <div className="doc-card-meta">
                                            <span>v{doc.version}</span>
                                            <span>{doc.department}</span>
                                            <span>{doc.category}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                    <div>Author: <strong style={{ color: 'var(--text-secondary)' }}>{doc.author_name}</strong></div>
                                    {doc.approved_by_name && (
                                        <div>Approved by: <strong style={{ color: 'var(--success-400)' }}>{doc.approved_by_name}</strong></div>
                                    )}
                                    <div>Updated: {new Date(doc.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                </div>

                                <div className="doc-card-footer">
                                    <span className={`status-badge ${doc.status}`}>
                                        <span className="status-dot" />
                                        {statusLabels[doc.status] || doc.status}
                                    </span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-ghost btn-sm" title="View">
                                            <Eye size={14} />
                                        </button>
                                        <button className="btn btn-ghost btn-sm" title="Edit">
                                            <Edit size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No documents found. Create one to get started.
                    </div>
                )}
            </div>

            {/* New Document Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Document</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Document Title</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g., SOP-QC-015: Dissolution Testing"
                                    value={newDoc.title}
                                    onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-input"
                                    value={newDoc.category}
                                    onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                                >
                                    <option>SOP</option>
                                    <option>Template</option>
                                    <option>Protocol</option>
                                    <option>Report</option>
                                    <option>Deviation</option>
                                    <option>CAPA</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select
                                    className="form-input"
                                    value={newDoc.department}
                                    onChange={(e) => setNewDoc({ ...newDoc, department: e.target.value })}
                                >
                                    <option>Quality Control</option>
                                    <option>Quality Assurance</option>
                                    <option>R&D</option>
                                    <option>Manufacturing</option>
                                    <option>Lab Operations</option>
                                    <option>Regulatory Affairs</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="Brief description of the document's purpose..."
                                    value={newDoc.description}
                                    onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                                {creating ? 'Creating...' : 'Create Document'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
