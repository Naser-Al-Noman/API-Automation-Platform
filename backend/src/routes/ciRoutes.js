const express = require('express');
const { verifyApiKey } = require('../middleware/apiKeyMiddleware');
const {
  startExecution,
  getExecutionStatus,
} = require('../controllers/executionController');

const router = express.Router();

// CI-facing endpoints — API key auth (not JWT)
router.post('/executions', verifyApiKey, startExecution);
router.get('/executions/:id/status', verifyApiKey, getExecutionStatus);

module.exports = router;
