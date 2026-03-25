const express = require('express');
const router = express.Router();
const { getPurchases, createPurchase } = require('../controllers/purchaseController');
const { protect, checkRole } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getPurchases).post(checkRole('admin', 'staff'), createPurchase);

module.exports = router;
