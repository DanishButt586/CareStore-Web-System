require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const { seedBusinessData } = require('../services/seedBusinessData');

const connectDB = async () => {
    const uris = [process.env.MONGODB_URI, process.env.MONGODB_URI_FALLBACK].filter(Boolean);

    for (const uri of uris) {
        try {
            const conn = await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
            });
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return true;
        } catch (error) {
            console.error(`MongoDB connection failed for ${uri.includes('mongodb://') ? 'mongodb://...' : 'mongodb+srv://...'}: ${error.message}`);
        }
    }

    return false;
};

const run = async () => {
    const isDbConnected = await connectDB();
    if (!isDbConnected) {
        console.error('Unable to connect database. Seeding aborted.');
        process.exit(1);
    }

    const adminUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    const result = await seedBusinessData({ processedBy: adminUser });

    console.log(`Suppliers seeded/updated: ${result.suppliersSeeded}`);
    console.log(`Customers seeded/updated: ${result.customersSeeded}`);
    console.log(`Purchases newly inserted: ${result.purchasesSeeded}`);

    await mongoose.disconnect();
    console.log('Business data seeding complete.');
};

run().catch(async (error) => {
    console.error(`Business data seeding failed: ${error.message}`);
    try {
        await mongoose.disconnect();
    } catch (_e) {
        // no-op
    }
    process.exit(1);
});