import { useState, useEffect } from 'react';
import {
    User, Shield, Bell, Database, Key, Globe, Monitor,
    Lock, Users, Trash2, Edit, Plus, CheckCircle, Loader
} from 'lucide-react';
import { users as usersApi } from '../services/api';

const settingSections = [
    { id: 'general', label: 'General', icon: <Monitor size={16} /> },
    { id: 'users', label: 'User Management', icon: <Users size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'storage', label: 'Storage & Retention', icon: <Database size={16} /> },
    { id: 'api', label: 'API & Integrations', icon: <Globe size={16} /> },
];

export default function Settings() {
    const [activeSection, setActiveSection] = useState('general');
    const [userList, setUserList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (activeSection === 'users') {
            loadUsers();
        }
    }, [activeSection]);

    const loadUsers = async () => {
        try {
            setLoadingUsers(true);
            const data = await usersApi.list();
            setUserList(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h2>Settings</h2>
                    <p>Platform configuration, user management & security</p>
                </div>
            </div>

            <div className="settings-grid">
                {/* Settings Nav */}
                <div className="settings-nav">
                    {settingSections.map((section) => (
                        <button
                            key={section.id}
                            className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            {section.icon}
                            <span>{section.label}</span>
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="settings-content">
                    {activeSection === 'general' && (
                        <>
                            <div className="settings-section">
                                <h3>Organization</h3>
                                <p>Your company and platform settings</p>
                                <div className="form-group">
                                    <label className="form-label">Organization Name</label>
                                    <input className="form-input" defaultValue="PharmaGuard Labs Pvt. Ltd." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Platform URL</label>
                                    <input className="form-input" defaultValue="https://app.pharmaguard.io" readOnly style={{ opacity: 0.7 }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Timezone</label>
                                    <select className="form-input">
                                        <option>Asia/Kolkata (IST, UTC+5:30)</option>
                                        <option>America/New_York (EST)</option>
                                        <option>Europe/London (GMT)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3>Compliance Configuration</h3>
                                <p>Regulatory framework and compliance settings</p>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>21 CFR Part 11 Mode</h4>
                                        <p>Enable FDA-compliant electronic records and signatures</p>
                                    </div>
                                    <div className="toggle active" />
                                </div>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>Automatic Audit Trail</h4>
                                        <p>Log all user actions with timestamps and metadata</p>
                                    </div>
                                    <div className="toggle active" />
                                </div>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>E-Signature Requirement</h4>
                                        <p>Require electronic signatures for document approvals</p>
                                    </div>
                                    <div className="toggle active" />
                                </div>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>Data Integrity Alerts</h4>
                                        <p>Alert on suspicious data modifications or anomalies</p>
                                    </div>
                                    <div className="toggle active" />
                                </div>
                            </div>
                        </>
                    )}

                    {activeSection === 'users' && (
                        <>
                            <div className="settings-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div>
                                        <h3>User Management</h3>
                                        <p>Manage platform users, roles & permissions</p>
                                    </div>
                                    <button className="btn btn-primary btn-sm">
                                        <Plus size={14} /> Add User
                                    </button>
                                </div>

                                <div className="table-container">
                                    {loadingUsers ? <div className="p-4 text-center">Loading users...</div> : (
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>User</th>
                                                    <th>Role</th>
                                                    <th>Department</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userList.map((user) => (
                                                    <tr key={user.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div className="sidebar-avatar" style={{ width: 30, height: 30, fontSize: 10 }}>
                                                                    {user.first_name ? user.first_name[0] : 'U'}
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.first_name} {user.last_name}</div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="checklist-tag">{user.role.replace(/_/g, ' ')}</span>
                                                        </td>
                                                        <td>{user.department || 'General'}</td>
                                                        <td>
                                                            <span className={`status-badge ${user.active ? 'active-status' : 'inactive'}`}>
                                                                <span className="status-dot" />
                                                                {user.active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                <button className="btn btn-ghost btn-sm"><Edit size={14} /></button>
                                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error-400)' }}><Trash2 size={14} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3>Role Definitions</h3>
                                <p>Predefined roles aligned with pharma regulatory requirements</p>
                                {[
                                    { role: 'Lab Director', perms: 'Full access, system configuration, user management' },
                                    { role: 'QA Manager', perms: 'Document approval, batch release, compliance reports' },
                                    { role: 'QC Analyst', perms: 'Data upload, document editing, batch data entry' },
                                    { role: 'Compliance Officer', perms: 'Audit trail access, report generation, user audit' },
                                    { role: 'Lab Technician', perms: 'Data upload, view-only documents' },
                                    { role: 'Viewer', perms: 'Read-only access to dashboards and reports' },
                                ].map((r, i) => (
                                    <div key={i} className="settings-row">
                                        <div className="settings-row-info">
                                            <h4>{r.role}</h4>
                                            <p>{r.perms}</p>
                                        </div>
                                        <button className="btn btn-ghost btn-sm"><Edit size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeSection === 'security' && (
                        <>
                            <div className="settings-section">
                                <h3>Authentication & Security</h3>
                                <p>Access control settings per 21 CFR Part 11 requirements</p>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>Multi-Factor Authentication (MFA)</h4>
                                        <p>Require MFA for all users — strongly recommended</p>
                                    </div>
                                    <div className="toggle active" />
                                </div>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>Session Timeout</h4>
                                        <p>Auto-logout after inactivity to prevent unauthorized access</p>
                                    </div>
                                    <select className="filter-select" style={{ width: 120 }}>
                                        <option>15 minutes</option>
                                        <option>30 minutes</option>
                                        <option>1 hour</option>
                                    </select>
                                </div>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>Password Policy</h4>
                                        <p>Enforce strong passwords with complexity requirements</p>
                                    </div>
                                    <select className="filter-select" style={{ width: 120 }}>
                                        <option>Strong</option>
                                        <option>Medium</option>
                                        <option>Custom</option>
                                    </select>
                                </div>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>IP Whitelisting</h4>
                                        <p>Restrict access to platform from approved IPs only</p>
                                    </div>
                                    <div className="toggle" />
                                </div>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>Login Attempt Lockout</h4>
                                        <p>Lock account after 5 failed login attempts</p>
                                    </div>
                                    <div className="toggle active" />
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3>Encryption</h3>
                                <p>Data encryption settings for compliance</p>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>Data at Rest Encryption</h4>
                                        <p>AES-256 encryption for stored files and records</p>
                                    </div>
                                    <span className="status-badge active-status"><CheckCircle size={12} /> Enabled</span>
                                </div>
                                <div className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>Data in Transit Encryption</h4>
                                        <p>TLS 1.3 for all API communications</p>
                                    </div>
                                    <span className="status-badge active-status"><CheckCircle size={12} /> Enabled</span>
                                </div>
                            </div>
                        </>
                    )}

                    {activeSection === 'notifications' && (
                        <div className="settings-section">
                            <h3>Notification Preferences</h3>
                            <p>Configure alerts for compliance events</p>
                            {[
                                { title: 'Data Upload Alerts', desc: 'Notify when new instrument data is received' },
                                { title: 'Anomaly Detection', desc: 'Alert when data deviations are detected' },
                                { title: 'Document Review Reminders', desc: 'Remind reviewers of pending documents' },
                                { title: 'Calibration Due Alerts', desc: 'Warn before instrument calibration expires' },
                                { title: 'Batch Release Notifications', desc: 'Notify when batch is ready for release' },
                                { title: 'Security Alerts', desc: 'Alert on failed login attempts or suspicious activity' },
                            ].map((item, i) => (
                                <div key={i} className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>{item.title}</h4>
                                        <p>{item.desc}</p>
                                    </div>
                                    <div className="toggle active" />
                                </div>
                            ))}
                        </div>
                    )}

                    {activeSection === 'storage' && (
                        <div className="settings-section">
                            <h3>Storage & Retention Policy</h3>
                            <p>Configure data retention aligned with regulatory requirements</p>
                            <div className="settings-row">
                                <div className="settings-row-info">
                                    <h4>Immutable Storage</h4>
                                    <p>Original files cannot be modified or deleted (WORM compliance)</p>
                                </div>
                                <div className="toggle active" />
                            </div>
                            <div className="settings-row">
                                <div className="settings-row-info">
                                    <h4>Data Retention Period</h4>
                                    <p>Minimum retention period for regulatory compliance</p>
                                </div>
                                <select className="filter-select" style={{ width: 120 }}>
                                    <option>7 years</option>
                                    <option>10 years</option>
                                    <option>15 years</option>
                                    <option>Indefinite</option>
                                </select>
                            </div>
                            <div className="settings-row">
                                <div className="settings-row-info">
                                    <h4>Storage Provider</h4>
                                    <p>Cloud storage service for instrument data files</p>
                                </div>
                                <select className="filter-select" style={{ width: 160 }}>
                                    <option>AWS S3 (Mumbai)</option>
                                    <option>Google Cloud Storage</option>
                                    <option>Azure Blob Storage</option>
                                </select>
                            </div>
                            <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>Storage Used</span>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>24.7 GB / 100 GB</span>
                                </div>
                                <div className="progress-bar-container" style={{ height: 8 }}>
                                    <div className="progress-bar-fill high" style={{ width: '24.7%' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'api' && (
                        <div className="settings-section">
                            <h3>API & Integrations</h3>
                            <p>Connect external systems with PharmaGuard</p>
                            {[
                                { name: 'Watch Agent API Key', desc: 'Used by desktop watch agent for instrument data uploads', status: 'Connected', key: 'pg_live_****...7x9m' },
                                { name: 'LIMS Integration', desc: 'Connect to existing Laboratory Information Management System', status: 'Not Connected', key: null },
                                { name: 'ERP Integration', desc: 'SAP/Oracle ERP batch record sync', status: 'Not Connected', key: null },
                                { name: 'Email Service (SMTP)', desc: 'Notification delivery and report distribution', status: 'Connected', key: 'smtp.pharmaguard.io' },
                            ].map((item, i) => (
                                <div key={i} className="settings-row">
                                    <div className="settings-row-info">
                                        <h4>{item.name}</h4>
                                        <p>{item.desc}</p>
                                        {item.key && <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-400)', marginTop: 4 }}>{item.key}</p>}
                                    </div>
                                    <span className={`status-badge ${item.status === 'Connected' ? 'active-status' : 'inactive'}`}>
                                        <span className="status-dot" />
                                        {item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
