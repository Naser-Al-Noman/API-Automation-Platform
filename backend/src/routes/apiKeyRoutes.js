const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const {
  createApiKey,
  listApiKeys,
  deleteApiKey,
} = require('../controllers/apiKeyController');

const router = express.Router();

router.use(verifyToken);

router.get('/', listApiKeys);
router.post('/', createApiKey);
router.delete('/:id', deleteApiKey);

module.exports = router;
