const { createLog } = require('../utils/logService');

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set(['password', 'token', 'accessToken', 'refreshToken']);

const METHOD_ACTION_MAP = {
    POST: 'Created',
    PUT: 'Updated',
    PATCH: 'Updated',
    DELETE: 'Deleted',
};

const sanitizePayload = (value, depth = 0) => {
    if (depth > 3) return '[truncated]';

    if (Array.isArray(value)) {
        return value.map((entry) => sanitizePayload(entry, depth + 1));
    }

    if (value && typeof value === 'object') {
        return Object.keys(value).reduce((acc, key) => {
            if (SENSITIVE_KEYS.has(key)) {
                acc[key] = '[redacted]';
            } else {
                acc[key] = sanitizePayload(value[key], depth + 1);
            }
            return acc;
        }, {});
    }

    return value;
};

const toResourceLabel = (resource = 'record') => {
    const normalized = String(resource || 'record')
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const singular = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
    return singular
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ');
};

const activityLogger = (req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
        if (!req.originalUrl.startsWith('/api/')) return;
        if (!MUTATION_METHODS.has(req.method)) return;
        if (req.originalUrl.startsWith('/api/logs')) return;
        if (req.originalUrl.startsWith('/api/auth/login')) return;
        if (req.originalUrl.startsWith('/api/auth/logout')) return;
        if (res.statusCode >= 400) return;

        const actor = req.user
            ? {
                userId: req.user._id,
                username: req.user.username,
                role: req.user.role,
            }
            : {
                userId: null,
                username: req.body?.username || 'guest',
                role: 'guest',
            };

        const resource = req.baseUrl.replace('/api/', '') || 'system';
        const fallbackChangedFields = Object.keys(req.body || {}).filter((key) => !SENSITIVE_KEYS.has(key));
        const changedFields = Array.isArray(req.activityLog?.changedFields)
            ? req.activityLog.changedFields.filter((key) => !SENSITIVE_KEYS.has(key))
            : fallbackChangedFields;
        const actionVerb = METHOD_ACTION_MAP[req.method] || req.method;
        const action = `${actionVerb} ${toResourceLabel(resource)}`;
        const payloadPreview = req.activityLog?.payloadPreview || req.body || {};
        const fieldChanges = req.activityLog?.fieldChanges && typeof req.activityLog.fieldChanges === 'object'
            ? req.activityLog.fieldChanges
            : undefined;

        createLog({
            actor,
            category: 'change',
            action,
            target: {
                resource,
                id: req.params?.id || null,
            },
            details: {
                statusCode: res.statusCode,
                durationMs: Date.now() - startedAt,
                changedFields,
                ...(fieldChanges ? { fieldChanges: sanitizePayload(fieldChanges) } : {}),
                payloadPreview: sanitizePayload(payloadPreview),
            },
            ip: req.ip,
            userAgent: req.get('user-agent') || null,
        });
    });

    next();
};

module.exports = { activityLogger };