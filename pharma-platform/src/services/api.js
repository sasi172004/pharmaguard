/**
 * PharmaGuard API Client
 * Handles all communication between frontend and backend API
 */

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/v1';

// ─── Token Management ──────────────────────────────────
function getAccessToken() {
    return localStorage.getItem('pg_access_token');
}

function getRefreshToken() {
    return localStorage.getItem('pg_refresh_token');
}

function setTokens(access, refresh) {
    localStorage.setItem('pg_access_token', access);
    localStorage.setItem('pg_refresh_token', refresh);
}

function clearTokens() {
    localStorage.removeItem('pg_access_token');
    localStorage.removeItem('pg_refresh_token');
    localStorage.removeItem('pg_user');
}

function getStoredUser() {
    try {
        const u = localStorage.getItem('pg_user');
        return u ? JSON.parse(u) : null;
    } catch { return null; }
}

function storeUser(user) {
    localStorage.setItem('pg_user', JSON.stringify(user));
}

// ─── Core Fetch Wrapper ────────────────────────────────
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...options.headers };

    // Add auth token
    const token = getAccessToken();
    if (token && !options.skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Add JSON content type for non-file requests
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Handle token expiry — try refresh
    if (response.status === 401 && getRefreshToken() && !options._isRetry) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            return apiFetch(endpoint, { ...options, _isRetry: true });
        } else {
            clearTokens();
            window.location.reload();
            throw new Error('Session expired');
        }
    }

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error || 'API request failed');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

async function tryRefreshToken() {
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: getRefreshToken() }),
        });
        if (res.ok) {
            const data = await res.json();
            setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ─── Auth API ──────────────────────────────────────────
const auth = {
    async login(email, password) {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true,
        });
        // data = { success: true, data: { user: {...}, tokens: {accessToken, refreshToken} } }
        const { user, tokens } = data.data;
        setTokens(tokens.accessToken, tokens.refreshToken);
        storeUser(user);
        return { user, tokens };
    },

    async logout() {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } catch { /* ignore */ }
        clearTokens();
    },

    async me() {
        const data = await apiFetch('/auth/me');
        return data.data;
    },

    async changePassword(currentPassword, newPassword) {
        return apiFetch('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },
};

// ─── Dashboard API ─────────────────────────────────────
const dashboard = {
    async summary() {
        const data = await apiFetch('/reports/dashboard/summary');
        return data.data;
    },
};

// ─── Uploads API ───────────────────────────────────────
const uploads = {
    async list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/uploads${query ? `?${query}` : ''}`);
    },

    async upload(file, metadata = {}) {
        const formData = new FormData();
        formData.append('file', file);
        if (metadata.instrumentId) formData.append('instrumentId', metadata.instrumentId);
        if (metadata.batchId) formData.append('batchId', metadata.batchId);
        if (metadata.notes) formData.append('notes', metadata.notes);
        return apiFetch('/uploads', { method: 'POST', body: formData });
    },

    async get(id) {
        const data = await apiFetch(`/uploads/${id}`);
        return data.data;
    },

    async flag(id, reason) {
        return apiFetch(`/uploads/${id}/flag`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
    },

    async verify(id) {
        const data = await apiFetch(`/uploads/${id}/verify`, { method: 'PATCH' });
        return data.data;
    },
};

// ─── Audit Trail API ──────────────────────────────────
const audit = {
    async list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/audit${query ? `?${query}` : ''}`);
    },

    async get(id) {
        const data = await apiFetch(`/audit/${id}`);
        return data.data;
    },

    async verifyChain() {
        const data = await apiFetch('/audit/verify-chain');
        return data.data;
    },

    async stats(days = 30) {
        const data = await apiFetch(`/audit/stats/summary?days=${days}`);
        return data.data;
    },
};

// ─── Documents API ─────────────────────────────────────
const documents = {
    async list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/documents${query ? `?${query}` : ''}`);
    },

    async create(doc) {
        const data = await apiFetch('/documents', {
            method: 'POST',
            body: JSON.stringify(doc),
        });
        return data.data;
    },

    async get(id) {
        const data = await apiFetch(`/documents/${id}`);
        return data.data;
    },

    async approve(id, intent, effectiveDate) {
        return apiFetch(`/documents/${id}/approve`, {
            method: 'PATCH',
            body: JSON.stringify({ intent, effectiveDate }),
        });
    },
};

// ─── Batches API ───────────────────────────────────────
const batches = {
    async list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/batches${query ? `?${query}` : ''}`);
    },

    async create(batch) {
        const data = await apiFetch('/batches', {
            method: 'POST',
            body: JSON.stringify(batch),
        });
        return data.data;
    },

    async get(id) {
        const data = await apiFetch(`/batches/${id}`);
        return data.data;
    },

    async release(id, decision, intent) {
        return apiFetch(`/batches/${id}/release`, {
            method: 'PATCH',
            body: JSON.stringify({ decision, intent }),
        });
    },
};

// ─── Users API ─────────────────────────────────────────
const users = {
    async list(params = {}) {
        const query = new URLSearchParams(params).toString();
        const data = await apiFetch(`/users${query ? `?${query}` : ''}`);
        return data.data;
    },

    async create(user) {
        const data = await apiFetch('/users', {
            method: 'POST',
            body: JSON.stringify(user),
        });
        return data.data;
    },

    async update(id, updates) {
        const data = await apiFetch(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        return data.data;
    },
};

// ─── Instruments API ──────────────────────────────────
const instruments = {
    async list(params = {}) {
        const query = new URLSearchParams(params).toString();
        const data = await apiFetch(`/instruments${query ? `?${query}` : ''}`);
        return data.data;
    },

    async create(instrument) {
        const data = await apiFetch('/instruments', {
            method: 'POST',
            body: JSON.stringify(instrument),
        });
        return data.data;
    },

    async update(id, updates) {
        const data = await apiFetch(`/instruments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        return data.data;
    },
};

// ─── Reports API ──────────────────────────────────────
const reports = {
    async list(params = {}) {
        const query = new URLSearchParams(params).toString();
        const data = await apiFetch(`/reports${query ? `?${query}` : ''}`);
        return data.data;
    },

    async generate(report) {
        const data = await apiFetch('/reports/generate', {
            method: 'POST',
            body: JSON.stringify(report),
        });
        return data.data;
    },
};

// Export everything as named exports AND as default
export {
    auth, dashboard, uploads, audit,
    documents, batches, users, instruments, reports,
    getStoredUser, storeUser, clearTokens, getAccessToken,
};

export default {
    auth, dashboard, uploads, audit,
    documents, batches, users, instruments, reports,
};
