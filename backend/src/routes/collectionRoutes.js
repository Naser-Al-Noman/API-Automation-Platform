const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { optionalJsonFile } = require('../middleware/upload');
const {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
} = require('../controllers/collectionController');

const router = express.Router();

router.use(verifyToken);

router.get('/', listCollections);
router.post('/', optionalJsonFile, createCollection);
router.get('/:id', getCollection);
router.put('/:id', optionalJsonFile, updateCollection);
router.delete('/:id', deleteCollection);

module.exports = router;
