require('dotenv').config({ override: true });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database connection
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
            console.error(`MongoDB connection failed for URI ${uri.includes('mongodb+srv://') ? 'mongodb+srv://...' : 'mongodb://...'}: ${error.message}`);
        }
    }

    console.error('All MongoDB connection attempts failed. Check Atlas network access/DNS or use local MongoDB fallback.');
    return false;
};

// Basic route
app.get('/', (req, res) => {
    res.send('Medical Store Management System API is running...');
});

// Example usage of routes and middlewares (To be implemented in route files)
const medicineRoutes = require('./routes/medicineRoutes');
const saleRoutes = require('./routes/saleRoutes');
const reportRoutes = require('./routes/reportRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const customerRoutes = require('./routes/customerRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const logRoutes = require('./routes/logRoutes');
const User = require('./models/User');
const { getDefaultPermissions } = require('./data/appSections');
const { activityLogger } = require('./middleware/activityLogger');
const { seedBusinessData } = require('./services/seedBusinessData');

app.use(activityLogger);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/logs', logRoutes);

app.get('/api/health', (_req, res) => {
    const dbReadyState = mongoose.connection.readyState;
    const dbStateLabel = dbReadyState === 1 ? 'connected' : dbReadyState === 2 ? 'connecting' : dbReadyState === 3 ? 'disconnecting' : 'disconnected';
    res.json({
        status: 'ok',
        db: dbStateLabel,
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

const ensureDefaultAdmin = async () => {
    const username = process.env.DEFAULT_ADMIN_USERNAME || 'Admin';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123@';

    const existing = await User.findOne({ username });
    if (!existing) {
        const created = await User.create({
            username,
            password,
            role: 'admin',
            permissions: getDefaultPermissions('admin'),
        });
        console.log(`Default admin created: ${username}`);
        return created;
    }

    // Keep configured credentials in sync for predictable first login.
    existing.password = password;
    existing.role = 'admin';
    existing.permissions = getDefaultPermissions('admin');
    await existing.save();
    console.log(`Default admin ensured: ${username}`);
    return existing;
};

connectDB().then((isDbConnected) => {
    const allowNoDb = String(process.env.ALLOW_SERVER_WITHOUT_DB || 'false').toLowerCase() === 'true';

    if (!isDbConnected && !allowNoDb) {
        process.exit(1);
    }

    if (!isDbConnected && allowNoDb) {
        console.warn('Starting server without DB connection because ALLOW_SERVER_WITHOUT_DB=true');
    }

    if (isDbConnected) {
        ensureDefaultAdmin().then(async (adminUser) => {
            const result = await seedBusinessData({ processedBy: adminUser });
            console.log(`Business seed ready: suppliers=${result.suppliersSeeded}, customers=${result.customersSeeded}, purchases=${result.purchasesSeeded}`);
        }).catch((error) => {
            console.error(`Failed to ensure default admin user: ${error.message}`);
        });
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});