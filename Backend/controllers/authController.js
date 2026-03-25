const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const { getDefaultPermissions, normalizePermissions } = require('../data/appSections');
const { createLog } = require('../utils/logService');

const loginSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
});

const registerSchema = Joi.object({
    username: Joi.string().min(3).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'staff').default('staff'),
    permissions: Joi.array().items(Joi.string()).default([]),
}).unknown(true);

const signToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });

const login = async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const user = await User.findOne({ username: value.username });
        if (!user) return res.status(401).json({ message: 'Invalid username or password' });

        const ok = await user.comparePassword(value.password);
        if (!ok) return res.status(401).json({ message: 'Invalid username or password' });

        const token = signToken(user);
        await createLog({
            actor: {
                userId: user._id,
                username: user.username,
                role: user.role,
            },
            category: 'auth',
            action: 'LOGIN',
            target: { resource: 'auth', id: user._id.toString() },
            details: { status: 'success' },
            ip: req.ip,
            userAgent: req.get('user-agent') || null,
        });

        res.json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                role: user.role,
                permissions: user.permissions || [],
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const register = async (req, res) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const exists = await User.findOne({ username: value.username });
        if (exists) return res.status(409).json({ message: 'Username already exists' });

        const permissions = normalizePermissions(value.permissions, value.role);
        const user = await User.create({
            ...value,
            permissions: value.role === 'admin' ? getDefaultPermissions('admin') : permissions,
        });
        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: user.role,
            permissions: user.permissions,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const me = async (req, res) => {
    res.json({
        _id: req.user._id,
        username: req.user.username,
        role: req.user.role,
        permissions: req.user.permissions || [],
    });
};

const logout = async (req, res) => {
    try {
        await createLog({
            actor: {
                userId: req.user?._id || null,
                username: req.user?.username || 'guest',
                role: req.user?.role || 'guest',
            },
            category: 'auth',
            action: 'LOGOUT',
            target: { resource: 'auth', id: req.user?._id?.toString() || null },
            details: { status: 'success' },
            ip: req.ip,
            userAgent: req.get('user-agent') || null,
        });

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    login,
    register,
    me,
    logout,
};
