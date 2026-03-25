const APP_SECTIONS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'medicines', label: 'Medicines' },
    { key: 'suppliers', label: 'Suppliers' },
    { key: 'customers', label: 'Customers' },
    { key: 'pos', label: 'POS (Billing)' },
    { key: 'bills', label: 'Bills' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'reports', label: 'Reports' },
    { key: 'logs', label: 'Logs' },
    { key: 'adminUsers', label: 'Admin Users' },
];

const APP_SECTION_KEYS = APP_SECTIONS.map((section) => section.key);

const getDefaultPermissions = (role) => (role === 'admin' ? [...APP_SECTION_KEYS] : []);

const normalizePermissions = (permissions, role = 'staff') => {
    if (role === 'admin') {
        return getDefaultPermissions('admin');
    }

    if (!Array.isArray(permissions)) {
        return [];
    }

    return [...new Set(permissions.filter((permission) => APP_SECTION_KEYS.includes(permission)))];
};

module.exports = {
    APP_SECTIONS,
    APP_SECTION_KEYS,
    getDefaultPermissions,
    normalizePermissions,
};