/**
 * Dummy OCR Service
 * This service simulates OCR functionality for certificate processing
 * In a production environment, this would be replaced with Google Document AI or similar
 */

// Simulate OCR processing on an image
const processImage = async (imagePath, templateFields = []) => {
  try {
    // In a real implementation, this would process the actual image
    // For now, we'll return dummy data based on the template fields
    
    const extractedData = {};
    const ocrText = 'This is a sample certificate text extracted from OCR';
    
    // Generate dummy data for each field in the template
    if (templateFields && templateFields.length > 0) {
      templateFields.forEach(field => {
        if (field.key === 'cert.no.' || field.key === 'sr.no.' || field.key === 'reg.no.') {
          extractedData[field.key] = Math.floor(10000 + Math.random() * 90000).toString();
        } else if (field.key === 'name') {
          extractedData[field.key] = 'John Doe';
        } else if (field.key === 'date') {
          const date = new Date();
          extractedData[field.key] = date.toISOString().split('T')[0];
        } else if (field.key === 'course') {
          extractedData[field.key] = 'Bachelor of Technology';
        } else if (field.key === 'grade' || field.key === 'cgpa') {
          extractedData[field.key] = (Math.random() * 4 + 6).toFixed(2);
        } else if (field.key === 'qr_code' && field.type === 'qr') {
          extractedData[field.key] = 'https://example.com/verify/cert-' + Math.floor(10000 + Math.random() * 90000);
        } else {
          extractedData[field.key] = `Sample ${field.key} data`;
        }
      });
    }
    
    // Simulate OCR locations
    const ocrLocations = templateFields.map(field => {
      return {
        key: field.key,
        location: {
          x1: Math.floor(Math.random() * 100),
          y1: Math.floor(Math.random() * 100),
          x2: Math.floor(Math.random() * 100) + 100,
          y2: Math.floor(Math.random() * 100) + 100
        }
      };
    });
    
    return {
      success: true,
      extractedData,
      ocrText,
      ocrLocations
    };
  } catch (error) {
    console.error('Error in OCR processing:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Process batch of images
const processBatchImages = async (imagePaths, templateFields = []) => {
  try {
    const results = [];
    
    for (const imagePath of imagePaths) {
      const result = await processImage(imagePath, templateFields);
      results.push({
        imagePath,
        ...result
      });
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error in batch OCR processing:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  processImage,
  processBatchImages
};