const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/summary', authorize('admin', 'user'), dashboardController.getSummary);

module.exports = router;
