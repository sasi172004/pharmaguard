import { useState, useEffect } from 'react';
import {
    Search, Download, Filter, Upload, CheckCircle, AlertTriangle,
    FileText, Shield, UserCheck, Activity, Clock, ChevronDown, Eye, Loader
} from 'lucide-react';
import { audit } from '../services/api';

const categoryIcons = {
    data_capture: { icon: <Upload size={14} />, className: 'upload' },
    integrity: { icon: <Shield size={14} />, className: 'approve' },
    document_control: { icon: <FileText size={14} />, className: 'edit' },
    access_control: { icon: <UserCheck size={14} />, className: 'alert' },
    batch_tracking: { icon: <Activity size={14} />, className: 'upload' },
    signature: { icon: <CheckCircle size={14} />, className: 'signature' },
    instrument: { icon: <AlertTriangle size={14} />, className: 'edit' },
    reporting: { icon: <FileText size={14} />, className: 'approve' },
};

export default function AuditTrail() {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            const data = await audit.list();
            setEvents(data);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyChain = async () => {
        try {
            setVerifying(true);
            const result = await audit.verifyChain();
            setVerificationResult(result);
            setTimeout(() => setVerificationResult(null), 5000);
        } catch (error) {
            console.error('Verification failed:', error);
        } finally {
            setVerifying(false);
        }
    };

    const filtered = events.filter((event) => {
        const matchesSearch = (event.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.resource_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
        const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
        return matchesSearch && matchesCategory && matchesSeverity;
    });

    const stats = {
        total: events.length,
        critical: events.filter(e => e.severity === 'critical').length,
        warning: events.filter(e => e.severity === 'warning').length,
        info: events.filter(e => e.severity === 'info').length,
    };

    if (loading) return <div className="p-4 text-center">Loading audit records...</div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h2>Audit Trail</h2>
                    <p>Tamper-evident, immutable activity log — 21 CFR Part 11 compliant</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary" onClick={handleVerifyChain} disabled={verifying}>
                        {verifying ? <Loader className="spin" size={16} /> : <Shield size={16} />}
                        {verifying ? 'Verifying Chain...' : 'Verify Integrity'}
                    </button>
                    <button className="btn btn-primary" onClick={loadAuditLogs}>
                        <Filter size={16} /> Refresh Log
                    </button>
                </div>
            </div>

            {/* Verification Result Notification */}
            {verificationResult && (
                <div className={`status-badge ${verificationResult.tampered ? 'flagged' : 'verified'}`}
                    style={{ padding: '12px 20px', marginBottom: 20, width: '100%', justifyContent: 'center', fontSize: 14 }}>
                    {verificationResult.tampered ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                    {verificationResult.tampered ? 'Warning: Chain tampering detected!' : 'Success: All records verified intact via SHA-256 hash chain.'}
                    {!verificationResult.tampered && <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.8 }}>({verificationResult.verifiedCount} records checked)</span>}
                </div>
            )}

            {/* Stats */}
            <div className="stat-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.total}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Events</div>
                        </div>
                        <div className="stat-card-icon blue"><Activity size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--error-400)' }}>{stats.critical}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Critical Events</div>
                        </div>
                        <div className="stat-card-icon red"><AlertTriangle size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning-400)' }}>{stats.warning}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Warnings</div>
                        </div>
                        <div className="stat-card-icon amber"><Clock size={18} /></div>
                    </div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-300)' }}>{stats.info}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Informational</div>
                        </div>
                        <div className="stat-card-icon blue"><CheckCircle size={18} /></div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="filter-search"
                        style={{ paddingLeft: 32 }}
                        placeholder="Search events, users, targets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="all">All Categories</option>
                    <option value="data_capture">Data Capture</option>
                    <option value="integrity">Integrity</option>
                    <option value="document_control">Document Control</option>
                    <option value="access_control">Access Control</option>
                    <option value="batch_tracking">Batch Tracking</option>
                    <option value="signature">E-Signature</option>
                    <option value="instrument">Instrument</option>
                    <option value="reporting">Reporting</option>
                </select>
                <select className="filter-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                    <option value="all">All Severity</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                </select>
            </div>

            {/* Audit Trail Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filtered.map((event) => {
                    const catConfig = categoryIcons[event.category] || { icon: <Activity size={14} />, className: 'upload' };
                    const isExpanded = expandedId === event.id;

                    return (
                        <div
                            key={event.id}
                            className="card"
                            style={{
                                padding: '14px 18px',
                                cursor: 'pointer',
                                borderLeft: `3px solid ${event.severity === 'critical' ? 'var(--error-500)' : event.severity === 'warning' ? 'var(--warning-500)' : 'var(--border-subtle)'}`,
                            }}
                            onClick={() => setExpandedId(isExpanded ? null : event.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div className={`activity-icon ${catConfig.className}`}>
                                    {catConfig.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{event.action}</span>
                                        <span className={`status-badge ${event.severity}`} style={{ fontSize: 10 }}>
                                            {event.severity}
                                        </span>
                                        <span className="checklist-tag">{(event.category || '').replace(/_/g, ' ')}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        <strong style={{ color: 'var(--text-accent)' }}>{event.user_name || event.user_email}</strong> → {event.resource_name || event.description}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {new Date(event.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                        {new Date(event.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </div>
                                </div>
                                <ChevronDown
                                    size={16}
                                    style={{
                                        color: 'var(--text-muted)',
                                        transition: 'transform 0.2s',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    }}
                                />
                            </div>

                            {isExpanded && (
                                <div style={{
                                    marginTop: 12,
                                    padding: '12px 16px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 12,
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.6,
                                    borderLeft: '2px solid var(--primary-700)',
                                }}>
                                    <div style={{ marginBottom: 6 }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>Details:</strong> {event.description}
                                    </div>
                                    <div style={{ marginBottom: 6, fontFamily: 'monospace', fontSize: 11 }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>Hash:</strong> {event.entry_hash}
                                    </div>
                                    <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-muted)' }}>
                                        <span>User: <strong>{event.user_email} ({event.user_role})</strong></span>
                                        <span>IP: <strong>{event.ip_address}</strong></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
