import { useState, useEffect } from 'react';
import {
    Download, FileText, Calendar, CheckCircle, AlertTriangle, BarChart2,
    PieChart as PieChartIcon, TrendingUp, Shield, Printer, Mail, Loader
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { reports } from '../services/api';
import { complianceTrendData, complianceChecklist } from '../data/mockData';

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

const reportTemplates = [
    { id: 'RPT-001', name: 'Monthly Compliance Summary', description: 'Comprehensive overview of compliance metrics, audit trail activity, and data integrity status', frequency: 'Monthly', lastGenerated: '2026-01-31', icon: <BarChart2 size={20} />, color: 'var(--primary-400)' },
    { id: 'RPT-002', name: 'Audit Trail Report', description: 'Complete chronological audit log with user actions, timestamps, and integrity hashes', frequency: 'On-demand', lastGenerated: '2026-02-15', icon: <Shield size={20} />, color: 'var(--success-400)' },
    { id: 'RPT-003', name: 'Data Integrity Assessment', description: 'ALCOA+ compliance check covering attributable, legible, contemporaneous, original, and accurate criteria', frequency: 'Quarterly', lastGenerated: '2025-12-31', icon: <CheckCircle size={20} />, color: '#ab47bc' },
    { id: 'RPT-004', name: '21 CFR Part 11 Readiness', description: 'Regulatory readiness report addressing electronic records, signatures, and system controls', frequency: 'Quarterly', lastGenerated: '2025-12-31', icon: <FileText size={20} />, color: 'var(--warning-400)' },
    { id: 'RPT-005', name: 'Instrument Validation Status', description: 'IQ/OQ/PQ status, calibration records, and maintenance schedules for all connected instruments', frequency: 'Monthly', lastGenerated: '2026-01-31', icon: <AlertTriangle size={20} />, color: 'var(--error-400)' },
    { id: 'RPT-006', name: 'Batch Release Summary', description: 'Batch-by-batch QC results, deviations, and release decisions with supporting evidence', frequency: 'Per batch', lastGenerated: '2026-02-16', icon: <PieChartIcon size={20} />, color: 'var(--primary-300)' },
];

const complianceCategoryData = [
    { name: 'Data Integrity', value: 96, fill: '#00bcd4' },
    { name: 'Audit Trails', value: 98, fill: '#4caf50' },
    { name: 'Access Control', value: 92, fill: '#ff9800' },
    { name: 'E-Signatures', value: 88, fill: '#ab47bc' },
    { name: 'Doc Control', value: 94, fill: '#42a5f5' },
];

export default function ComplianceReports({ user }) {
    const [activeTab, setActiveTab] = useState('reports');
    const [reportHistory, setReportHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(null);

    useEffect(() => {
        if (activeTab === 'history') {
            loadReportHistory();
        }
    }, [activeTab]);

    const loadReportHistory = async () => {
        try {
            setLoading(true);
            const data = await reports.list();
            setReportHistory(data);
        } catch (error) {
            console.error('Failed to load report history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async (template) => {
        try {
            setGenerating(template.id);
            await reports.generate({
                templateId: template.id,
                name: template.name,
                type: template.name.split(' ')[0], // simple type extraction
                format: 'PDF',
                generatedBy: user ? `${user.firstName} ${user.lastName}` : 'System'
            });
            // Switch to history tab to show the new report
            setActiveTab('history');
        } catch (error) {
            console.error('Failed to generate report:', error);
            alert('Failed to generate report: ' + error.message);
        } finally {
            setGenerating(null);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h2>Compliance Reports</h2>
                    <p>Audit-ready reports, analytics & regulatory compliance metrics</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary">
                        <Calendar size={16} /> Schedule
                    </button>
                    <button className="btn btn-primary">
                        <Download size={16} /> Generate Custom
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {[
                    { id: 'reports', label: 'Report Templates' },
                    { id: 'analytics', label: 'Compliance Analytics' },
                    { id: 'history', label: 'Report History' },
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

            {activeTab === 'reports' && (
                <>
                    {/* Report Templates Grid */}
                    <div className="doc-grid">
                        {reportTemplates.map((report) => (
                            <div key={report.id} className="doc-card">
                                <div className="doc-card-header">
                                    <div className="doc-card-icon" style={{ background: `${report.color}15`, color: report.color }}>
                                        {report.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="doc-card-title">{report.name}</div>
                                        <div className="doc-card-meta">
                                            <span>{report.frequency}</span>
                                            <span>Last: {new Date(report.lastGenerated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
                                    {report.description}
                                </p>

                                <div className="doc-card-footer">
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleGenerateReport(report)}
                                            disabled={generating === report.id}
                                        >
                                            {generating === report.id ? <Loader className="spin" size={12} /> : <Download size={12} />}
                                            {generating === report.id ? ' Generating...' : ' Generate'}
                                        </button>
                                        <button className="btn btn-ghost btn-sm" title="Print">
                                            <Printer size={14} />
                                        </button>
                                        <button className="btn btn-ghost btn-sm" title="Email">
                                            <Mail size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'analytics' && (
                <>
                    {/* Compliance Score Trend */}
                    <div className="charts-grid-equal">
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Compliance Score Trend</div>
                                    <div className="card-subtitle">6-month regulatory readiness trend</div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={complianceTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                                    <YAxis domain={[70, 100]} stroke="var(--text-muted)" fontSize={11} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        name="Compliance %"
                                        stroke="#00bcd4"
                                        strokeWidth={3}
                                        dot={{ fill: '#00bcd4', strokeWidth: 2, r: 5 }}
                                        activeDot={{ r: 7, strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Compliance by Category</div>
                                    <div className="card-subtitle">ALCOA+ compliance scores</div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={complianceCategoryData} layout="vertical" barSize={18}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} />
                                    <YAxis type="category" dataKey="name" strokeWidth={0} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={100} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Score" radius={[0, 4, 4, 0]}>
                                        {complianceCategoryData.map((entry, index) => (
                                            <Cell key={index} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Compliance Checklist Summary */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Regulatory Compliance Checklist</div>
                                <div className="card-subtitle">Readiness items for FDA / CGMP audit</div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                                <span style={{ color: 'var(--success-400)' }}>
                                    ● {complianceChecklist.filter(c => c.status === 'complete').length} Complete
                                </span>
                                <span style={{ color: 'var(--warning-400)' }}>
                                    ● {complianceChecklist.filter(c => c.status === 'in_progress' || c.status === 'warning').length} In Progress
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>
                                    ● {complianceChecklist.filter(c => c.status === 'pending').length} Pending
                                </span>
                            </div>
                        </div>
                        <div>
                            {complianceChecklist.map((item) => (
                                <div key={item.id} className="checklist-item" style={{ padding: '12px 0' }}>
                                    <div className={`checklist-icon ${item.status}`}>
                                        {item.status === 'complete' ? <CheckCircle size={14} /> :
                                            item.status === 'warning' ? <AlertTriangle size={14} /> :
                                                <Calendar size={14} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <span className="checklist-text" style={{ display: 'block' }}>{item.item}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Due: {new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <span className="checklist-tag">{item.category}</span>
                                    <span className={`status-badge ${item.status}`} style={{ fontSize: 10 }}>
                                        <span className="status-dot" />
                                        {item.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'history' && (
                <div className="table-container">
                    {loading ? <div className="p-4 text-center">Loading history...</div> : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Report Name</th>
                                    <th>Type</th>
                                    <th>Generated By</th>
                                    <th>Date</th>
                                    <th>Format</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportHistory.length > 0 ? (
                                    reportHistory.map((report) => (
                                        <tr key={report.id}>
                                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{report.name}</td>
                                            <td><span className="checklist-tag">{report.type}</span></td>
                                            <td>{report.generated_by}</td>
                                            <td>{new Date(report.generated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                                    background: report.format === 'PDF' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                                                    color: report.format === 'PDF' ? 'var(--error-400)' : 'var(--success-400)',
                                                    fontSize: 11, fontWeight: 600
                                                }}>
                                                    {report.format?.toUpperCase() || 'PDF'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-sm"><Download size={14} /></button>
                                                    <button className="btn btn-ghost btn-sm"><Mail size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                            No reports generated yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
