const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now,
    },
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['payment', 'invoice'],
        required: true,
    },
    details: String,
});

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    contact: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    transaction_history: [transactionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);