import { useState, useRef, useEffect } from 'react';
import { Search, Bell, HelpCircle, Moon, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { notifications } from '../data/mockData';

export default function Header({ title, subtitle }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const dropdownRef = useRef(null);
    const unreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'critical': return <AlertCircle size={16} />;
            case 'warning': return <AlertTriangle size={16} />;
            default: return <Info size={16} />;
        }
    };

    return (
        <header className="header">
            <div className="header-left">
                <div>
                    <div className="header-title">{title}</div>
                    {subtitle && <div className="header-subtitle">{subtitle}</div>}
                </div>
            </div>

            <div className="header-right">
                <div className="header-search">
                    <Search className="header-search-icon" size={16} />
                    <input type="text" placeholder="Search records, documents..." />
                </div>

                <button className="header-icon-btn" title="Help">
                    <HelpCircle size={20} />
                </button>

                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button
                        className="header-icon-btn"
                        title="Notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="badge-dot" />}
                    </button>

                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="notification-dropdown-header">
                                <h4>Notifications</h4>
                                <button className="btn btn-ghost btn-sm">Mark all read</button>
                            </div>
                            <div className="notification-list">
                                {notifications.map((notif) => (
                                    <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                                        <div className={`notification-icon ${notif.type}`}>
                                            {getNotificationIcon(notif.type)}
                                        </div>
                                        <div className="notification-text">
                                            <h5>{notif.title}</h5>
                                            <p>{notif.message}</p>
                                        </div>
                                        <span className="notification-time">{notif.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="header-divider" />

                <button className="header-icon-btn" title="Toggle theme">
                    <Moon size={20} />
                </button>
            </div>
        </header>
    );
}
