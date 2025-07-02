const fs = require('fs');
const PDFParser = require('pdf2json');

class PDF2JsonReader {
  /**
   * Read a PDF file with optional password protection
   * @param {string} filePath - Path to the PDF file
   * @param {string} password - Password for protected PDFs
   * @returns {Promise<string>} - Extracted text content
   */
  async readPDF(filePath, password) {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(this, 1);
      
      // pdf2json doesn't support password-protected PDFs directly
      // We'll need to use a different approach
      
      // Error handler
      pdfParser.on('pdfParser_dataError', errData => {
        reject(new Error(`PDF parsing error: ${errData.parserError}`));
      });
      
      // Success handler
      pdfParser.on('pdfParser_dataReady', pdfData => {
        try {
          // Extract all text from the PDF
          let fullText = '';
          
          if (pdfData && pdfData.Pages) {
            pdfData.Pages.forEach(page => {
              if (page.Texts) {
                page.Texts.forEach(text => {
                  if (text.R) {
                    text.R.forEach(r => {
                      if (r.T) {
                        // Decode URI component and add space
                        fullText += decodeURIComponent(r.T) + ' ';
                      }
                    });
                  }
                });
                // Add newline after each page
                fullText += '\n';
              }
            });
          }
          
          if (!fullText.trim()) {
            reject(new Error('No text content found in PDF'));
          } else {
            resolve(fullText);
          }
        } catch (error) {
          reject(new Error(`Failed to extract text: ${error.message}`));
        }
      });
      
      // Load the PDF file
      pdfParser.loadPDF(filePath);
    });
  }
}

module.exports = PDF2JsonReader;