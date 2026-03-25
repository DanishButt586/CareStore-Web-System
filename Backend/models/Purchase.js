const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
    {
        medicineId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine',
            required: true,
        },
        qty: {
            type: Number,
            required: true,
            min: 1,
        },
        costPrice: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const purchaseSchema = new mongoose.Schema(
    {
        supplierId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Supplier',
            required: true,
        },
        items: {
            type: [purchaseItemSchema],
            validate: {
                validator: (items) => Array.isArray(items) && items.length > 0,
                message: 'At least one purchase item is required',
            },
        },
        invoiceNumber: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        total_amount: {
            type: Number,
            required: true,
            min: 0,
        },
        purchasedAt: {
            type: Date,
            default: Date.now,
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Purchase', purchaseSchema);
