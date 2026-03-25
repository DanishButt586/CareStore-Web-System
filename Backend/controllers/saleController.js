const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const Joi = require('joi');

const saleSchema = Joi.object({
    customerId: Joi.string().allow('', null),
    customer_name: Joi.string().allow('', null).default('Guest'),
    items: Joi.array().items(
        Joi.object({
            medicineId: Joi.string().required(),
            qty: Joi.number().min(1).required(),
            saleType: Joi.string().valid('tablet', 'packet').optional(),
            displayQty: Joi.number().min(1).optional(),
            packSize: Joi.number().min(1).optional(),
        })
    ).min(1).required(),
    taxRate: Joi.number().min(0).default(0.1), // 10% tax default
    discountAmt: Joi.number().min(0).default(0)
});

const sumByMedicineId = (items, key) => items.reduce((map, item) => {
    const medicineId = String(item.medicineId);
    const current = map.get(medicineId) || 0;
    map.set(medicineId, current + Number(item[key] || 0));
    return map;
}, new Map());

const buildProcessedItems = async (items, stockAllowanceByMedicineId = new Map()) => {
    let subtotal = 0;
    const processedItems = [];
    const requiredByMedicineId = new Map();

    for (const item of items) {
        const medicine = await Medicine.findById(item.medicineId);
        if (!medicine) {
            throw new Error(`Medicine not found for ID: ${item.medicineId}`);
        }

        const saleType = item.saleType === 'packet' ? 'packet' : 'tablet';
        const packSize = saleType === 'packet' ? Math.max(1, Number(item.packSize) || 10) : 1;
        const displayQty = saleType === 'packet'
            ? Math.max(1, Number(item.displayQty) || Math.floor(Number(item.qty || 0) / packSize) || 1)
            : Math.max(1, Number(item.displayQty) || Number(item.qty || 0) || 1);
        const stockQty = Math.max(1, Number(item.qty) || 0);
        const allowedStock = Number(medicine.quantity) + Number(stockAllowanceByMedicineId.get(String(medicine._id)) || 0);
        const currentRequired = Number(requiredByMedicineId.get(String(medicine._id)) || 0);
        const nextRequired = currentRequired + stockQty;

        if (nextRequired > allowedStock) {
            throw new Error(`Insufficient stock for ${medicine.name}. Available: ${allowedStock}`);
        }

        requiredByMedicineId.set(String(medicine._id), nextRequired);

        const unitPrice = medicine.price * packSize;
        const itemSubtotal = unitPrice * displayQty;
        subtotal += itemSubtotal;
        processedItems.push({
            medicineId: medicine._id,
            name: medicine.name,
            qty: displayQty,
            stockQty,
            price: unitPrice,
            saleType,
            packSize,
        });
    }

    return { subtotal, processedItems };
};

const updateCustomerHistory = async (saleId, updates = {}) => {
    const customers = await Customer.find({ 'purchase_history.saleId': saleId });

    await Promise.all(customers.map(async (customer) => {
        let changed = false;
        customer.purchase_history = customer.purchase_history.map((entry) => {
            if (String(entry.saleId) !== String(saleId)) return entry;
            changed = true;
            return {
                ...(typeof entry.toObject === 'function' ? entry.toObject() : entry),
                ...updates,
            };
        });

        if (changed) {
            await customer.save();
        }
    }));
};

const generateBillNo = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `BILL-${y}${m}${d}-${rand}`;
};

const createSale = async (req, res) => {
    try {
        const { error, value } = saleSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { customerId, customer_name, items, taxRate, discountAmt } = value;
        const { subtotal, processedItems } = await buildProcessedItems(items);

        const tax = subtotal * taxRate;
        const total_amount = subtotal + tax - discountAmt;

        await Promise.all(items.map((item) => Medicine.findByIdAndUpdate(item.medicineId, {
            $inc: { quantity: -Number(item.qty || 0) }
        })));

        const billNo = generateBillNo();

        // Save Sale
        const saleRecord = await Sale.create({
            bill_no: billNo,
            customer_name,
            items: processedItems.map((p) => ({
                medicineId: p.medicineId,
                name: p.name,
                qty: p.qty,
                stockQty: p.stockQty,
                saleType: p.saleType,
                packSize: p.packSize,
                price: p.price,
            })),
            total_amount,
            tax,
            discount: discountAmt,
            processedBy: req.user?._id
        });

        if (customerId) {
            const customer = await Customer.findById(customerId);
            if (customer) {
                customer.purchase_history.push({
                    saleId: saleRecord._id,
                    amount: total_amount,
                    purchasedAt: saleRecord.timestamp,
                });
                await customer.save();
            }
        }

        const invoice = {
            invoiceId: saleRecord._id,
            billNo: saleRecord.bill_no,
            timestamp: saleRecord.timestamp,
            customer: customer_name,
            processedBy: req.user?.username || 'admin',
            items: processedItems,
            financials: {
                subtotal,
                tax,
                discount: discountAmt,
                final_total: total_amount
            }
        };

        res.status(201).json({ message: 'Sale completed successfully', invoice });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSale = async (req, res) => {
    try {
        const { error, value } = saleSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ message: 'Bill not found' });

        const originalAllowance = sumByMedicineId(sale.items, 'stockQty');
        const { subtotal, processedItems } = await buildProcessedItems(value.items, originalAllowance);
        const tax = subtotal * value.taxRate;
        const total_amount = subtotal + tax - value.discountAmt;

        const originalStock = sumByMedicineId(sale.items, 'stockQty');
        const newStock = sumByMedicineId(processedItems, 'stockQty');
        const medicineIds = new Set([...originalStock.keys(), ...newStock.keys()]);

        await Promise.all([...medicineIds].map((medicineId) => {
            const delta = Number(originalStock.get(medicineId) || 0) - Number(newStock.get(medicineId) || 0);
            if (!delta) return Promise.resolve();
            return Medicine.findByIdAndUpdate(medicineId, { $inc: { quantity: delta } });
        }));

        sale.customer_name = value.customer_name || 'Guest';
        sale.items = processedItems.map((item) => ({
            medicineId: item.medicineId,
            name: item.name,
            qty: item.qty,
            stockQty: item.stockQty,
            saleType: item.saleType,
            packSize: item.packSize,
            price: item.price,
        }));
        sale.total_amount = total_amount;
        sale.tax = tax;
        sale.discount = value.discountAmt;
        await sale.save();

        await updateCustomerHistory(sale._id, { amount: total_amount, purchasedAt: sale.timestamp });

        const updatedSale = await Sale.findById(sale._id)
            .populate('processedBy', 'username role')
            .populate('items.medicineId', 'name');

        const invoice = {
            invoiceId: updatedSale._id,
            billNo: updatedSale.bill_no,
            timestamp: updatedSale.timestamp,
            customer: updatedSale.customer_name,
            processedBy: updatedSale.processedBy?.username || 'admin',
            items: updatedSale.items,
            financials: {
                subtotal,
                tax,
                discount: value.discountAmt,
                final_total: total_amount
            }
        };

        res.json({ message: 'Bill updated successfully', sale: updatedSale, invoice });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteSale = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ message: 'Bill not found' });

        const stockRestore = sumByMedicineId(sale.items, 'stockQty');
        await Promise.all([...stockRestore.entries()].map(([medicineId, quantity]) => Medicine.findByIdAndUpdate(medicineId, {
            $inc: { quantity }
        })));

        await Customer.updateMany(
            { 'purchase_history.saleId': sale._id },
            { $pull: { purchase_history: { saleId: sale._id } } }
        );

        await Sale.findByIdAndDelete(req.params.id);
        res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSales = async (_req, res) => {
    try {
        const sales = await Sale.find()
            .populate('processedBy', 'username role')
            .populate('items.medicineId', 'name')
            .sort({ timestamp: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createSale, getSales, updateSale, deleteSale };