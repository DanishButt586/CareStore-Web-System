const Medicine = require('../models/Medicine');
const Joi = require('joi');

const medicineSchema = Joi.object({
    name: Joi.string().required(),
    category: Joi.string().required(),
    batch_number: Joi.string().required(),
    expiry_date: Joi.date().required(),
    price: Joi.number().min(0).required(),
    quantity: Joi.number().min(0).required(),
    low_stock_threshold: Joi.number().min(0).default(10)
});

const areEqualValues = (previousValue, nextValue) => {
    const prevDate = previousValue instanceof Date ? previousValue : null;
    const nextDate = nextValue instanceof Date ? nextValue : null;

    if (prevDate || nextDate) {
        const prevMs = prevDate ? prevDate.getTime() : new Date(previousValue).getTime();
        const nextMs = nextDate ? nextDate.getTime() : new Date(nextValue).getTime();
        return Number.isFinite(prevMs) && Number.isFinite(nextMs) && prevMs === nextMs;
    }

    return previousValue === nextValue;
};

const toLogValue = (value) => {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    return value ?? null;
};

const getMedicines = async (req, res) => {
    try {
        const medicines = await Medicine.find();
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMedicineById = async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createMedicine = async (req, res) => {
    try {
        const { error, value } = medicineSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const medicine = await Medicine.create(value);
        res.status(201).json(medicine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateMedicine = async (req, res) => {
    try {
        const { error, value } = medicineSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) return res.status(404).json({ message: 'Medicine not found' });

        const changedFields = Object.keys(value).filter((key) => !areEqualValues(medicine[key], value[key]));
        const fieldChanges = changedFields.reduce((acc, key) => {
            acc[key] = {
                previous: toLogValue(medicine[key]),
                next: toLogValue(value[key]),
            };
            return acc;
        }, {});

        Object.assign(medicine, value);
        await medicine.save();

        req.activityLog = {
            changedFields,
            fieldChanges,
            payloadPreview: {
                name: medicine.name,
                ...(changedFields.includes('quantity') ? { quantity: medicine.quantity } : {}),
                ...(changedFields.includes('price') ? { price: medicine.price } : {}),
                ...(changedFields.includes('batch_number') ? { batch_number: medicine.batch_number } : {}),
                ...(changedFields.includes('expiry_date') ? { expiry_date: medicine.expiry_date } : {}),
                ...(changedFields.includes('category') ? { category: medicine.category } : {}),
                ...(changedFields.includes('low_stock_threshold') ? { low_stock_threshold: medicine.low_stock_threshold } : {}),
            },
        };

        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteMedicine = async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndDelete(req.params.id);
        if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
        res.json({ message: 'Medicine removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAlerts = async (req, res) => {
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const alerts = await Medicine.find({
            $or: [
                { $expr: { $lte: ['$quantity', '$low_stock_threshold'] } },
                { expiry_date: { $lte: thirtyDaysFromNow } }
            ]
        });

        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMedicines,
    getMedicineById,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    getAlerts
};