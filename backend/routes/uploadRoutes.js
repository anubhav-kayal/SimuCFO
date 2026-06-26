const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { handleUpload, handleCompare, handleSensitivity, handleBenchmark } = require('../controllers/uploadController');
const { handleAsk, handleSessions, handleGetSession, handleDeleteSession } = require('../controllers/askController');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file) => {
    return file.mimetype === 'application/pdf';
  },
});

router.post('/upload', upload.array('pdfFile', 10), (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Maximum size is 50MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ message: 'Too many files. Maximum is 10.' });
    }
    return res.status(400).json({ message: err.message || 'Upload error' });
  }
  next();
}, handleUpload);

router.post('/ask', handleAsk);

router.post('/sensitivity', upload.array('pdfFile', 10), (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Maximum size is 50MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ message: 'Too many files. Maximum is 10.' });
    }
    return res.status(400).json({ message: err.message || 'Upload error' });
  }
  next();
}, handleSensitivity);

router.post('/compare', upload.array('pdfFile', 10), (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Maximum size is 50MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ message: 'Too many files. Maximum is 10.' });
    }
    return res.status(400).json({ message: err.message || 'Upload error' });
  }
  next();
}, handleCompare);

router.post('/benchmark', upload.array('pdfFile', 10), (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Maximum size is 50MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ message: 'Too many files. Maximum is 10.' });
    }
    return res.status(400).json({ message: err.message || 'Upload error' });
  }
  next();
}, handleBenchmark);

router.get('/sessions', handleSessions);
router.get('/sessions/:id', handleGetSession);
router.delete('/sessions/:id', handleDeleteSession);

module.exports = router;
