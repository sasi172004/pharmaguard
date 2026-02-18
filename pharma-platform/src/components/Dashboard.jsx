import { useState, useEffect } from 'react';
import {
    Upload, ShieldCheck, FileText, Package, TrendingUp, TrendingDown,
    AlertTriangle, CheckCircle, Clock, XCircle, Activity, Eye, Loader
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { dashboard, audit } from '../services/api';
import {
    uploadTrendData, complianceTrendData,
    instrumentActivityData, complianceChecklist
} from '../data/mockData';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="label">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="value" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const COMPLIANCE_COLORS = ['#00bcd4', '#1e2642'];

function ComplianceRing({ score }) {
    const data = [
        { name: 'Score', value: score },
        { name: 'Remaining', value: 100 - score },
    ];

    return (
        <div className="compliance-ring">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={56}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                    >
                        {data.map((entry, index) => (
                            <Cell key={index} fill={COMPLIANCE_COLORS[index]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="compliance-ring-value">
                <span className="compliance-ring-number">{score}%</span>
                <span className="compliance-ring-label">Score</span>
            </div>
        </div>
    );
}

function getChecklistIcon(status) {
    switch (status) {
        case 'complete': return <CheckCircle size={14} />;
        case 'in_progress': return <Clock size={14} />;
        case 'warning': return <AlertTriangle size={14} />;
        default: return <Clock size={14} />;
    }
}

function getActivityIcon(action) {
    const a = (action || '').toLowerCase();
    if (a.includes('upload') || a.includes('file')) return { className: 'upload', icon: <Upload size={14} /> };
    if (a.includes('approv') || a.includes('sign') || a.includes('login')) return { className: 'approve', icon: <CheckCircle size={14} /> };
    if (a.includes('edit') || a.includes('update') || a.includes('change') || a.includes('create')) return { className: 'edit', icon: <FileText size={14} /> };
    if (a.includes('anomaly') || a.includes('fail') || a.includes('alert') || a.includes('flag')) return { className: 'alert', icon: <AlertTriangle size={14} /> };
    return { className: 'upload', icon: <Activity size={14} /> };
}

function formatTime(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function Dashboard({ user }) {
    const [stats, setStats] = useState(null);
    const [auditEvents, setAuditEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchDashboard() {
            try {
                setLoading(true);
                const [dashData, auditData] = await Promise.all([
                    dashboard.summary().catch(() => null),
                    audit.list({ limit: 8 }).catch(() => ({ data: [] })),
                ]);
                setStats(dashData);
                setAuditEvents(auditData.data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboard();
    }, []);

    // Compute metrics from live data or fallbacks
    const m = {
        totalUploads: stats ? parseInt(stats.uploads?.total || 0) : 0,
        verifiedUploads: stats ? parseInt(stats.uploads?.verified || 0) : 0,
        flaggedUploads: stats ? parseInt(stats.uploads?.flagged || 0) : 0,
        totalDocuments: stats ? parseInt(stats.documents?.total || 0) : 0,
        approvedDocs: stats ? parseInt(stats.documents?.approved || 0) : 0,
        draftDocs: stats ? parseInt(stats.documents?.draft || 0) : 0,
        reviewDocs: stats ? parseInt(stats.documents?.under_review || 0) : 0,
        totalBatches: stats ? parseInt(stats.batches?.total || 0) : 0,
        activeBatches: stats ? parseInt(stats.batches?.active || 0) : 0,
        releasedBatches: stats ? parseInt(stats.batches?.released || 0) : 0,
        pendingRelease: stats ? parseInt(stats.batches?.pending_release || 0) : 0,
        auditEvents30d: stats ? parseInt(stats.audit?.total_30d || 0) : 0,
        criticalEvents: stats ? parseInt(stats.audit?.critical_30d || 0) : 0,
    };

    // Calculate compliance score based on real data
    const complianceScore = m.totalBatches > 0
        ? Math.round(((m.releasedBatches + m.activeBatches) / m.totalBatches) * 100)
        : 94;

    const recentFiles = stats?.recentUploads || [];

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '60vh', color: 'var(--text-secondary)'
            }}>
                <Loader size={24} className="spin" style={{ marginRight: 12 }} />
                Loading dashboard data from Neon...
            </div>
        );
    }

    return (
        <div>
            {/* Stats */}
            <div className="stat-grid">
                <div className="stat-card animate-fade-in delay-1" style={{ opacity: 0 }}>
                    <div className="stat-card-header">
                        <div>
                            <div className="stat-card-value">{m.totalUploads}</div>
                            <div className="stat-card-label">Data Records</div>
                        </div>
                        <div className="stat-card-icon blue"><Upload size={20} /></div>
                    </div>
                    <div className="stat-card-trend up">
                        <TrendingUp size={12} />
                        {m.verifiedUploads} verified
                    </div>
                </div>

                <div className="stat-card animate-fade-in delay-2" style={{ opacity: 0 }}>
                    <div className="stat-card-header">
                        <div>
                            <div className="stat-card-value">{m.auditEvents30d}</div>
                            <div className="stat-card-label">Audit Events (30d)</div>
                        </div>
                        <div className="stat-card-icon green"><ShieldCheck size={20} /></div>
                    </div>
                    <div className="stat-card-trend up">
                        <ShieldCheck size={12} />
                        {m.criticalEvents} critical
                    </div>
                </div>

                <div className="stat-card animate-fade-in delay-3" style={{ opacity: 0 }}>
                    <div className="stat-card-header">
                        <div>
                            <div className="stat-card-value">{m.totalDocuments}</div>
                            <div className="stat-card-label">Active Documents</div>
                        </div>
                        <div className="stat-card-icon amber"><FileText size={20} /></div>
                    </div>
                    <div className="stat-card-trend up" style={{ background: 'rgba(255, 152, 0, 0.1)', color: 'var(--warning-400)' }}>
                        <Eye size={12} />
                        {m.reviewDocs} under review
                    </div>
                </div>

                <div className="stat-card animate-fade-in delay-4" style={{ opacity: 0 }}>
                    <div className="stat-card-header">
                        <div>
                            <div className="stat-card-value">{complianceScore}%</div>
                            <div className="stat-card-label">Compliance Score</div>
                        </div>
                        <div className="stat-card-icon purple"><Activity size={20} /></div>
                    </div>
                    <div className="stat-card-trend up">
                        <TrendingUp size={12} />
                        {m.totalBatches} batches tracked
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="charts-grid">
                <div className="card animate-fade-in delay-3" style={{ opacity: 0 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Data Upload Activity</div>
                            <div className="card-subtitle">Weekly instrument data captures</div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={uploadTrendData}>
                            <defs>
                                <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00bcd4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00bcd4" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="verifiedGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="uploads" name="Total Uploads" stroke="#00bcd4" fill="url(#uploadGradient)" strokeWidth={2} />
                            <Area type="monotone" dataKey="verified" name="Verified" stroke="#4caf50" fill="url(#verifiedGradient)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card animate-fade-in delay-4" style={{ opacity: 0 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Compliance Status</div>
                            <div className="card-subtitle">Overall regulatory readiness</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <ComplianceRing score={complianceScore} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success-400)' }}>{m.activeBatches}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Batches</div>
                        </div>
                        <div style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-300)' }}>{m.releasedBatches}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Released</div>
                        </div>
                        <div style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warning-400)' }}>{m.reviewDocs}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Under Review</div>
                        </div>
                        <div style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--error-400)' }}>{m.pendingRelease}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending Release</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="charts-grid-equal">
                <div className="card animate-fade-in delay-5" style={{ opacity: 0 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Instrument Activity</div>
                            <div className="card-subtitle">Upload distribution by instrument type</div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={instrumentActivityData} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="uploads" name="Uploads" fill="#00bcd4" radius={[4, 4, 0, 0]}>
                                {instrumentActivityData.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={`hsl(${180 + index * 15}, 80%, ${50 + index * 5}%)`}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card animate-fade-in delay-6" style={{ opacity: 0 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Compliance Checklist</div>
                            <div className="card-subtitle">Regulatory requirements status</div>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {complianceChecklist.filter(c => c.status === 'complete').length}/{complianceChecklist.length} Complete
                        </span>
                    </div>
                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                        {complianceChecklist.map((item) => (
                            <div key={item.id} className="checklist-item">
                                <div className={`checklist-icon ${item.status}`}>
                                    {getChecklistIcon(item.status)}
                                </div>
                                <span className="checklist-text">{item.item}</span>
                                <span className="checklist-tag">{item.category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="charts-grid">
                {/* Recent Uploads Table — LIVE DATA */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="card-header" style={{ padding: '16px 20px' }}>
                        <div>
                            <div className="card-title">Recent Uploads</div>
                            <div className="card-subtitle">
                                {recentFiles.length > 0 ? 'Live data from Neon DB' : 'No uploads yet'}
                            </div>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>File Name</th>
                                    <th>Instrument</th>
                                    <th>Uploaded By</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentFiles.length > 0 ? recentFiles.map((upload, i) => (
                                    <tr key={i}>
                                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                            {upload.original_filename}
                                        </td>
                                        <td>{upload.instrument_name || '—'}</td>
                                        <td>{upload.uploaded_by_name}</td>
                                        <td>
                                            <span className={`status-badge ${upload.status}`}>
                                                <span className="status-dot" />
                                                {upload.status?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                                            No files uploaded yet. Go to Data Upload to begin.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Activity Feed — LIVE AUDIT DATA */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Activity Feed</div>
                            <div className="card-subtitle">
                                {auditEvents.length > 0 ? 'Live audit trail from Neon' : 'Audit-logged events'}
                            </div>
                        </div>
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {auditEvents.length > 0 ? auditEvents.map((event) => {
                            const actIcon = getActivityIcon(event.action);
                            return (
                                <div key={event.id} className="activity-item">
                                    <div className={`activity-icon ${actIcon.className}`}>
                                        {actIcon.icon}
                                    </div>
                                    <div className="activity-content">
                                        <div className="activity-title">
                                            <strong>{event.user_name || event.user_email}</strong> — {event.action?.replace(/_/g, ' ')}
                                        </div>
                                        <div className="activity-meta">
                                            {event.description} • {formatTime(event.created_at)}
                                        </div>
                                    </div>
                                    <span className={`status-badge ${event.severity}`} style={{ fontSize: 10, alignSelf: 'flex-start' }}>
                                        {event.severity}
                                    </span>
                                </div>
                            );
                        }) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                                No audit events yet. Actions will be logged here.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
