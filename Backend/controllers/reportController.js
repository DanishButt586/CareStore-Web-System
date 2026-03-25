const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');

const getDailyReport = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const dailyMetrics = await Sale.aggregate([
            {
                $match: {
                    timestamp: { $gte: startOfDay, $lte: endOfDay }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total_amount' },
                    totalTax: { $sum: '$tax' },
                    totalDiscount: { $sum: '$discount' },
                    totalSalesCount: { $sum: 1 }
                }
            }
        ]);

        res.json({
            date: startOfDay.toISOString().split('T')[0],
            metrics: dailyMetrics[0] || { totalRevenue: 0, totalTax: 0, totalDiscount: 0, totalSalesCount: 0 }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getStockReport = async (req, res) => {
    try {
        const stockMetrics = await Medicine.aggregate([
            {
                $group: {
                    _id: '$category',
                    totalQuantity: { $sum: '$quantity' },
                    totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
                    medicinesCount: { $sum: 1 }
                }
            },
            {
                $sort: { totalValue: -1 }
            }
        ]);

        const aggregateTotals = stockMetrics.reduce(
            (acc, curr) => ({
                totalQuantityAll: acc.totalQuantityAll + curr.totalQuantity,
                totalValueAll: acc.totalValueAll + curr.totalValue,
            }),
            { totalQuantityAll: 0, totalValueAll: 0 }
        );

        res.json({
            summary: aggregateTotals,
            categories: stockMetrics
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMonthlyReport = async (_req, res) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyMetrics = await Sale.aggregate([
            {
                $match: {
                    timestamp: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: '$timestamp' },
                        month: { $month: '$timestamp' },
                        year: { $year: '$timestamp' },
                    },
                    totalRevenue: { $sum: '$total_amount' },
                    totalSalesCount: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        const summary = await Sale.aggregate([
            {
                $match: {
                    timestamp: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total_amount' },
                    totalSalesCount: { $sum: 1 }
                }
            }
        ]);

        res.json({
            summary: summary[0] || { totalRevenue: 0, totalSalesCount: 0 },
            days: monthlyMetrics,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getExpiryReport = async (_req, res) => {
    try {
        const today = new Date();
        const next30Days = new Date();
        next30Days.setDate(next30Days.getDate() + 30);

        const expired = await Medicine.find({ expiry_date: { $lt: today } }).sort({ expiry_date: 1 });
        const nearExpiry = await Medicine.find({ expiry_date: { $gte: today, $lte: next30Days } }).sort({ expiry_date: 1 });

        res.json({
            summary: {
                expiredCount: expired.length,
                nearExpiryCount: nearExpiry.length,
            },
            expired,
            nearExpiry,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDailyReport,
    getStockReport,
    getMonthlyReport,
    getExpiryReport,
};