const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getPassRateTrend,
  getResponseTimes,
  getEndpointReliability,
  getSchemaValidationSummary,
} = require('../controllers/analyticsController');

const router = express.Router();

router.use(verifyToken);

router.get('/pass-rate-trend', getPassRateTrend);
router.get('/response-times', getResponseTimes);
router.get('/endpoint-reliability', getEndpointReliability);
router.get('/schema-validation-summary', getSchemaValidationSummary);

module.exports = router;
