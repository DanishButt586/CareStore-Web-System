const Joi = require('joi');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const Medicine = require('../models/Medicine');

const purchaseSchema = Joi.object({
    supplierId: Joi.string().required(),
    invoiceNumber: Joi.string().required(),
    items: Joi.array()
        .items(
            Joi.object({
                medicineId: Joi.string().required(),
                qty: Joi.number().min(1).required(),
                costPrice: Joi.number().min(0).required(),
            })
        )
        .min(1)
        .required(),
});

const getPurchases = async (_req, res) => {
    try {
        const purchases = await Purchase.find()
            .populate('supplierId', 'name')
            .populate('items.medicineId', 'name')
            .sort({ purchasedAt: -1 });
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createPurchase = async (req, res) => {
    try {
        const { error, value } = purchaseSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const supplier = await Supplier.findById(value.supplierId);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        const duplicateInvoice = await Purchase.findOne({ invoiceNumber: value.invoiceNumber });
        if (duplicateInvoice) return res.status(409).json({ message: 'Invoice number already exists' });

        let total_amount = 0;
        for (const item of value.items) {
            const med = await Medicine.findById(item.medicineId);
            if (!med) return res.status(404).json({ message: `Medicine not found: ${item.medicineId}` });
            total_amount += item.qty * item.costPrice;
        }

        for (const item of value.items) {
            await Medicine.findByIdAndUpdate(item.medicineId, { $inc: { quantity: item.qty } });
        }

        const purchase = await Purchase.create({
            ...value,
            total_amount,
            processedBy: req.user?._id,
        });

        supplier.transaction_history.push({
            amount: total_amount,
            type: 'invoice',
            details: `Purchase Invoice ${value.invoiceNumber}`,
            date: new Date(),
        });
        await supplier.save();

        const populated = await Purchase.findById(purchase._id)
            .populate('supplierId', 'name')
            .populate('items.medicineId', 'name');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPurchases,
    createPurchase,
};
