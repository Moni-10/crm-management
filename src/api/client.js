const BASE_URL = '/api';
const TOKEN_KEY = 'authToken';

export const tokenStore = {
    get() {
        try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
    },
    set(token) {
        try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
    },
    clear() {
        try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
    }
};

// Called when the server says the login is no longer valid (expired token, password changed elsewhere).
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => { onUnauthorized = handler; };

async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    const token = tokenStore.get();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(() => null);
    if (response.status === 401 && auth && !path.startsWith('/auth/')) {
        onUnauthorized();
    }
    if (!response.ok) {
        throw new Error(data?.error || `Request failed (${response.status})`);
    }
    return data;
}

export const http = {
    get: (path, options) => request(path, options),
    post: (path, body, options) => request(path, { method: 'POST', body, ...options }),
    put: (path, body, options) => request(path, { method: 'PUT', body, ...options }),
    delete: (path, options) => request(path, { method: 'DELETE', ...options })
};
