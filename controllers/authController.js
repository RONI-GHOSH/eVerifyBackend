const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

/**
 * @desc    Register user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const {
      name,
      instituteType,
      state,
      district,
      registrationId,
      yearOfRegistration,
      phoneNumber,
      representativeName,
      representativeDesignation,
      email,
      password,
      role
    } = req.body;

    // Create user
    const user = await User.create({
      name,
      instituteType,
      state,
      district,
      registrationId,
      yearOfRegistration,
      phoneNumber,
      representativeName,
      representativeDesignation,
      email,
      password,
      role: role || 'issuer' // Default role is issuer
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { issuerId, password } = req.body;

    // Validate issuerId and password
    if (!issuerId || !password) {
      return next(new ErrorResponse('Please provide an issuer ID and password', 400));
    }

    // Check for user
    const user = await User.findOne({ issuerId }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Log user out / clear cookie
 * @route   GET /api/v1/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {}
  });
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  // Use secure flag in production
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        issuerId: user.issuerId,
        role: user.role
      }
    });
};