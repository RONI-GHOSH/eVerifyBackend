const ErrorResponse = require('../utils/errorResponse');
const CertificateCategory = require('../models/CertificateCategory');
const { saveFile, deleteFile } = require('../services/storageService');
const path = require('path');

/**
 * @desc    Create new certificate category
 * @route   POST /api/v1/categories
 * @access  Private (Issuer only)
 */
exports.createCategory = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;
    
    // Handle template image upload
    // if (!req.file) {
    //   return next(new ErrorResponse('Please upload a template image', 400));
    // }
    
    // // Save template image
    // const templateImage = await saveFile(req.file, 'templates');
    // req.body.templateImage = templateImage.filePath;

    
    
    // // Handle logo upload if provided
    // if (req.body.logoOnCert && req.body.logoOnCert !== '') {
    //   // Assuming logoOnCert is a base64 image or URL
    //   // For now, we'll just use the provided value
    //   // In a real implementation, you would handle file upload or URL validation
    // }
    if (req.body.fields && typeof req.body.fields === 'string') {
  try {
    req.body.fields = JSON.parse(req.body.fields);
  } catch (e) {
    return next(new ErrorResponse('Invalid JSON format for fields', 400));
  }
}

    // Handle template image upload
    if (!req.files || !req.files.templateImage[0]) {
      return next(new ErrorResponse('Please upload a template image', 400));
    }

    // Save template image
    const templateImage = await saveFile(req.files.templateImage[0], 'templates');
    req.body.templateImage = templateImage.filePath;

    // Handle logo upload if provided
    if (req.files && req.files.logoOnCert[0]) {
      const logoFile = await saveFile(req.files.logoOnCert[0], 'logos');
      req.body.logoOnCert = logoFile.filePath;
    }
    
    // Create category
    const category = await CertificateCategory.create(req.body);
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all certificate categories
 * @route   GET /api/v1/categories
 * @access  Private (Issuer only)
 */
exports.getCategories = async (req, res, next) => {
  try {
    // Find categories created by the logged-in user
    const categories = await CertificateCategory.find({ createdBy: req.user.id })
      .populate('certificateCount');
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single certificate category
 * @route   GET /api/v1/categories/:id
 * @access  Private (Issuer only)
 */
exports.getCategory = async (req, res, next) => {
  try {
    const category = await CertificateCategory.findById(req.params.id)
      .populate('certificateCount');
    
    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Make sure user is the category owner
    if (category.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this category`,
          403
        )
      );
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update certificate category
 * @route   PUT /api/v1/categories/:id
 * @access  Private (Issuer only)
 */
exports.updateCategory = async (req, res, next) => {
  try {
    let category = await CertificateCategory.findById(req.params.id);
    
    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Make sure user is the category owner
    if (category.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to update this category`,
          403
        )
      );
    }
    
     // Handle template image upload if provided
    if (req.files && req.files.templateImage[0]) {
      await deleteFile(category.templateImage);
      const templateImage = await saveFile(req.files.templateImage[0], 'templates');
      req.body.templateImage = templateImage.filePath;
    }

    // Handle logo upload if provided
    if (req.files && req.files.logoOnCert[0]) { 
      if (category.logoOnCert) {
        await deleteFile(category.logoOnCert);  
      }
      const logoFile = await saveFile(req.files.logoOnCert[0], 'logos');
      req.body.logoOnCert = logoFile.filePath;
    }

    
    // Update category
    category = await CertificateCategory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete certificate category
 * @route   DELETE /api/v1/categories/:id
 * @access  Private (Issuer only)
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await CertificateCategory.findById(req.params.id);
    
    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Make sure user is the category owner
    if (category.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to delete this category`,
          403
        )
      );
    }
    
    // Delete template image
    await deleteFile(category.templateImage);
    
    // Delete category
    await category.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};