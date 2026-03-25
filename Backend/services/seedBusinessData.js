const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Purchase = require('../models/Purchase');
const Medicine = require('../models/Medicine');
const pakistanSuppliers = require('../data/pakistanSuppliers');
const pakistanCustomers = require('../data/pakistanCustomers');
const pakistanPurchases = require('../data/pakistanPurchases');

const seedBusinessData = async ({ processedBy } = {}) => {
    const supplierByName = new Map();
    let suppliersSeeded = 0;
    let customersSeeded = 0;
    let purchasesSeeded = 0;

    for (const supplier of pakistanSuppliers) {
        const doc = await Supplier.findOneAndUpdate(
            { name: supplier.name },
            {
                $set: {
                    contact: supplier.contact,
                    address: supplier.address,
                },
                $setOnInsert: {
                    name: supplier.name,
                },
            },
            { upsert: true, returnDocument: 'after', runValidators: true }
        );
        supplierByName.set(supplier.name, doc);
        suppliersSeeded += 1;
    }

    for (const customer of pakistanCustomers) {
        await Customer.findOneAndUpdate(
            { phone: customer.phone },
            {
                $set: {
                    name: customer.name,
                    email: customer.email,
                    address: customer.address,
                },
                $setOnInsert: {
                    phone: customer.phone,
                },
            },
            { upsert: true, returnDocument: 'after', runValidators: true }
        );
        customersSeeded += 1;
    }

    for (const purchase of pakistanPurchases) {
        const exists = await Purchase.findOne({ invoiceNumber: purchase.invoiceNumber });
        if (exists) {
            continue;
        }

        const supplier = supplierByName.get(purchase.supplierName)
            || await Supplier.findOne({ name: purchase.supplierName });

        if (!supplier) {
            console.warn(`Skipping purchase ${purchase.invoiceNumber}: supplier not found`);
            continue;
        }

        const itemDocs = [];
        let totalAmount = 0;
        let missingMedicine = false;

        for (const item of purchase.items) {
            const medicine = await Medicine.findOne({ name: item.medicineName });
            if (!medicine) {
                missingMedicine = true;
                console.warn(`Skipping purchase ${purchase.invoiceNumber}: medicine not found (${item.medicineName})`);
                break;
            }

            const qty = Number(item.qty);
            const costPrice = Number(item.costPrice);
            totalAmount += qty * costPrice;
            itemDocs.push({
                medicineId: medicine._id,
                qty,
                costPrice,
            });
        }

        if (missingMedicine || itemDocs.length === 0) {
            continue;
        }

        await Purchase.create({
            supplierId: supplier._id,
            items: itemDocs,
            invoiceNumber: purchase.invoiceNumber,
            total_amount: totalAmount,
            purchasedAt: new Date(purchase.purchasedAt),
            processedBy: processedBy?._id || null,
        });

        await Promise.all(itemDocs.map((item) => Medicine.findByIdAndUpdate(item.medicineId, {
            $inc: { quantity: item.qty },
        })));

        supplier.transaction_history.push({
            amount: totalAmount,
            type: 'invoice',
            details: `Purchase Invoice ${purchase.invoiceNumber}`,
            date: new Date(purchase.purchasedAt),
        });
        await supplier.save();

        purchasesSeeded += 1;
    }

    return {
        suppliersSeeded,
        customersSeeded,
        purchasesSeeded,
    };
};

module.exports = { seedBusinessData };