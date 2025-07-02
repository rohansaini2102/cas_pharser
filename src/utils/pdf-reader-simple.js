const fs = require('fs');
const pdf = require('pdf-parse');

class SimplePDFReader {
  /**
   * Read a PDF file with optional password protection
   * @param {string} filePath - Path to the PDF file
   * @param {string} password - Password for protected PDFs
   * @returns {Promise<string>} - Extracted text content
   */
  async readPDF(filePath, password) {
    try {
      // Read the PDF file
      const dataBuffer = fs.readFileSync(filePath);
      
      // Set up options
      const options = {};
      if (password) {
        options.password = password;
      }
      
      // Parse PDF
      const data = await pdf(dataBuffer, options);
      
      if (!data || !data.text) {
        throw new Error('No text content found in PDF');
      }
      
      return data.text;
    } catch (error) {
      // Check if it's a password issue
      if (error.message && error.message.includes('password')) {
        throw new Error('Invalid password or PDF is encrypted with an unsupported method');
      }
      throw new Error(`Failed to read PDF: ${error.message}`);
    }
  }
}

module.exports = SimplePDFReader;