const Joi = require('joi');
const User = require('../models/User');
const { getDefaultPermissions, normalizePermissions } = require('../data/appSections');

const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'Admin';
const LOCKED_ADMIN_USERNAMES = new Set([
    String(DEFAULT_ADMIN_USERNAME).toLowerCase(),
    'admin',
]);

const isLockedDefaultAdmin = (userDoc) =>
    !!userDoc &&
    userDoc.role === 'admin' &&
    LOCKED_ADMIN_USERNAMES.has(String(userDoc.username || '').toLowerCase());

const createSchema = Joi.object({
    username: Joi.string().min(3).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'staff').default('staff'),
    permissions: Joi.array().items(Joi.string()).default([]),
}).unknown(true);

const updateSchema = Joi.object({
    username: Joi.string().min(3).optional(),
    password: Joi.string().min(6).optional(),
    role: Joi.string().valid('admin', 'staff').optional(),
    permissions: Joi.array().items(Joi.string()).optional(),
}).min(1).unknown(true);

const getUsers = async (_req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        const payload = users.map((u) => ({
            ...u.toObject(),
            isLocked: isLockedDefaultAdmin(u),
        }));
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        const { error, value } = createSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const exists = await User.findOne({ username: value.username });
        if (exists) return res.status(409).json({ message: 'Username already exists' });

        const permissions = normalizePermissions(value.permissions, value.role);
        const user = await User.create({
            ...value,
            permissions: value.role === 'admin' ? getDefaultPermissions('admin') : permissions,
        });
        res.status(201).json({ _id: user._id, username: user.username, role: user.role, permissions: user.permissions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { error, value } = updateSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (isLockedDefaultAdmin(user) && (value.username || value.role === 'staff')) {
            return res.status(403).json({ message: 'Default admin username/role is locked' });
        }

        if (value.username && value.username !== user.username) {
            const exists = await User.findOne({ username: value.username });
            if (exists) return res.status(409).json({ message: 'Username already exists' });
            user.username = value.username;
        }
        if (value.role) user.role = value.role;
        if (value.password) user.password = value.password;
        if (value.permissions) {
            user.permissions = normalizePermissions(value.permissions, value.role || user.role);
        }

        if (user.role === 'admin') {
            user.permissions = getDefaultPermissions('admin');
        }

        await user.save();
        res.json({ _id: user._id, username: user.username, role: user.role, permissions: user.permissions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (isLockedDefaultAdmin(user)) {
            return res.status(403).json({ message: 'Default admin cannot be deleted' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
};
