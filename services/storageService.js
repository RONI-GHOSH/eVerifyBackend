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
const https = require('https');
const http = require('http');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

// No-op for Cloudinary (folders auto-created on upload)
const createUploadDirs = () => {
  return Promise.resolve(true);
};

// Save file to Cloudinary
const saveFile = (file, subDirectory = '') => {
  return new Promise((resolve, reject) => {
    try {
      // Sanitize file name (remove invalid characters)
      const originalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '').trim();
      const fileName = `${Date.now()}-${originalName}`;

      // Build folder path (base upload dir + optional subDirectory)
      const folderPath = subDirectory
        ? `${config.FILE_UPLOAD_PATH || 'uploads'}/${subDirectory}`
        : config.FILE_UPLOAD_PATH || 'uploads';

      // Strip extension for public_id (Cloudinary best practice)
      const publicId = fileName.replace(/\.[^/.]+$/, '');

      // Upload via buffer
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: folderPath,
          public_id: publicId,
          overwrite: true, // ensure same name replaces old
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              fileName: result.public_id,   // Cloudinary identifier
              filePath: result.secure_url,  // Public Cloudinary URL
              fileType: result.resource_type === 'image'
                ? `image/${result.format}`
                : file.mimetype,
              fileSize: result.bytes,
              cloudinaryId: result.public_id,
              cloudinaryUrl: result.secure_url,
            });
          }
        }
      );

      uploadStream.end(file.buffer);
    } catch (error) {
      reject(error);
    }
  });
};

// Delete file from Cloudinary
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      let publicId = filePath;

      // If passed a Cloudinary URL, extract public_id
      if (filePath.includes('cloudinary.com')) {
        const urlParts = filePath.split('/');
        const uploadIndex = urlParts.findIndex((part) => part === 'upload');
        if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
          const pathAfterVersion = urlParts.slice(uploadIndex + 2).join('/');
          publicId = pathAfterVersion.replace(/\.[^/.]+$/, ''); // remove extension
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

// Get file from Cloudinary (fetch via HTTP)
const getFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const protocol = filePath.startsWith('https:') ? https : http;

      protocol
        .get(filePath, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error('File not found'));
            return;
          }

          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            const fileContent = Buffer.concat(chunks);
            resolve(fileContent);
          });
        })
        .on('error', (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  saveFile,
  deleteFile,
  getFile,
  createUploadDirs,
};
