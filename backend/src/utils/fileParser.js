import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extracts raw text from a PDF or DOCX buffer.
 * 
 * @param {Buffer} buffer - The file buffer
 * @param {string} mimetype - The file MIME type
 * @returns {Promise<string>} The extracted raw text
 */
export async function extractText(buffer, mimetype) {
  try {
    if (mimetype === 'application/pdf') {
      if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
        const error = new Error('The uploaded file is not a valid PDF.'); error.status = 400; throw error;
      }
      const data = await pdfParse(buffer);
      // Clean up excessive whitespace/newlines from PDF parsing
      return data.text.replace(/\n\s*\n/g, '\n').trim();
    } 
    
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        const error = new Error('The uploaded file is not a valid DOCX document.'); error.status = 400; throw error;
      }
      const data = await mammoth.extractRawText({ buffer });
      return data.value.trim();
    }
    
    throw new Error('Unsupported file type');
  } catch (error) {
    console.error('[FileParser] Extraction error:', error);
    const parsedError = new Error('Failed to parse document: ' + error.message);
    parsedError.status = error.status || 422;
    throw parsedError;
  }
}
