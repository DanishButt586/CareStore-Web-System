const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
    },
    batch_number: {
        type: String,
        required: true,
    },
    expiry_date: {
        type: Date,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    low_stock_threshold: {
        type: Number,
        required: true,
        default: 10,
    }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);