const express = require('express');
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/certificateCategoryController');

const { protect, authorize } = require('../middlewares/auth');
const { uploadFields  } = require('../middlewares/fileUpload');

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('issuer', 'admin'), uploadFields([
    { name: 'templateImage', maxCount: 1 },
    { name: 'logoOnCert', maxCount: 1 }
  ]), createCategory)
  .get(protect, authorize('issuer', 'admin'), getCategories);

router
  .route('/:id')
  .get(protect, authorize('issuer', 'admin'), getCategory)
  .put(protect, authorize('issuer', 'admin'), uploadFields([
    { name: 'templateImage', maxCount: 1 },
    { name: 'logoOnCert', maxCount: 1 }
  ]), updateCategory)
  .delete(protect, authorize('issuer', 'admin'), deleteCategory);

module.exports = router;