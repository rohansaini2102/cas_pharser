const fs = require('fs');
const path = require('path');

class PDFJSReader {
  constructor() {
    // Initialize pdfjs-dist
    this.pdfjsLib = null;
  }

  /**
   * Initialize pdfjs-dist library
   */
  async initialize() {
    if (!this.pdfjsLib) {
      // Import pdfjs-dist dynamically
      this.pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      
      // Set worker source for better performance
      const workerSrc = path.join(
        process.cwd(),
        'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
      );
      
      // Set standard fonts path
      const standardFontDataUrl = path.join(
        process.cwd(),
        'node_modules/pdfjs-dist/standard_fonts/'
      );
      
      this.standardFontDataUrl = standardFontDataUrl;
    }
  }

  /**
   * Read a PDF file with optional password protection
   * @param {string} filePath - Path to the PDF file
   * @param {string} password - Password for protected PDFs
   * @returns {Promise<string>} - Extracted text content
   */
  async readPDF(filePath, password = '') {
    try {
      // Initialize pdfjs-dist if not already done
      await this.initialize();

      // Read the PDF file
      const pdfData = await fs.promises.readFile(filePath);
      const pdfDataArray = new Uint8Array(pdfData);

      console.log('Loading PDF with pdfjs-dist...');
      
      // Prepare document loading options
      const loadingTask = this.pdfjsLib.getDocument({
        data: pdfDataArray,
        password: password,
        standardFontDataUrl: this.standardFontDataUrl,
        // Additional options for better compatibility
        verbosity: 0, // Reduce console output
        isEvalSupported: false,
        disableFontFace: false,
        useSystemFonts: false
      });

      // Load the PDF document
      const pdfDocument = await loadingTask.promise;
      
      console.log(`PDF loaded successfully. Pages: ${pdfDocument.numPages}`);
      
      let extractedText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        console.log(`Processing page ${pageNum}/${pdfDocument.numPages}...`);
        
        try {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Extract text items and join them
          const pageText = textContent.items
            .filter(item => item.str && item.str.trim()) // Filter out empty strings
            .map(item => item.str)
            .join(' ');
          
          extractedText += pageText + '\n\n';
          
          // Clean up page resources
          page.cleanup();
          
        } catch (pageError) {
          console.warn(`Error processing page ${pageNum}:`, pageError.message);
          // Continue with other pages
        }
      }
      
      // Clean up document resources
      await pdfDocument.destroy();
      
      if (!extractedText.trim()) {
        throw new Error('No text content extracted from PDF');
      }
      
      console.log(`Text extraction completed. Length: ${extractedText.length} characters`);
      return extractedText;
      
    } catch (error) {
      if (error.name === 'PasswordException') {
        throw new Error(`Invalid password for PDF. Error: ${error.message}`);
      } else if (error.name === 'InvalidPDFException') {
        throw new Error(`Invalid PDF file. Error: ${error.message}`);
      } else if (error.name === 'MissingPDFException') {
        throw new Error(`PDF file not found or corrupted. Error: ${error.message}`);
      } else if (error.message && error.message.includes('password')) {
        throw new Error(`Password required or invalid. Error: ${error.message}`);
      } else {
        throw new Error(`Failed to read PDF: ${error.message}`);
      }
    }
  }

  /**
   * Extract text from PDF with detailed page information
   * @param {string} filePath - Path to the PDF file
   * @param {string} password - Password for protected PDFs
   * @returns {Promise<Array>} - Array of page texts with metadata
   */
  async extractTextByPage(filePath, password = '') {
    try {
      await this.initialize();

      const pdfData = await fs.promises.readFile(filePath);
      const pdfDataArray = new Uint8Array(pdfData);

      const loadingTask = this.pdfjsLib.getDocument({
        data: pdfDataArray,
        password: password,
        standardFontDataUrl: this.standardFontDataUrl
      });

      const pdfDocument = await loadingTask.promise;
      const pages = [];
      
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        try {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1.0 });
          
          const pageInfo = {
            pageNumber: pageNum,
            text: textContent.items.map(item => item.str).join(' '),
            width: viewport.width,
            height: viewport.height,
            items: textContent.items.map(item => ({
              text: item.str,
              x: item.transform[4],
              y: item.transform[5],
              width: item.width,
              height: item.height
            }))
          };
          
          pages.push(pageInfo);
          page.cleanup();
          
        } catch (pageError) {
          console.warn(`Error processing page ${pageNum}:`, pageError.message);
        }
      }
      
      await pdfDocument.destroy();
      return pages;
      
    } catch (error) {
      throw new Error(`Failed to extract text by page: ${error.message}`);
    }
  }

  /**
   * Check if PDF is password protected
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<boolean>} - True if password protected
   */
  async isPasswordProtected(filePath) {
    try {
      await this.initialize();

      const pdfData = await fs.promises.readFile(filePath);
      const pdfDataArray = new Uint8Array(pdfData);

      const loadingTask = this.pdfjsLib.getDocument({
        data: pdfDataArray,
        password: '' // Try with empty password
      });

      const pdfDocument = await loadingTask.promise;
      await pdfDocument.destroy();
      
      return false; // Not password protected
      
    } catch (error) {
      if (error.name === 'PasswordException' || 
          (error.message && error.message.includes('password'))) {
        return true; // Password protected
      }
      throw error; // Other error
    }
  }
}

module.exports = PDFJSReader;