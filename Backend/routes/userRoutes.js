const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect, checkRole } = require('../middleware/auth');

router.use(protect, checkRole('admin'));
router.route('/').get(getUsers).post(createUser);
router.route('/:id').put(updateUser).delete(deleteUser);

module.exports = router;
