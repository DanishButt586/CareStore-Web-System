const express = require('express');
const router = express.Router();
const {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    addTransaction,
} = require('../controllers/supplierController');
const { protect, checkRole } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getSuppliers).post(checkRole('admin'), createSupplier);
router.route('/:id').put(checkRole('admin'), updateSupplier).delete(checkRole('admin'), deleteSupplier);
router.post('/:id/transactions', checkRole('admin'), addTransaction);

module.exports = router;
