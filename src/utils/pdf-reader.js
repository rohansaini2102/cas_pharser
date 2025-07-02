const fs = require('fs');
const pdf = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');

class PDFReader {
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
      
      // If password is provided, try to extract with password first
      if (password) {
        try {
          // Try direct extraction with password
          const data = await pdf(dataBuffer, { password: password });
          if (data && data.text) {
            return data.text;
          }
        } catch (error) {
          // If direct extraction fails, try decryption
          console.log('Direct extraction with password failed, attempting decryption...');
          const decryptedBuffer = await this.decryptPDF(dataBuffer, password);
          return await this.extractText(decryptedBuffer);
        }
      }
      
      // Otherwise, directly extract text
      return await this.extractText(dataBuffer);
    } catch (error) {
      throw new Error(`Failed to read PDF: ${error.message}`);
    }
  }

  /**
   * Decrypt a password-protected PDF
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} password - PDF password
   * @returns {Promise<Buffer>} - Decrypted PDF buffer
   */
  async decryptPDF(pdfBuffer, password) {
    try {
      // First try to parse with pdf-parse directly with password
      const options = {
        password: password
      };
      
      // Try to extract text directly with password
      try {
        const data = await pdf(pdfBuffer, options);
        if (data && data.text) {
          // If successful, return the original buffer as pdf-parse handled it
          return pdfBuffer;
        }
      } catch (parseError) {
        // If pdf-parse fails, try pdf-lib approach
        console.log('Direct parsing failed, trying pdf-lib decryption...');
      }
      
      // Load the PDF with password using pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBuffer, { 
        password: password,
        ignoreEncryption: false 
      });
      
      // Remove encryption by saving without password
      const decryptedPdfBytes = await pdfDoc.save({ useObjectStreams: false });
      
      return Buffer.from(decryptedPdfBytes);
    } catch (error) {
      // If pdf-lib fails, try one more time with ignoreEncryption
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        const decryptedPdfBytes = await pdfDoc.save({ useObjectStreams: false });
        return Buffer.from(decryptedPdfBytes);
      } catch (ignoreError) {
        throw new Error(`Failed to decrypt PDF: ${error.message}`);
      }
    }
  }

  /**
   * Extract text from PDF buffer
   * @param {Buffer} pdfBuffer - PDF buffer
   * @returns {Promise<string>} - Extracted text
   */
  async extractText(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Extract text page by page
   * @param {Buffer} pdfBuffer - PDF buffer
   * @returns {Promise<Array>} - Array of page texts
   */
  async extractTextByPage(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer, {
        pagerender: (pageData) => {
          return pageData.getTextContent()
            .then((textContent) => {
              let text = '';
              textContent.items.forEach((item) => {
                text += item.str + ' ';
              });
              return text;
            });
        }
      });
      
      return data.pages || [];
    } catch (error) {
      throw new Error(`Failed to extract text by page: ${error.message}`);
    }
  }
}

module.exports = PDFReader;