// const fs = require('fs');
// const path = require('path');
// const config = require('../config/config');

// // Ensure upload directory exists
// const createUploadDirs = () => {
//   const certificatesDir = path.join(config.FILE_UPLOAD_PATH, 'certificates');
//   const templatesDir = path.join(config.FILE_UPLOAD_PATH, 'templates');
//   const logosDir = path.join(config.FILE_UPLOAD_PATH, 'logos');

//   if (!fs.existsSync(config.FILE_UPLOAD_PATH)) {
//     fs.mkdirSync(config.FILE_UPLOAD_PATH, { recursive: true });
//   }

//   if (!fs.existsSync(certificatesDir)) {
//     fs.mkdirSync(certificatesDir, { recursive: true });
//   }

//   if (!fs.existsSync(templatesDir)) {
//     fs.mkdirSync(templatesDir, { recursive: true });
//   }

//   if (!fs.existsSync(logosDir)) {
//     fs.mkdirSync(logosDir, { recursive: true });
//   }
// };

// // Save file to local storage
// const saveFile = (file, subDirectory = '') => {
//   return new Promise((resolve, reject) => {
//     try {
//       createUploadDirs();
      
//       const fileName = `${Date.now()}-${file.originalname}`;
//       const filePath = path.join(config.FILE_UPLOAD_PATH, subDirectory, fileName);
      
//       // Create a readable stream from the buffer
//       const fileBuffer = Buffer.from(file.buffer);
//       fs.writeFileSync(filePath, fileBuffer);
      
//       resolve({
//         fileName,
//         filePath,
//         fileType: file.mimetype,
//         fileSize: file.size
//       });
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

// // Delete file from local storage
// const deleteFile = (filePath) => {
//   return new Promise((resolve, reject) => {
//     try {
//       if (fs.existsSync(filePath)) {
//         fs.unlinkSync(filePath);
//       }
//       resolve(true);
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

// // Get file from local storage
// const getFile = (filePath) => {
//   return new Promise((resolve, reject) => {
//     try {
//       if (!fs.existsSync(filePath)) {
//         return reject(new Error('File not found'));
//       }
      
//       const fileContent = fs.readFileSync(filePath);
//       resolve(fileContent);
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

// module.exports = {
//   saveFile,
//   deleteFile,
//   getFile,
//   createUploadDirs
// };
const cloudinary = require('cloudinary').v2;
const config = require('../config/config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET
});

// Ensure upload directory exists (now creates folders in Cloudinary)
const createUploadDirs = () => {
  // With Cloudinary, folders are created automatically when files are uploaded
  // This function is kept for signature compatibility but doesn't need to do anything
  return Promise.resolve();
};

// Save file to Cloudinary
const saveFile = (file, subDirectory = '') => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `${Date.now()}-${file.originalname}`;
      const publicId = subDirectory ? `${subDirectory}/${fileName}` : fileName;
      
      // Upload to Cloudinary using buffer
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', // Automatically detect file type
          public_id: publicId,
          folder: config.FILE_UPLOAD_PATH || 'uploads' // Base folder
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              fileName: result.public_id,
              filePath: result.secure_url, // Cloudinary URL
              fileType: result.resource_type === 'image' ? `image/${result.format}` : file.mimetype,
              fileSize: result.bytes,
              cloudinaryId: result.public_id, // Store for deletion
              cloudinaryUrl: result.secure_url
            });
          }
        }
      ).end(file.buffer);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Delete file from Cloudinary
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      // Extract public_id from URL or use filePath as public_id
      let publicId = filePath;
      
      // If filePath is a Cloudinary URL, extract public_id
      if (filePath.includes('cloudinary.com')) {
        const urlParts = filePath.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
          // Get everything after version (v1234567890)
          const pathAfterVersion = urlParts.slice(uploadIndex + 2).join('/');
          // Remove file extension
          publicId = pathAfterVersion.replace(/\.[^/.]+$/, '');
        }
      }
      
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.result === 'ok' || result.result === 'not found');
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
};

// Get file from Cloudinary
const getFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      // For Cloudinary, we'll fetch the file content via HTTP
      const https = require('https');
      const http = require('http');
      
      const protocol = filePath.startsWith('https:') ? https : http;
      
      protocol.get(filePath, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error('File not found'));
          return;
        }
        
        const chunks = [];
        
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        response.on('end', () => {
          const fileContent = Buffer.concat(chunks);
          resolve(fileContent);
        });
        
      }).on('error', (error) => {
        reject(error);
      });
      
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