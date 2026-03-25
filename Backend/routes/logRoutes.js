const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/logController');
const { protect, checkPermission } = require('../middleware/auth');

router.get('/', protect, checkPermission('logs'), getLogs);

module.exports = router;