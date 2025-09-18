const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  instituteType: {
    type: String,
    required: [true, 'Please add institute type'],
    enum: ['college', 'university', 'school', 'other']
  },
  state: {
    type: String,
    required: [true, 'Please add state'],
    trim: true
  },
  district: {
    type: String,
    required: [true, 'Please add district'],
    trim: true
  },
  registrationId: {
    type: String,
    required: [true, 'Please add registration ID'],
    unique: true,
    trim: true
  },
  yearOfRegistration: {
    type: Number,
    required: [true, 'Please add year of registration']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please add phone number'],
    match: [/^\d{10}$/, 'Please add a valid 10-digit phone number']
  },
  representativeName: {
    type: String,
    required: [true, 'Please add representative name'],
    trim: true
  },
  representativeDesignation: {
    type: String,
    required: [true, 'Please add representative designation'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  issuerId: {
    type: String,
    unique: true
  },
  role: {
    type: String,
    enum: ['issuer', 'verifier', 'admin'],
    default: 'issuer'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate issuer ID before saving
UserSchema.pre('save', async function(next) {
  if (!this.issuerId) {
    // Generate issuer ID: ISS-<YEAR>-<5 random digits>
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    this.issuerId = `ISS-${year}-${randomDigits}`;
  }
  next();
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);