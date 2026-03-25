const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { APP_SECTION_KEYS } = require('../data/appSections');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const checkRole = (...roles) => {
    return (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ message: 'Not authorized for this role' });
        }
    };
};

const checkPermission = (...sections) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (req.user.role === 'admin') {
            return next();
        }

        const allowed = Array.isArray(req.user.permissions) ? req.user.permissions : [];
        const normalizedSections = sections.filter((section) => APP_SECTION_KEYS.includes(section));

        if (normalizedSections.some((section) => allowed.includes(section))) {
            return next();
        }

        return res.status(403).json({ message: 'Not authorized for this section' });
    };
};

module.exports = { protect, checkRole, checkPermission };