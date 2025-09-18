const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Please add a field key'],
    trim: true
  },
  value: {
    ocred_location: {
    x1: { type: Number, default: 0 },
    y1: { type: Number, default: 0 },
    x2: { type: Number, default: 0 },
    y2: { type: Number, default: 0 }
    // OR, if you want to accept any shape: use Mixed
    // ocred_location: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
    identifiable: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'qr'],
      default: 'string'
    },
    length: {
      type: Number,
      default: 0
    },
    fixedLength: {
      type: Boolean,
      default: false
    },
    otherNames: {
      type: [String],
      default: []
    }
  }
});

const CertificateCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  templateImage: {
    type: String,
    required: [true, 'Please add a template image']
  },
  fields: [FieldSchema],
  commonFields: {
    type: [String],
    default: []
  },
  logoOnCert: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Reverse populate with virtuals
CertificateCategorySchema.virtual('certificateCount', {
  ref: 'Certificate',
  localField: '_id',
  foreignField: 'category',
  count: true
});

module.exports = mongoose.model('CertificateCategory', CertificateCategorySchema);