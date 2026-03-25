const Joi = require('joi');
const Customer = require('../models/Customer');

const customerSchema = Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().allow('').email({ tlds: { allow: false } }).default(''),
    address: Joi.string().allow('').default(''),
});

const getCustomers = async (_req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id).populate('purchase_history.saleId');
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createCustomer = async (req, res) => {
    try {
        const { error, value } = customerSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const exists = await Customer.findOne({ phone: value.phone });
        if (exists) return res.status(409).json({ message: 'Customer with this phone already exists' });

        const customer = await Customer.create(value);
        res.status(201).json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const { error, value } = customerSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const existingByPhone = await Customer.findOne({ phone: value.phone, _id: { $ne: req.params.id } });
        if (existingByPhone) return res.status(409).json({ message: 'Customer with this phone already exists' });

        const customer = await Customer.findByIdAndUpdate(req.params.id, value, { new: true });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};
