const express = require('express');
const router = express.Router();
const { login, register, me, logout } = require('../controllers/authController');
const { protect, checkRole } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/register', protect, checkRole('admin'), register);
router.get('/me', protect, me);

module.exports = router;
