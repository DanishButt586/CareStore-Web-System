import client from './client';

export const authApi = {
    login: (payload) => client.post('/auth/login', payload),
    me: () => client.get('/auth/me'),
    logout: () => client.post('/auth/logout'),
};

export const medicineApi = {
    list: () => client.get('/medicines'),
    create: (payload) => client.post('/medicines', payload),
    update: (id, payload) => client.put(`/medicines/${id}`, payload),
    remove: (id) => client.delete(`/medicines/${id}`),
    alerts: () => client.get('/medicines/alerts'),
};

export const supplierApi = {
    list: () => client.get('/suppliers'),
    create: (payload) => client.post('/suppliers', payload),
    update: (id, payload) => client.put(`/suppliers/${id}`, payload),
    remove: (id) => client.delete(`/suppliers/${id}`),
    addTransaction: (id, payload) => client.post(`/suppliers/${id}/transactions`, payload),
};

export const customerApi = {
    list: () => client.get('/customers'),
    getById: (id) => client.get(`/customers/${id}`),
    create: (payload) => client.post('/customers', payload),
    update: (id, payload) => client.put(`/customers/${id}`, payload),
    remove: (id) => client.delete(`/customers/${id}`),
};

export const salesApi = {
    list: () => client.get('/sales'),
    create: (payload) => client.post('/sales', payload),
    update: (id, payload) => client.put(`/sales/${id}`, payload),
    remove: (id) => client.delete(`/sales/${id}`),
};

export const purchaseApi = {
    list: () => client.get('/purchases'),
    create: (payload) => client.post('/purchases', payload),
};

export const reportApi = {
    daily: () => client.get('/reports/daily'),
    monthly: () => client.get('/reports/monthly'),
    stock: () => client.get('/reports/stock'),
    expiry: () => client.get('/reports/expiry'),
};

export const logsApi = {
    list: (params = {}) => client.get('/logs', { params }),
};

export const userApi = {
    list: () => client.get('/users'),
    create: (payload) => client.post('/users', payload),
    update: (id, payload) => client.put(`/users/${id}`, payload),
    remove: (id) => client.delete(`/users/${id}`),
};
