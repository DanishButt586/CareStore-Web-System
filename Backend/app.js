require('dotenv').config({ override: true });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

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

const HARDCODED_ADMIN_USERNAME = 'Admin';
const HARDCODED_ADMIN_PASSWORD = 'Admin123@';

const app = express();

let initializationPromise = Promise.resolve();

const setInitializationPromise = (promise) => {
    initializationPromise = promise || Promise.resolve();
};

const normalizeEnvValue = (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return '';
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
};

const getAllowedOrigins = () => {
    const configured = [process.env.CORS_ORIGINS, process.env.FRONTEND_URL]
        .filter(Boolean)
        .join(',');

    return configured
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins();

        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));

app.use(async (_req, _res, next) => {
    try {
        await initializationPromise;
        next();
    } catch (error) {
        next(error);
    }
});

const connectDB = async () => {
    const primaryUri = normalizeEnvValue(
        process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL
    );
    const fallbackUri = normalizeEnvValue(process.env.MONGODB_URI_FALLBACK);
    const uris = [primaryUri, fallbackUri].filter(Boolean);

    for (const uri of uris) {
        try {
            const conn = await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
            });
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return true;
        } catch (error) {
            const safeUriLabel = uri.includes('mongodb+srv://') ? 'mongodb+srv://...' : 'mongodb://...';
            console.error(`MongoDB connection failed for URI ${safeUriLabel}: ${error.message}`);
        }
    }

    console.error('All MongoDB connection attempts failed. Check Atlas network access/DNS or use local MongoDB fallback.');
    return false;
};

const ensureDefaultAdmin = async () => {
    const username = HARDCODED_ADMIN_USERNAME;
    const password = HARDCODED_ADMIN_PASSWORD;

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

    existing.password = password;
    existing.role = 'admin';
    existing.permissions = getDefaultPermissions('admin');
    await existing.save();
    console.log(`Default admin ensured: ${username}`);
    return existing;
};

const initializeApp = async (options = {}) => {
    const runStartupSeed = options.runStartupSeed !== false;
    const ensureAdmin = options.ensureAdmin !== false;

    const isDbConnected = await connectDB();
    const allowNoDb = String(process.env.ALLOW_SERVER_WITHOUT_DB || 'false').toLowerCase() === 'true';

    if (!isDbConnected && !allowNoDb) {
        throw new Error('Database connection failed and ALLOW_SERVER_WITHOUT_DB is false.');
    }

    if (!isDbConnected && allowNoDb) {
        console.warn('Starting server without DB connection because ALLOW_SERVER_WITHOUT_DB=true');
        return { dbConnected: false };
    }

    let adminUser = null;
    if (ensureAdmin) {
        adminUser = await ensureDefaultAdmin();
    }

    if (runStartupSeed) {
        const result = await seedBusinessData({ processedBy: adminUser });
        console.log(`Business seed ready: suppliers=${result.suppliersSeeded}, customers=${result.customersSeeded}, purchases=${result.purchasesSeeded}`);
    }

    return { dbConnected: true };
};

app.get('/', (_req, res) => {
    res.send('Medical Store Management System API is running...');
});

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

app.use((err, _req, res, _next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

module.exports = {
    app,
    initializeApp,
    setInitializationPromise,
};
