const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const okType =
      file.mimetype === 'application/json' ||
      file.mimetype === 'application/octet-stream' ||
      file.mimetype === 'text/plain' ||
      name.endsWith('.json');

    if (!okType) {
      return cb(new Error('Only JSON files are allowed'));
    }
    return cb(null, true);
  },
});

function optionalJsonFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    return next();
  });
}

function parseUploadedJson(req) {
  if (!req.file) {
    return null;
  }

  try {
    const text = req.file.buffer.toString('utf8');
    return JSON.parse(text);
  } catch {
    const error = new Error('Uploaded file is not valid JSON');
    error.status = 400;
    throw error;
  }
}

module.exports = {
  optionalJsonFile,
  parseUploadedJson,
};
