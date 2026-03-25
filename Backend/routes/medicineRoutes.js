const express = require('express');
const router = express.Router();
const {
    getMedicines,
    getMedicineById,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    getAlerts
} = require('../controllers/medicineController');
const { protect, checkRole } = require('../middleware/auth');

router.get('/alerts', protect, getAlerts);
router.route('/')
    .get(protect, getMedicines)
    .post(protect, checkRole('admin'), createMedicine);

router.route('/:id')
    .get(protect, getMedicineById)
    .put(protect, checkRole('admin'), updateMedicine)
    .delete(protect, checkRole('admin'), deleteMedicine);

module.exports = router;