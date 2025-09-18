const ErrorResponse = require('../utils/errorResponse');
const Certificate = require('../models/Certificate');
const asyncHandler = require('../middlewares/async');
const User = require('../models/User');
const CertificateCategory = require('../models/CertificateCategory');


// @desc    Verify a certificate by ID
// @route   GET /api/v1/verify/:id
// @access  Public
// ...existing code...

// @desc    Get all issuers
// @route   GET /api/v1/verify/issuers
// @access  Public
// @desc    Get all issuers with optional search
// @route   GET /api/v1/verify/issuers
// @access  Public
exports.getIssuers = asyncHandler(async (req, res, next) => {
  // Build query
  let query = { role: 'issuer' };
  
  // Add search conditions if provided
  if (req.query.name) {
    query.name = { $regex: req.query.name, $options: 'i' };
  }
  if (req.query.state) {
    query.state = { $regex: req.query.state, $options: 'i' };
  }
  if (req.query.district) {
    query.district = { $regex: req.query.district, $options: 'i' };
  }
  if (req.query.instituteType) {
    query.instituteType = { $regex: req.query.instituteType, $options: 'i' };
  }

  const issuers = await User.find(query).select(
    '_id name instituteType state district registrationId yearOfRegistration issuerId'
  );

  res.status(200).json({
    success: true,
    count: issuers.length,
    data: {
      issuers
    }
  });
});
exports.verifyCertificate = asyncHandler(async (req, res, next) => {
  const certificate = await Certificate.findById(req.params.id)
    .populate('category', 'name description')
    .populate('issuedBy', 'name instituteType registrationId issuerId');

  if (!certificate) {
    return next(
      new ErrorResponse(`Certificate not found with id of ${req.params.id}`, 404)
    );
  }

  // Increment verification count
  certificate.verificationCount += 1;
  await certificate.save();

  // Check if certificate is expired
  const isExpired = certificate.isExpired();

  res.status(200).json({
    success: true,
    data: {
      certificate: {
        _id: certificate._id,
        category: certificate.category,
        fieldData: certificate.fieldData,
        issuedBy: certificate.issuedBy,
        issuedDate: certificate.createdAt,
        expiryDate: certificate.expiryDate,
        verificationCount: certificate.verificationCount,
        status: isExpired ? 'Expired' : 'Valid'
      }
    }
  });
});
// ...existing code...

// @desc    Get certificate categories by issuer ID
// @route   GET /api/v1/verify/issuer/:id/categories
// @access  Public
exports.getIssuerCategories = asyncHandler(async (req, res, next) => {
  const issuer = await User.findById(req.params.id);

  if (!issuer || issuer.role !== 'issuer') {
    return next(
      new ErrorResponse(`No issuer found with id of ${req.params.id}`, 404)
    );
  }

  const categories = await CertificateCategory.find({ createdBy: req.params.id })
    .select('name description commonFields templateImage fields')
    .lean();

  // Filter fields to only include those with identifiable: true
  const processedCategories = categories.map(category => ({
    name: category.name,
    description: category.description,
    commonFields: category.commonFields,
    templateImage: category.templateImage,
    identifiableFields: category.fields.filter(field => field.value.identifiable)
  }));

  res.status(200).json({
    success: true,
    count: categories.length,
    data: {
      categories: processedCategories
    }
  });
});

// @desc    Verify a certificate by hash
// @route   POST /api/v1/verify/hash
// @access  Public
exports.verifyCertificateByHash = asyncHandler(async (req, res, next) => {
  const { certificateHash } = req.body;

  if (!certificateHash) {
    return next(new ErrorResponse('Please provide a certificate hash', 400));
  }

  const certificate = await Certificate.findOne({ certificateHash })
    .populate('category', 'name description')
    .populate('issuedBy', 'name instituteType registrationId issuerId');

  if (!certificate) {
    return next(
      new ErrorResponse(`No certificate found with the provided hash`, 404)
    );
  }

  // Increment verification count
  certificate.verificationCount += 1;
  await certificate.save();

  // Check if certificate is expired
  const isExpired = certificate.isExpired();

  res.status(200).json({
    success: true,
    data: {
      certificate: {
        _id: certificate._id,
        category: certificate.category,
        fieldData: certificate.fieldData,
        issuedBy: certificate.issuedBy,
        issuedDate: certificate.createdAt,
        expiryDate: certificate.expiryDate,
        verificationCount: certificate.verificationCount,
        status: isExpired ? 'Expired' : 'Valid'
      }
    }
  });
});