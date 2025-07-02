const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

class PDFDecryptor {
  /**
   * Decrypt PDF using external tools or workarounds
   */
  async decryptAndRead(filePath, password) {
    // First, let's try a different approach with pdf-parse
    // by modifying the buffer directly
    
    try {
      const dataBuffer = fs.readFileSync(filePath);
      
      // Try using a custom render function that might handle passwords differently
      const options = {
        // Custom render function
        pagerender: async (pageData) => {
          const render_options = {
            // Simulate viewport
            normalizeWhitespace: false,
            disableCombineTextItems: false
          };
          
          try {
            const textContent = await pageData.getTextContent(render_options);
            let text = '';
            
            if (textContent && textContent.items) {
              for (let item of textContent.items) {
                text += item.str + ' ';
              }
            }
            
            return text;
          } catch (error) {
            console.log('Page render error:', error.message);
            return '';
          }
        }
      };
      
      // Add password to options - try different formats
      if (password) {
        // Try different password formats
        const passwordVariants = [
          { userPassword: password },
          { ownerPassword: password },
          { password: password },
          { Password: password },
          { PASSWORD: password }
        ];
        
        for (const variant of passwordVariants) {
          try {
            console.log('Trying password variant:', Object.keys(variant)[0]);
            const data = await pdf(dataBuffer, { ...options, ...variant });
            if (data && data.text && data.text.trim().length > 0) {
              console.log('Success with variant:', Object.keys(variant)[0]);
              return data.text;
            }
          } catch (error) {
            // Continue to next variant
          }
        }
      }
      
      // If all variants fail, try without password options
      const data = await pdf(dataBuffer, options);
      return data.text;
      
    } catch (error) {
      throw new Error(`Failed to decrypt PDF: ${error.message}`);
    }
  }
  
  /**
   * Alternative method using system commands if available
   */
  async trySystemDecrypt(filePath, password, outputPath) {
    return new Promise((resolve, reject) => {
      // Try using pdftk if available
      exec('which pdftk', (error) => {
        if (!error) {
          const cmd = `pdftk "${filePath}" input_pw "${password}" output "${outputPath}" decrypt`;
          exec(cmd, (error) => {
            if (error) {
              reject(new Error('pdftk decryption failed'));
            } else {
              resolve(outputPath);
            }
          });
        } else {
          reject(new Error('pdftk not available'));
        }
      });
    });
  }
}

module.exports = PDFDecryptor;