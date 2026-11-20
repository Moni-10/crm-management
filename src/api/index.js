import { http } from './client';

// One small client per backend resource: list / get / create / update / remove.
const createResourceApi = (name) => ({
    list: () => http.get(`/${name}`),
    get: (id) => http.get(`/${name}/${encodeURIComponent(id)}`),
    create: (data) => http.post(`/${name}`, data),
    update: (data) => http.put(`/${name}/${encodeURIComponent(data.id)}`, data),
    remove: (id) => http.delete(`/${name}/${encodeURIComponent(id)}`),
    // -> { created, failed, errors: [{ row, message }] }
    bulkCreate: (records) => http.post(`/${name}/bulk`, { records })
});

export const salespersonsApi = createResourceApi('salespersons');
export const partiesApi = createResourceApi('parties');
export const machinesApi = createResourceApi('machines');
export const quotationsApi = createResourceApi('quotations');
export const eventsApi = createResourceApi('events');
// Calling Data can hold very large sheets: search/filter/paging run on the server.
export const callsApi = {
    ...createResourceApi('calls'),
    // -> { items, total, page, pageSize, cities }
    query: (params) => {
        const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
        return http.get(`/calls/query?${qs}`);
    },
    // Fast bulk insert for Excel uploads; firstRow numbers the rows in error messages. -> { created, failed, errors }
    importRows: (records, firstRow = 1) => http.post('/calls/import', { records, offset: firstRow - 1 })
};

// -> { salespersons: [], parties: [], machines: [], quotations: [], events: [] }
export const searchApi = {
    search: (query, limit = 5) => http.get(`/search?q=${encodeURIComponent(query)}&limit=${limit}`)
};

export const healthApi = {
    check: () => http.get('/health', { auth: false })
};

// -> [{ id, type, description, createdAt }], newest first
export const activityApi = {
    recent: (limit = 10) => http.get(`/activity?limit=${limit}`)
};

export const authApi = {
    login: (email, password) => http.post('/auth/login', { email, password }, { auth: false }),
    me: () => http.get('/auth/me'),
    updateProfile: (name) => http.put('/auth/profile', { name }),
    changePassword: (currentPassword, newPassword) => http.post('/auth/change-password', { currentPassword, newPassword })
};

// The company's own details. Reading is public; updating needs an admin.
export const companyApi = {
    get: () => http.get('/company', { auth: false }),
    update: (details) => http.put('/company', details)
};

// Admin-only data tools
export const adminApi = {
    dataStatus: () => http.get('/admin/data-status'),
    loadSampleData: () => http.post('/admin/sample-data', {}),
    clearData: (password) => http.post('/admin/clear-data', { password })
};

export const backupApi = {
    export: () => http.get('/backup'),
    import: (data) => http.post('/backup/import', data)
};

// Admin: user accounts and roles/permissions.
export const usersApi = {
    list: () => http.get('/users'),
    create: (data) => http.post('/users', data),
    update: (id, data) => http.put(`/users/${encodeURIComponent(id)}`, data),
    remove: (id) => http.delete(`/users/${encodeURIComponent(id)}`)
};

export const rolesApi = {
    catalog: () => http.get('/roles/catalog'),
    list: () => http.get('/roles'),
    create: (data) => http.post('/roles', data),
    update: (id, data) => http.put(`/roles/${id}`, data),
    remove: (id) => http.delete(`/roles/${id}`)
};

// Leads: the imported Excel records (read-only). Search, filters and paging run on the server.
export const leadsApi = {
    // -> { items, total, page, pageSize, sheets }
    query: (params) => http.get(`/leads/query?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null))}`),
    get: (id) => http.get(`/leads/${id}`)
};
