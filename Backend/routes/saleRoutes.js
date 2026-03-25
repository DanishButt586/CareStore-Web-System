const express = require('express');
const router = express.Router();
const { createSale, getSales, updateSale, deleteSale } = require('../controllers/saleController');
const { protect, checkPermission } = require('../middleware/auth');

router.route('/').get(protect, checkPermission('bills'), getSales).post(protect, checkPermission('pos'), createSale);
router.route('/:id').put(protect, checkPermission('bills'), updateSale).delete(protect, checkPermission('bills'), deleteSale);

module.exports = router;