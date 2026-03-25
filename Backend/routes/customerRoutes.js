const express = require('express');
const router = express.Router();
const {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
} = require('../controllers/customerController');
const { protect, checkRole } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getCustomers).post(checkRole('admin', 'staff'), createCustomer);
router.route('/:id').get(getCustomerById).put(checkRole('admin', 'staff'), updateCustomer).delete(checkRole('admin'), deleteCustomer);

module.exports = router;
