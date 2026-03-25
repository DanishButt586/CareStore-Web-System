const express = require('express');
const router = express.Router();
const { getDailyReport, getStockReport, getMonthlyReport, getExpiryReport } = require('../controllers/reportController');
const { protect, checkRole } = require('../middleware/auth');

router.get('/daily', protect, checkRole('admin'), getDailyReport);
router.get('/monthly', protect, checkRole('admin'), getMonthlyReport);
router.get('/stock', protect, checkRole('admin'), getStockReport);
router.get('/expiry', protect, checkRole('admin'), getExpiryReport);

module.exports = router;