const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const {
  startExecution,
  listExecutions,
  getExecution,
  getExecutionStatus,
  getExecutionReport,
  downloadExecutionReport,
} = require('../controllers/executionController');

const router = express.Router();

router.use(verifyToken);

router.post('/', startExecution);
router.get('/', listExecutions);
router.get('/:id/status', getExecutionStatus);
router.get('/:id/report/download', downloadExecutionReport);
router.get('/:id/report', getExecutionReport);
router.get('/:id', getExecution);

module.exports = router;
