const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { getSummary } = require('../controllers/dashboardController');

const router = express.Router();

router.use(verifyToken);
router.get('/summary', getSummary);

module.exports = router;
