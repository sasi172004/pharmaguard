import {
    LayoutDashboard,
    Upload,
    ScrollText,
    FileText,
    Package,
    BarChart3,
    Settings,
    Shield,
    FlaskConical,
} from 'lucide-react';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'uploads', label: 'Instrument Data', icon: Upload },
    { id: 'audit', label: 'Audit Trail', icon: ScrollText },
    { id: 'documents', label: 'Document Control', icon: FileText },
    { id: 'batches', label: 'Batch Tracking', icon: Package },
    { id: 'reports', label: 'Compliance Reports', icon: BarChart3 },
];

const bottomItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, setActivePage, user }) {
    const displayName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        : 'User';

    const displayRole = user?.role?.replace(/_/g, ' ') || 'User';

    const initials = user
        ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()
        : 'U';

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Shield size={20} />
                </div>
                <div className="sidebar-logo-text">
                    <h1>PharmaGuard</h1>
                    <span>Compliance Platform</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Main Menu</div>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                            onClick={() => setActivePage(item.id)}
                        >
                            <Icon className="sidebar-item-icon" size={18} />
                            <span>{item.label}</span>
                            {item.badge && (
                                <span className="sidebar-item-badge">{item.badge}</span>
                            )}
                        </button>
                    );
                })}

                <div className="sidebar-section-label" style={{ marginTop: 16 }}>System</div>
                {bottomItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                            onClick={() => setActivePage(item.id)}
                        >
                            <Icon className="sidebar-item-icon" size={18} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Compliance Badge */}
            <div style={{
                margin: '0 14px 12px',
                padding: '14px',
                background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.08), rgba(0, 145, 234, 0.05))',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(0, 188, 212, 0.15)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <FlaskConical size={14} style={{ color: 'var(--primary-400)' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-300)' }}>21 CFR Part 11</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4, display: 'block' }}>
                    FDA-compliant electronic records & audit trails
                </span>
            </div>

            {/* User */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">{initials}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{displayName}</div>
                        <div className="sidebar-user-role">{displayRole}</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
