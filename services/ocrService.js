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

import fs from "fs";
import path from "path";
import {
  GoogleGenAI,
  Type,
  Schema,
  GenerateContentConfig,
  Part,
  Role,
} from "@google/genai";
// Or the corresponding SDK/REST client you use

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash"; // or whichever model supports image + structured output

// Initialize client
const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * processImage
 * @param {string} imagePath - local path or URL or base64-encoded image
 * @param {Array<string>} templateFields - list of fields to extract, e.g. ['studentName','degreeTitle','graduationDate','certificateQR']
 * @returns {Promise<Object>} result
 */
const processImage = async (imagePath, templateFields = []) => {
  try {
    // 1. Prepare image data
    let imagePart;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      // Fetch image
      const response = await fetch(imagePath);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imagePart = Part.fromInlineData({
        mimeType: "image/png", // or detect from extension or response headers
        data: buffer.toString("base64"),
      });
    } else {
      // Local file
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType =
        ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".png"
          ? "image/png"
          : "application/octet-stream";
      const buffer = fs.readFileSync(imagePath);
      imagePart = Part.fromInlineData({
        mimeType,
        data: buffer.toString("base64"),
      });
    }

    // 2. Build a prompt (structured) describing what we want
    // We'll tell Gemini: please OCR everything, then extract values for these fields, give bounding boxes
    const fieldList = templateFields.join(", ");
    const promptText = `
You are given an image containing a certificate. First, you should extract all text via OCR. Then extract the following fields with their values: ${fieldList}. 
Also, for each field, provide the approximate location in the image as bounding boxes with coordinates {x1, y1, x2, y2}. 
Respond with JSON in this format:
{
  "extractedData": {
    ${templateFields.map((f) => `"${f}": "some ${f} value"`).join(",\n    ")}
  },
  "ocrText": "the full OCR text from the image",
  "ocrLocations": [
    {
      "key": "studentName",
      "location": { "x1": number, "y1": number, "x2": number, "y2": number }
    },
    ...
  ]
}
    `.trim();

    // 3. Define response schema to help constrain output
    // This helps Gemini give you JSON with predictable structure

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        extractedData: {
          type: Type.OBJECT,
          properties: templateFields.reduce((obj, fieldName) => {
            obj[fieldName] = { type: Type.STRING };
            return obj;
          }, {}),
          required: templateFields, // force values for all fields
        },
        ocrText: { type: Type.STRING },
        ocrLocations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING },
              location: {
                type: Type.OBJECT,
                properties: {
                  x1: { type: Type.NUMBER },
                  y1: { type: Type.NUMBER },
                  x2: { type: Type.NUMBER },
                  y2: { type: Type.NUMBER },
                },
                required: ["x1", "y1", "x2", "y2"],
              },
            },
            required: ["key", "location"],
          },
        },
      },
      required: ["extractedData", "ocrText", "ocrLocations"],
      propertyOrdering: ["extractedData", "ocrText", "ocrLocations"],
    };

    const config = new GenerateContentConfig({
      responseMimeType: "application/json",
      responseSchema,
    });

    // 4. Send request to Gemini
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [
        imagePart,
        {
          role: Role.User,
          text: promptText,
        },
      ],
      config,
    });

    // 5. Parse response
    let parsed;
    try {
      parsed = response.parsed;
      // `parsed` should be a JS object matching the schema if response was good
    } catch (e) {
      // fallback: try JSON.parse
      parsed = JSON.parse(response.text);
    }

    // 6. Return nicely
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
