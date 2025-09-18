const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Ensure upload directory exists
const createUploadDirs = () => {
  const certificatesDir = path.join(config.FILE_UPLOAD_PATH, 'certificates');
  const templatesDir = path.join(config.FILE_UPLOAD_PATH, 'templates');
  const logosDir = path.join(config.FILE_UPLOAD_PATH, 'logos');

  if (!fs.existsSync(config.FILE_UPLOAD_PATH)) {
    fs.mkdirSync(config.FILE_UPLOAD_PATH, { recursive: true });
  }

  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
  }

  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }
};

// Save file to local storage
const saveFile = (file, subDirectory = '') => {
  return new Promise((resolve, reject) => {
    try {
      createUploadDirs();
      
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = path.join(config.FILE_UPLOAD_PATH, subDirectory, fileName);
      
      // Create a readable stream from the buffer
      const fileBuffer = Buffer.from(file.buffer);
      fs.writeFileSync(filePath, fileBuffer);
      
      resolve({
        fileName,
        filePath,
        fileType: file.mimetype,
        fileSize: file.size
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Delete file from local storage
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

// Get file from local storage
const getFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return reject(new Error('File not found'));
      }
      
      const fileContent = fs.readFileSync(filePath);
      resolve(fileContent);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  saveFile,
  deleteFile,
  getFile,
  createUploadDirs
};