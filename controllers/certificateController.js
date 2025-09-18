const ErrorResponse = require('../utils/errorResponse');
const Certificate = require('../models/Certificate');
const CertificateCategory = require('../models/CertificateCategory');
const { saveFile } = require('../services/storageService');
const { processImage, processBatchImages } = require('../services/ocrService');
const { generateCertificateHash } = require('../utils/hashGenerator');

/**
 * @desc    Upload single certificate
 * @route   POST /api/v1/certificates/upload
 * @access  Private (Issuer only)
 */
exports.uploadCertificate = async (req, res, next) => {
  try {
    const { categoryId } = req.body;
    
    if (!categoryId) {
      return next(new ErrorResponse('Please provide a category ID', 400));
    }
    
    if (!req.file) {
      return next(new ErrorResponse('Please upload a certificate image', 400));
    }
    
    // Check if category exists and belongs to user
    const category = await CertificateCategory.findById(categoryId);
    
    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${categoryId}`, 404));
    }
    
    // Make sure user is the category owner
    if (category.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to upload certificates to this category`,
          403
        )
      );
    }
    
    // Save certificate image
    const certificateImage = await saveFile(req.file, 'certificates');
    
    // Process image with OCR (dummy implementation)
    const templateFields = category.fields.map(field => ({
      key: field.key,
      ...field.value
    }));
    
    const ocrResult = await processImage(certificateImage.filePath, templateFields);
    
    if (!ocrResult.success) {
      return next(new ErrorResponse('Error processing certificate image', 500));
    }
    
    // Return OCR results for confirmation
    res.status(200).json({
      success: true,
      data: {
        certificateImage: certificateImage.filePath,
        categoryId,
        extractedData: ocrResult.extractedData,
        ocrText: ocrResult.ocrText,
        ocrLocations: ocrResult.ocrLocations
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Confirm and save certificate
 * @route   POST /api/v1/certificates/confirm
 * @access  Private (Issuer only)
 */
exports.confirmCertificate = async (req, res, next) => {
  try {
    const {
      categoryId,
      certificateImage,
      fieldData,
      rawOcrText,
      expiryDate
    } = req.body;
    
    if (!categoryId || !certificateImage || !fieldData) {
      return next(new ErrorResponse('Please provide all required fields', 400));
    }
    
    // Check if category exists and belongs to user
    const category = await CertificateCategory.findById(categoryId);
    
    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${categoryId}`, 404));
    }
    
    // Make sure user is the category owner
    if (category.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to add certificates to this category`,
          403
        )
      );
    }
    
    // Get identifiable fields from category
    const identifiableFields = {};
    category.fields.forEach(field => {
      if (field.value.identifiable && fieldData[field.key]) {
        identifiableFields[field.key] = fieldData[field.key];
      }
    });
    
    // Generate certificate hash
    const certificateHash = generateCertificateHash(identifiableFields);
    
    // Check if certificate with same hash already exists
    const existingCertificate = await Certificate.findOne({ certificateHash });
    
    if (existingCertificate) {
      return next(new ErrorResponse('Certificate with same identifiable fields already exists', 400));
    }
    
    // Extract QR code data if available
    let qrCodeData = '';
    const qrField = category.fields.find(field => field.value.type === 'qr');
    if (qrField && fieldData[qrField.key]) {
      qrCodeData = fieldData[qrField.key];
    }
    
    // Create certificate
    const certificate = await Certificate.create({
      category: categoryId,
      certificateImage,
      fieldData,
      rawOcrText: rawOcrText || existingCertificate?.rawOcrText || '',
      certificateHash,
      qrCodeData,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      issuedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: certificate
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Upload batch certificates
 * @route   POST /api/v1/certificates/upload-batch
 * @access  Private (Issuer only)
 */
exports.uploadBatchCertificates = async (req, res, next) => {
  try {
    const { categoryId } = req.body;
    
    if (!categoryId) {
      return next(new ErrorResponse('Please provide a category ID', 400));
    }
    
    if (!req.files || req.files.length === 0) {
      return next(new ErrorResponse('Please upload certificate images', 400));
    }
    
    // Check if category exists and belongs to user
    const category = await CertificateCategory.findById(categoryId);
    
    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${categoryId}`, 404));
    }
    
    // Make sure user is the category owner
    if (category.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to upload certificates to this category`,
          403
        )
      );
    }
    
    // Save certificate images
    const certificateImages = [];
    for (const file of req.files) {
      const savedFile = await saveFile(file, 'certificates');
      certificateImages.push(savedFile);
    }
    
    // Process images with OCR (dummy implementation)
    const templateFields = category.fields.map(field => ({
      key: field.key,
      ...field.value
    }));
    
    const imagePaths = certificateImages.map(img => img.filePath);
    const ocrResults = await processBatchImages(imagePaths, templateFields);
    
    if (!ocrResults.success) {
      return next(new ErrorResponse('Error processing certificate images', 500));
    }
    
    // Return OCR results for confirmation
    res.status(200).json({
      success: true,
      data: ocrResults.results.map((result, index) => ({
        certificateImage: certificateImages[index].filePath,
        categoryId,
        extractedData: result.extractedData,
        ocrText: result.ocrText,
        ocrLocations: result.ocrLocations
      }))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Confirm and save batch certificates
 * @route   POST /api/v1/certificates/confirm-batch
 * @access  Private (Issuer only)
 */
exports.confirmBatchCertificates = async (req, res, next) => {
  try {
    const { certificates } = req.body;
    
    if (!certificates || !Array.isArray(certificates) || certificates.length === 0) {
      return next(new ErrorResponse('Please provide certificates data', 400));
    }
    
    const results = [];
    const errors = [];
    
    for (const cert of certificates) {
      try {
        const {
          categoryId,
          certificateImage,
          fieldData,
          rawOcrText,
          expiryDate
        } = cert;
        
        if (!categoryId || !certificateImage || !fieldData) {
          errors.push(`Missing required fields for certificate ${certificateImage}`);
          continue;
        }
        
        // Check if category exists and belongs to user
        const category = await CertificateCategory.findById(categoryId);
        
        if (!category) {
          errors.push(`Category not found with id of ${categoryId}`);
          continue;
        }
        
        // Make sure user is the category owner
        if (category.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
          errors.push(`User ${req.user.id} is not authorized to add certificates to this category`);
          continue;
        }
        
        // Get identifiable fields from category
        const identifiableFields = {};
        category.fields.forEach(field => {
          if (field.value.identifiable && fieldData[field.key]) {
            identifiableFields[field.key] = fieldData[field.key];
          }
        });
        
        // Generate certificate hash
        const certificateHash = generateCertificateHash(identifiableFields);
        
        // Check if certificate with same hash already exists
        const existingCertificate = await Certificate.findOne({ certificateHash });
        
        if (existingCertificate) {
          errors.push(`Certificate with same identifiable fields already exists for ${certificateImage}`);
          continue;
        }
        
        // Extract QR code data if available
        let qrCodeData = '';
        const qrField = category.fields.find(field => field.value.type === 'qr');
        if (qrField && fieldData[qrField.key]) {
          qrCodeData = fieldData[qrField.key];
        }
        
        // Create certificate
        const certificate = await Certificate.create({
          category: categoryId,
          certificateImage,
          fieldData,
          rawOcrText: rawOcrText || '',
          certificateHash,
          qrCodeData,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          issuedBy: req.user.id
        });
        
        results.push(certificate);
      } catch (error) {
        errors.push(`Error processing certificate: ${error.message}`);
      }
    }
    
    res.status(201).json({
      success: true,
      data: {
        successCount: results.length,
        errorCount: errors.length,
        certificates: results,
        errors
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all certificates by category
 * @route   GET /api/v1/certificates/category/:categoryId
 * @access  Private (Issuer only)
 */
exports.getCertificatesByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    
    // Check if category exists and belongs to user
    const category = await CertificateCategory.findById(categoryId);
    
    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${categoryId}`, 404));
    }
    
    // Make sure user is the category owner
    if (category.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to view certificates in this category`,
          403
        )
      );
    }
    
    const certificates = await Certificate.find({ category: categoryId });
    
    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single certificate
 * @route   GET /api/v1/certificates/:id
 * @access  Private (Issuer only)
 */
exports.getCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('category');
    
    if (!certificate) {
      return next(
        new ErrorResponse(`Certificate not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Make sure user is the certificate issuer
    if (certificate.issuedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to view this certificate`,
          403
        )
      );
    }
    
    res.status(200).json({
      success: true,
      data: certificate
    });
  } catch (err) {
    next(err);
  }
};