const fs = require('fs');
const path = require('path');
const PDFReader = require('./utils/pdf-reader-pdfjs');
const CDSLParser = require('./parsers/cdsl-parser');
const JSONFormatter = require('./utils/json-formatter');

class CASParser {
  constructor() {
    this.pdfReader = new PDFReader();
    this.formatter = new JSONFormatter();
    this.parsers = {
      'CDSL': CDSLParser,
      // Future parsers
      // 'NSDL': NSDLParser,
      // 'CAMS': CAMSParser,
      // 'KFINTECH': KFintechParser
    };
  }

  /**
   * Parse a CAS PDF file
   * @param {string} filePath - Path to the PDF file
   * @param {string} password - Password for the PDF (if protected)
   * @returns {Promise<Object>} - Parsed data in JSON format
   */
  async parse(filePath, password = '') {
    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      console.log(`Reading PDF: ${filePath}`);
      
      // Read PDF content
      const pdfText = await this.pdfReader.readPDF(filePath, password);
      
      if (!pdfText || pdfText.trim().length === 0) {
        throw new Error('Failed to extract text from PDF. The PDF might be corrupted or in an unsupported format.');
      }

      console.log('PDF read successfully. Detecting CAS type...');
      
      // Detect CAS type
      const casType = this.detectCASType(pdfText);
      console.log(`Detected CAS type: ${casType}`);
      
      // Get appropriate parser
      const ParserClass = this.parsers[casType];
      if (!ParserClass) {
        throw new Error(`Parser not implemented for CAS type: ${casType}`);
      }

      // Parse the document
      const parser = new ParserClass();
      console.log('Parsing document...');
      const parsedData = await parser.parse(pdfText);
      
      // Format the output
      const formattedData = this.formatter.format(parsedData);
      
      console.log('Parsing completed successfully!');
      return formattedData;
      
    } catch (error) {
      console.error('Error parsing CAS document:', error.message);
      throw error;
    }
  }

  /**
   * Detect the type of CAS document
   * @param {string} text - PDF text content
   * @returns {string} - CAS type
   */
  detectCASType(text) {
    if (text.includes('CDSL') && text.includes('Central Depository Services')) {
      return 'CDSL';
    } else if (text.includes('NSDL') && text.includes('National Securities Depository')) {
      return 'NSDL';
    } else if (text.includes('Computer Age Management Services')) {
      return 'CAMS';
    } else if (text.includes('KFintech') || text.includes('Karvy')) {
      return 'KFINTECH';
    }
    return 'UNKNOWN';
  }

  /**
   * Save parsed data to JSON file
   * @param {Object} data - Parsed data
   * @param {string} outputPath - Output file path
   */
  async saveToFile(data, outputPath) {
    try {
      const jsonContent = this.formatter.prettyPrint(data);
      fs.writeFileSync(outputPath, jsonContent, 'utf8');
      console.log(`Output saved to: ${outputPath}`);
    } catch (error) {
      console.error('Error saving output:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node src/index.js <pdf-file> [password] [output-file]');
    console.log('Example: node src/index.js sample_cas.pdf PASSWORD123 output.json');
    process.exit(1);
  }

  const pdfPath = args[0];
  const password = args[1] || '';
  const outputPath = args[2] || `${path.basename(pdfPath, '.pdf')}_output.json`;

  try {
    const parser = new CASParser();
    const result = await parser.parse(pdfPath, password);
    
    // Save to file
    await parser.saveToFile(result, outputPath);
    
    // Also print to console
    console.log('\nParsed Data:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Failed to parse CAS document:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = CASParser;

// Run if called directly
if (require.main === module) {
  main();
}