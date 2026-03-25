require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const pakistanMedicines = require('../data/pakistanMedicines');

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

const seedMedicines = async () => {
    const isDbConnected = await connectDB();
    if (!isDbConnected) {
        console.error('Unable to connect database. Seeding aborted.');
        process.exit(1);
    }

    let insertedOrUpdated = 0;

    for (const med of pakistanMedicines) {
        await Medicine.findOneAndUpdate(
            { batch_number: med.batch_number },
            { $set: med },
            { upsert: true, returnDocument: 'after', runValidators: true }
        );
        insertedOrUpdated += 1;
    }

    const total = await Medicine.countDocuments();
    console.log(`Medicines seeded/updated: ${insertedOrUpdated}`);
    console.log(`Total medicines in database: ${total}`);

    await mongoose.disconnect();
    console.log('Seeding complete.');
};

seedMedicines().catch(async (error) => {
    console.error(`Seeding failed: ${error.message}`);
    try {
        await mongoose.disconnect();
    } catch (_e) {
        // no-op
    }
    process.exit(1);
});
