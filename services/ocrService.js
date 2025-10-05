/**
 * Dummy OCR Service
 * This service simulates OCR functionality for certificate processing
 * In a production environment, this would be replaced with Google Document AI or similar
 */

// Simulate OCR processing on an image
// const processImage = async (imagePath, templateFields = []) => {
//   try {
//     // In a real implementation, this would process the actual image
//     // For now, we'll return dummy data based on the template fields

//     const extractedData = {};
//     const ocrText = 'This is a sample certificate text extracted from OCR';

//     // Generate dummy data for each field in the template
//     if (templateFields && templateFields.length > 0) {
//       templateFields.forEach(field => {
//         if (field.key === 'cert.no.' || field.key === 'sr.no.' || field.key === 'reg.no.') {
//           extractedData[field.key] = Math.floor(10000 + Math.random() * 90000).toString();
//         } else if (field.key === 'name') {
//           extractedData[field.key] = 'John Doe';
//         } else if (field.key === 'date') {
//           const date = new Date();
//           extractedData[field.key] = date.toISOString().split('T')[0];
//         } else if (field.key === 'course') {
//           extractedData[field.key] = 'Bachelor of Technology';
//         } else if (field.key === 'grade' || field.key === 'cgpa') {
//           extractedData[field.key] = (Math.random() * 4 + 6).toFixed(2);
//         } else if (field.key === 'qr_code' && field.type === 'qr') {
//           extractedData[field.key] = 'https://example.com/verify/cert-' + Math.floor(10000 + Math.random() * 90000);
//         } else {
//           extractedData[field.key] = `Sample ${field.key} data`;
//         }
//       });
//     }

//     // Simulate OCR locations
//     const ocrLocations = templateFields.map(field => {
//       return {
//         key: field.key,
//         location: {
//           x1: Math.floor(Math.random() * 100),
//           y1: Math.floor(Math.random() * 100),
//           x2: Math.floor(Math.random() * 100) + 100,
//           y2: Math.floor(Math.random() * 100) + 100
//         }
//       };
//     });

//     return {
//       success: true,
//       extractedData,
//       ocrText,
//       ocrLocations
//     };
//   } catch (error) {
//     console.error('Error in OCR processing:', error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// Process batch of images
const processBatchImages = async (imagePaths, templateFields = []) => {
  try {
    const results = [];

    for (const imagePath of imagePaths) {
      const result = await processImage(imagePath, templateFields);
      results.push({
        imagePath,
        ...result,
      });
    }

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error("Error in batch OCR processing:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// processImage.js

const fs = require("fs");
const path = require("path");// not needed if Node 18+, you can use global fetch
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash"; // or gemini-1.5-pro if you need more accuracy

// Initialize client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * processImage
 * @param {string} imagePath - local path or URL
 * @param {Array<string>} templateFields - e.g. ['studentName','degreeTitle','graduationDate','certificateQR']
 * @returns {Promise<Object>} result
 */
const processImage = async (imagePath, templateFields = []) => {
  try {
    // 1. Prepare image
    let base64Data;
    let mimeType = "image/png";

    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      const res = await fetch(imagePath);
      const arrayBuffer = await res.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
      const contentType = res.headers.get("content-type");
      if (contentType) mimeType = contentType;
    } else {
      const ext = path.extname(imagePath).toLowerCase();
      mimeType =
        ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".png"
          ? "image/png"
          : "application/octet-stream";
      const buffer = fs.readFileSync(imagePath);
      base64Data = buffer.toString("base64");
    }

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    };

    // 2. Build prompt
    const fieldList = templateFields.join(", ");
    const promptText = `
You are an OCR and information extraction assistant.
Extract all text from the certificate image, then extract the following fields: ${fieldList}.
Also, for each field, return the approximate bounding box {x1,y1,x2,y2}.
Double check for provided fields you should not be missing any fields!.
Return ONLY valid JSON in this format without any extra character:

{
  "extractedData": {
    ${templateFields.map((f) => `"${f}": "sample ${f} value"`).join(",\n    ")}
  },
  "ocrText": "the full OCR text",
  "ocrLocations": [
    {
      "key": "fieldName",
      "location": { "x1": 0, "y1": 0, "x2": 0, "y2": 0 }
    }
  ]
}
    `.trim();

    // 3. Call Gemini
    const model = genAI.getGenerativeModel({ model: MODEL });

    const result = await model.generateContent([
      { text: promptText },
      imagePart,
    ]);

    var responseText = result.response.text();
    responseText = responseText.trim()
      .replace(/^```(json)?/i, "")
      .replace(/```$/i, "")
      .trim();

    // 4. Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error("Invalid JSON from Gemini, raw output:", responseText);
      throw new Error("Failed to parse Gemini response as JSON");
    }

    // 5. Return structured result
    return {
      success: true,
      extractedData: parsed.extractedData,
      ocrText: parsed.ocrText,
      ocrLocations: parsed.ocrLocations,
    };
  } catch (error) {
    console.error("Error in OCR processing:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  processImage,
  processBatchImages,
};
