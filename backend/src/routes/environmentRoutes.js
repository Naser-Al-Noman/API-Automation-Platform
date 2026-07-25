const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { optionalJsonFile } = require('../middleware/upload');
const {
  createEnvironment,
  listEnvironments,
  getEnvironment,
  updateEnvironment,
  deleteEnvironment,
} = require('../controllers/environmentController');

const router = express.Router();

router.use(verifyToken);

router.get('/', listEnvironments);
router.post('/', optionalJsonFile, createEnvironment);
router.get('/:id', getEnvironment);
router.put('/:id', optionalJsonFile, updateEnvironment);
router.delete('/:id', deleteEnvironment);

module.exports = router;
