const Log = require('../models/Log');

const getLogs = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
        const skip = (page - 1) * limit;

        const filter = {};
        const search = String(req.query.search || '').trim();
        const category = String(req.query.category || '').trim();
        const role = String(req.query.role || '').trim();
        const action = String(req.query.action || '').trim();
        const from = String(req.query.from || '').trim();
        const to = String(req.query.to || '').trim();

        if (category) {
            filter.category = category;
        }

        if (role) {
            filter['actor.role'] = role;
        }

        if (action) {
            filter.action = { $regex: action, $options: 'i' };
        }

        if (from || to) {
            filter.createdAt = {};

            if (from) {
                const fromDate = new Date(from);
                if (!Number.isNaN(fromDate.getTime())) {
                    filter.createdAt.$gte = fromDate;
                }
            }

            if (to) {
                const toDate = new Date(to);
                if (!Number.isNaN(toDate.getTime())) {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
                        toDate.setHours(23, 59, 59, 999);
                    }
                    filter.createdAt.$lte = toDate;
                }
            }

            if (!Object.keys(filter.createdAt).length) {
                delete filter.createdAt;
            }
        }

        if (search) {
            filter.$or = [
                { action: { $regex: search, $options: 'i' } },
                { 'actor.username': { $regex: search, $options: 'i' } },
                { 'target.resource': { $regex: search, $options: 'i' } },
            ];
        }

        const [items, total] = await Promise.all([
            Log.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Log.countDocuments(filter),
        ]);

        res.json({
            items,
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            appliedFilters: {
                search,
                category,
                role,
                action,
                from,
                to,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLogs,
};