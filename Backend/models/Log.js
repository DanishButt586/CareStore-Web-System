const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    actor: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        username: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            required: true,
            trim: true,
        },
    },
    category: {
        type: String,
        enum: ['auth', 'change'],
        default: 'change',
        index: true,
    },
    action: {
        type: String,
        required: true,
        trim: true,
    },
    target: {
        resource: {
            type: String,
            default: 'system',
            trim: true,
        },
        id: {
            type: String,
            default: null,
        },
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    ip: {
        type: String,
        default: null,
    },
    userAgent: {
        type: String,
        default: null,
    },
}, { timestamps: true });

const blockDeletion = function (next) {
    next(new Error('Logs cannot be deleted'));
};

logSchema.pre('deleteOne', { document: true, query: false }, blockDeletion);
logSchema.pre('deleteOne', { document: false, query: true }, blockDeletion);
logSchema.pre('deleteMany', blockDeletion);
logSchema.pre('findOneAndDelete', blockDeletion);
logSchema.pre('findByIdAndDelete', blockDeletion);

module.exports = mongoose.model('Log', logSchema);