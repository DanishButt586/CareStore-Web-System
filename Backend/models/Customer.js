const mongoose = require('mongoose');

const customerPurchaseSchema = new mongoose.Schema(
    {
        saleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sale',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        purchasedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: '',
        },
        address: {
            type: String,
            trim: true,
            default: '',
        },
        purchase_history: [customerPurchaseSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
