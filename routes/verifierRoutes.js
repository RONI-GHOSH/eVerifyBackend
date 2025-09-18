const express = require('express');
const {
  verifyCertificate,
  verifyCertificateByHash,
  getIssuers,
  getIssuerCategories
} = require('../controllers/verifierController');


const router = express.Router();

// Public routes for certificate verification
router.get('/issuers', getIssuers);
router.get('/issuer/:id/categories', getIssuerCategories);
router.post('/hash', verifyCertificateByHash);
router.get('/:id', verifyCertificate);
module.exports = router;