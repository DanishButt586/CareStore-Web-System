const Joi = require('joi');
const Supplier = require('../models/Supplier');

const supplierSchema = Joi.object({
    name: Joi.string().required(),
    contact: Joi.string().required(),
    address: Joi.string().required(),
});

const transactionSchema = Joi.object({
    amount: Joi.number().min(0).required(),
    type: Joi.string().valid('payment', 'invoice').required(),
    details: Joi.string().allow('').default(''),
    date: Joi.date().optional(),
});

const getSuppliers = async (_req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ createdAt: -1 });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createSupplier = async (req, res) => {
    try {
        const { error, value } = supplierSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const supplier = await Supplier.create(value);
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSupplier = async (req, res) => {
    try {
        const { error, value } = supplierSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const supplier = await Supplier.findByIdAndUpdate(req.params.id, value, { new: true });
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addTransaction = async (req, res) => {
    try {
        const { error, value } = transactionSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        supplier.transaction_history.push(value);
        await supplier.save();
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    addTransaction,
};
