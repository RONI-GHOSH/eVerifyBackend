const express = require('express');
const {
  uploadCertificate,
  confirmCertificate,
  uploadBatchCertificates,
  confirmBatchCertificates,
  getCertificatesByCategory,
  getCertificate
} = require('../controllers/certificateController');

const { protect, authorize } = require('../middlewares/auth');
const { uploadSingleFile, uploadMultipleFiles } = require('../middlewares/fileUpload');

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(authorize('issuer', 'admin'));

// Certificate upload routes
router.post('/upload', uploadSingleFile('certificateImage'), uploadCertificate);
router.post('/confirm', confirmCertificate);

// Batch certificate routes
router.post('/upload-batch', uploadMultipleFiles('certificateImages', 10), uploadBatchCertificates);
router.post('/confirm-batch', confirmBatchCertificates);

// Get certificates by category
router.get('/category/:categoryId', getCertificatesByCategory);

// Get single certificate
router.get('/:id', getCertificate);

module.exports = router;