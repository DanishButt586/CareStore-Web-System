const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    qty: {
        type: Number,
        required: true,
        min: 1,
    },
    stockQty: {
        type: Number,
        required: true,
        min: 1,
    },
    saleType: {
        type: String,
        enum: ['tablet', 'packet'],
        default: 'tablet',
    },
    packSize: {
        type: Number,
        default: 1,
        min: 1,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    }
});

const saleSchema = new mongoose.Schema({
    bill_no: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    customer_name: {
        type: String,
        trim: true,
        default: 'Guest',
    },
    items: [saleItemSchema],
    total_amount: {
        type: Number,
        required: true,
    },
    tax: {
        type: Number,
        default: 0,
    },
    discount: {
        type: Number,
        default: 0,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);