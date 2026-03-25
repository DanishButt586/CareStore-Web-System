const Log = require('../models/Log');

const createLog = async ({ actor, category = 'change', action, target, details, ip, userAgent }) => {
    try {
        const actorPayload = {
            userId: actor?.userId || null,
            username: actor?.username || 'guest',
            role: actor?.role || 'guest',
        };

        await Log.create({
            actor: actorPayload,
            category,
            action,
            target: {
                resource: target?.resource || 'system',
                id: target?.id || null,
            },
            details: details || {},
            ip: ip || null,
            userAgent: userAgent || null,
        });
    } catch (error) {
        console.error(`Failed to write log entry: ${error.message}`);
    }
};

module.exports = { createLog };