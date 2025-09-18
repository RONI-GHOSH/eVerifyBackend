const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./db/connection');
const errorHandler = require('./middlewares/error');
const { createUploadDirs } = require('./services/storageService');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Create upload directories
createUploadDirs();

// Route files
const authRoutes = require('./routes/authRoutes');
const certificateCategoryRoutes = require('./routes/certificateCategoryRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const verifierRoutes = require('./routes/verifierRoutes');

const app = express();

// Body parser
app.use(express.json());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', certificateCategoryRoutes);
app.use('/api/v1/certificates', certificateRoutes);
app.use('/api/v1/verify', verifierRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Certificate Verification Portal API',
    version: '1.0.0'
  });
});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});