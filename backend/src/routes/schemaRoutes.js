const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const {
  createSchema,
  listSchemas,
  getSchema,
  updateSchema,
  deleteSchema,
} = require('../controllers/schemaController');

const router = express.Router();

router.use(verifyToken);

router.post('/', createSchema);
router.get('/', listSchemas);
router.get('/:id', getSchema);
router.put('/:id', updateSchema);
router.delete('/:id', deleteSchema);

module.exports = router;
