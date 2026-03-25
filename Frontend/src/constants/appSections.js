export const APP_SECTIONS = [
    { key: 'dashboard', label: 'Dashboard', path: '/' },
    { key: 'medicines', label: 'Medicines', path: '/medicines' },
    { key: 'suppliers', label: 'Suppliers', path: '/suppliers' },
    { key: 'customers', label: 'Customers', path: '/customers' },
    { key: 'pos', label: 'POS (Billing)', path: '/pos' },
    { key: 'bills', label: 'Bills', path: '/bills' },
    { key: 'purchases', label: 'Purchases', path: '/purchases' },
    { key: 'reports', label: 'Reports', path: '/reports' },
    { key: 'logs', label: 'Logs', path: '/logs' },
    { key: 'adminUsers', label: 'Admin Users', path: '/admin/users' },
];

export const APP_SECTION_KEYS = APP_SECTIONS.map((section) => section.key);

export const getDefaultPermissions = (role) => (role === 'admin' ? [...APP_SECTION_KEYS] : []);

export const normalizePermissions = (permissions) => {
    if (!Array.isArray(permissions)) return [];
    return [...new Set(permissions.filter((permission) => APP_SECTION_KEYS.includes(permission)))];
};

export const hasSectionAccess = (user, sectionKey) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(sectionKey);
};