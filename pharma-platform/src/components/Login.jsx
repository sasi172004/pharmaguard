import { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Zap } from 'lucide-react';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fillDemo = () => {
        setEmail('priya.sharma@pharmaguard.io');
        setPassword('PharmaGuard@2026');
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await onLogin(email, password);
            // If successful, App.jsx will re-render and show dashboard
        } catch (err) {
            console.error('Login failed:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Animated background */}
            <div className="login-bg">
                <div className="login-orb login-orb-1" />
                <div className="login-orb login-orb-2" />
                <div className="login-orb login-orb-3" />
            </div>

            <div className="login-container">
                {/* Left — Branding */}
                <div className="login-branding">
                    <div className="login-logo">
                        <Shield size={36} />
                        <h1>PharmaGuard</h1>
                    </div>
                    <p className="login-tagline">
                        Enterprise-grade data integrity & compliance platform for pharmaceutical manufacturing.
                    </p>

                    <div className="login-features">
                        <div className="login-feature">
                            <CheckCircle size={16} />
                            <span>21 CFR Part 11 compliant audit trails</span>
                        </div>
                        <div className="login-feature">
                            <CheckCircle size={16} />
                            <span>SHA-256 tamper-evident hash chains</span>
                        </div>
                        <div className="login-feature">
                            <CheckCircle size={16} />
                            <span>Electronic signatures & RBAC</span>
                        </div>
                        <div className="login-feature">
                            <CheckCircle size={16} />
                            <span>Real-time compliance monitoring</span>
                        </div>
                    </div>

                    <div className="login-compliance-note">
                        🏛️ Built for FDA, EMA, and WHO GMP regulatory compliance.
                        All electronic records meet 21 CFR Part 11 requirements.
                    </div>
                </div>

                {/* Right — Login Form */}
                <div className="login-form-panel">
                    <h2>Sign In</h2>
                    <p className="login-subtitle">Access your compliance workspace</p>

                    {error && (
                        <div className="login-error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="login-email">Email Address</label>
                            <div className="input-wrapper">
                                <Mail size={16} className="input-icon" />
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="login-password">Password</label>
                            <div className="input-wrapper">
                                <Lock size={16} className="input-icon" />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary login-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="login-spinner">Authenticating...</span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Demo credentials */}
                    <div className="login-demo-section">
                        <button
                            type="button"
                            className="btn login-demo-btn"
                            onClick={fillDemo}
                            disabled={isLoading}
                        >
                            <Zap size={14} />
                            Fill Demo Credentials
                        </button>
                        <p className="login-demo-hint">
                            Use demo credentials to explore the platform
                        </p>
                    </div>

                    <div className="login-footer">
                        PharmaGuard v1.0 — Secured & GMP Validated
                    </div>
                </div>
            </div>
        </div>
    );
}
