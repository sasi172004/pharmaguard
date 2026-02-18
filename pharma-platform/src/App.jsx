import { useState, useEffect } from 'react';
import { auth, getStoredUser, clearTokens } from './services/api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DataUpload from './components/DataUpload';
import AuditTrail from './components/AuditTrail';
import DocumentControl from './components/DocumentControl';
import BatchTracking from './components/BatchTracking';
import ComplianceReports from './components/ComplianceReports';
import Settings from './components/Settings';
import Login from './components/Login';

// Page metadata for header
const pageMeta = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview & compliance metrics' },
  uploads: { title: 'Instrument Data', subtitle: 'Upload and manage instrument data files' },
  audit: { title: 'Audit Trail', subtitle: 'Immutable compliance event log' },
  documents: { title: 'Document Control', subtitle: 'SOPs, protocols & quality documents' },
  batches: { title: 'Batch Tracking', subtitle: 'Manufacturing batch records' },
  reports: { title: 'Compliance Reports', subtitle: 'Regulatory reporting & analytics' },
  settings: { title: 'Settings', subtitle: 'System configuration & user management' },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const stored = getStoredUser();
    const token = localStorage.getItem('pg_access_token');
    if (stored && token) {
      setCurrentUser(stored);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // Handle login — called by Login component
  const handleLogin = async (email, password) => {
    const result = await auth.login(email, password);
    // result = { user: {...}, tokens: {...} }
    setCurrentUser(result.user);
    setIsAuthenticated(true);
    setActivePage('dashboard');
    return result;
  };

  // Handle logout
  const handleLogout = async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    clearTokens();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActivePage('dashboard');
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0a0e1a', color: '#e8eaf6',
        fontFamily: 'Inter, sans-serif', fontSize: '1.1rem',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚗️</div>
          Loading PharmaGuard...
        </div>
      </div>
    );
  }

  // Not authenticated — show Login
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Render the active page
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard user={currentUser} />;
      case 'uploads': return <DataUpload user={currentUser} />;
      case 'audit': return <AuditTrail user={currentUser} />;
      case 'documents': return <DocumentControl user={currentUser} />;
      case 'batches': return <BatchTracking user={currentUser} />;
      case 'reports': return <ComplianceReports user={currentUser} />;
      case 'settings': return <Settings user={currentUser} onLogout={handleLogout} />;
      default: return <Dashboard user={currentUser} />;
    }
  };

  const meta = pageMeta[activePage] || pageMeta.dashboard;

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={currentUser}
      />
      <div className="main-wrapper">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          user={currentUser}
          onLogout={handleLogout}
        />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
