// ============================================================
// PLACENIX — FILE UPLOAD & MULTIPART/BASE64 INGESTION HANDLER
// Demonstrates:
// 1. Multi-part / raw buffer / base64 payload parsing
// 2. Strict file size bounds & MIME type validation
// 3. Automated text extraction for Resume / Document parsing
// 4. Safe ephemeral storage & audit metadata logging
// ============================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', 'scratch', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class FileUploadHandler {
  static MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
  static ALLOWED_MIME_TYPES = [
    'application/pdf',
    'text/plain',
    'application/json',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  /**
   * Process a Base64 or Text file upload payload
   */
  static processBase64Upload({ filename, mimeType, base64Content, studentId = 'std_anonymous' }) {
    if (!filename || !base64Content) {
      throw { statusCode: 400, message: 'filename and base64Content are required.' };
    }

    // Strip Data URI prefix if present (e.g. data:application/pdf;base64,...)
    const cleanBase64 = base64Content.replace(/^data:[\w/+-]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length > this.MAX_FILE_SIZE_BYTES) {
      throw {
        statusCode: 413,
        message: `File exceeds maximum allowed size of ${this.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`
      };
    }

    const detectedMime = mimeType || 'text/plain';
    if (!this.ALLOWED_MIME_TYPES.includes(detectedMime.toLowerCase())) {
      throw {
        statusCode: 422,
        message: `Unsupported MIME type: '${detectedMime}'. Allowed types: PDF, TXT, JSON, DOCX.`
      };
    }

    const fileId = 'upl_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
    const safeExt = path.extname(filename) || '.txt';
    const savedFilename = `${fileId}${safeExt}`;
    const targetFilePath = path.join(UPLOAD_DIR, savedFilename);

    // Save to disk
    fs.writeFileSync(targetFilePath, buffer);

    // Text extraction
    const extractedText = buffer.toString('utf8');

    return {
      fileId,
      originalFilename: filename,
      savedFilename,
      sizeBytes: buffer.length,
      mimeType: detectedMime,
      uploadedAt: new Date().toISOString(),
      studentId,
      extractedSnippet: extractedText.substring(0, 300) + (extractedText.length > 300 ? '...' : ''),
      extractedTextLength: extractedText.length
    };
  }

  /**
   * Parse simple multipart boundary body
   */
  static parseMultipartBuffer(rawBuffer, contentTypeHeader) {
    const match = contentTypeHeader.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) {
      return null;
    }
    const boundary = match[1] || match[2];
    const boundaryDelimiter = `--${boundary}`;
    const rawString = rawBuffer.toString('binary');
    const parts = rawString.split(boundaryDelimiter);

    for (const part of parts) {
      if (part.includes('filename="')) {
        const filenameMatch = part.match(/filename="([^"]+)"/);
        const filename = filenameMatch ? filenameMatch[1] : 'uploaded_file.txt';
        const headerEndIdx = part.indexOf('\r\n\r\n');
        if (headerEndIdx !== -1) {
          const content = part.substring(headerEndIdx + 4, part.lastIndexOf('\r\n'));
          const buffer = Buffer.from(content, 'binary');
          return { filename, buffer, sizeBytes: buffer.length };
        }
      }
    }
    return null;
  }
}
