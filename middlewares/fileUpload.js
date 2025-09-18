const multer = require('multer');
const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const config = require('../config/config');

// Set storage engine
const storage = multer.memoryStorage();

// Check file type
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const filetypes = /jpeg|jpg|png|gif|pdf/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new ErrorResponse('File type not supported', 400));
  }
};

// Initialize upload
const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter
});

// Middleware for single file upload
exports.uploadSingleFile = (fieldName) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);
    
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ErrorResponse(`File size should be less than ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`, 400));
          }
          return next(new ErrorResponse(err.message, 400));
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for multiple files upload
exports.uploadMultipleFiles = (fieldName, maxCount = 10) => {
  return (req, res, next) => {
    const uploadMultiple = upload.array(fieldName, maxCount);
    
    uploadMultiple(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ErrorResponse(`File size should be less than ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`, 400));
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ErrorResponse(`Maximum ${maxCount} files allowed`, 400));
          }
          return next(new ErrorResponse(err.message, 400));
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for multiple specific fields
exports.uploadFields = (fields) => {
  return (req, res, next) => {
    const uploadFields = upload.fields(fields);

    uploadFields(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new ErrorResponse(
                `File size should be less than ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`,
                400
              )
            );
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(
              new ErrorResponse(`Unexpected file field or too many files uploaded`, 400)
            );
          }
          return next(new ErrorResponse(err.message, 400));
        }
        return next(err);
      }
      next();
    });
  };
};
