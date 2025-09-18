const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'CertificateCategory',
    required: true
  },
  certificateImage: {
    type: String,
    required: [true, 'Please add a certificate image']
  },
  fieldData: {
    type: Map,
    of: String,
    default: {}
  },
  rawOcrText: {
    type: String,
    default: ''
  },
  certificateHash: {
    type: String,
    required: true,
    unique: true
  },
  qrCodeData: {
    type: String,
    default: ''
  },
  verificationCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiryDate: {
    type: Date,
    default: null
  },
  issuedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster searching
CertificateSchema.index({ certificateHash: 1 });
CertificateSchema.index({ category: 1 });
CertificateSchema.index({ issuedBy: 1 });

// Check if certificate is expired
CertificateSchema.methods.isExpired = function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
};

// Increment verification count
CertificateSchema.methods.incrementVerificationCount = async function() {
  this.verificationCount += 1;
  await this.save();
  return this.verificationCount;
};

module.exports = mongoose.model('Certificate', CertificateSchema);