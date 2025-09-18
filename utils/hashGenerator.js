const crypto = require('crypto');

/**
 * Generate a hash from certificate data
 * This hash can be used for verification purposes
 * @param {Object} data - Certificate data to hash
 * @returns {String} - Hash string
 */
const generateCertificateHash = (data) => {
  if (!data || Object.keys(data).length === 0) {
    throw new Error('Data is required for hash generation');
  }
  
  // Sort keys to ensure consistent hash generation
  const sortedData = {};
  Object.keys(data).sort().forEach(key => {
    sortedData[key] = data[key];
  });
  
  const dataString = JSON.stringify(sortedData);
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

module.exports = {
  generateCertificateHash
};