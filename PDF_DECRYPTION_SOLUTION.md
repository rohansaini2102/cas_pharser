# PDF Decryption Solution

## Issue

The provided CAS PDF (`MAY2025_AA07602549_TXN.pdf`) uses an encryption algorithm that is not supported by common Node.js PDF parsing libraries including:
- pdf-parse
- pdf-lib
- pdf2json
- pdfreader

The error "unsupported encryption algorithm" suggests the PDF uses a newer or proprietary encryption method.

## Solutions

### 1. External Tool Approach (Recommended)

Use external command-line tools to decrypt the PDF first, then parse it:

```javascript
const { exec } = require('child_process');
const fs = require('fs');

async function decryptPDF(inputPath, outputPath, password) {
  return new Promise((resolve, reject) => {
    // Try qpdf first
    exec(`qpdf --password="${password}" --decrypt "${inputPath}" "${outputPath}"`, (error) => {
      if (!error) {
        resolve(outputPath);
      } else {
        // Fallback to pdftk
        exec(`pdftk "${inputPath}" input_pw "${password}" output "${outputPath}"`, (error2) => {
          if (!error2) {
            resolve(outputPath);
          } else {
            reject(new Error('Failed to decrypt PDF. Install qpdf or pdftk.'));
          }
        });
      }
    });
  });
}

// Usage
const decryptedPath = await decryptPDF('input.pdf', 'temp_decrypted.pdf', 'APEPY1667C');
const text = await pdfParse(fs.readFileSync(decryptedPath));
fs.unlinkSync(decryptedPath); // Clean up
```

### 2. Python Bridge Approach

Use Python's PyPDF2 or pikepdf which handle more encryption types:

```javascript
const { PythonShell } = require('python-shell');

async function decryptWithPython(pdfPath, password) {
  const script = `
import sys
import PyPDF2
import json

pdf_path = sys.argv[1]
password = sys.argv[2]

with open(pdf_path, 'rb') as file:
    reader = PyPDF2.PdfReader(file, password=password)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    print(json.dumps({"text": text}))
`;
  
  const options = {
    mode: 'json',
    pythonPath: 'python3',
    args: [pdfPath, password]
  };
  
  const results = await PythonShell.runString(script, options);
  return results[0].text;
}
```

### 3. API Service Approach

Use a PDF processing API service that handles encryption:

```javascript
const axios = require('axios');
const FormData = require('form-data');

async function decryptViaAPI(pdfPath, password) {
  const form = new FormData();
  form.append('file', fs.createReadStream(pdfPath));
  form.append('password', password);
  
  const response = await axios.post('https://api.pdfservice.com/decrypt', form, {
    headers: form.getHeaders()
  });
  
  return response.data.text;
}
```

### 4. Browser-Based Approach

Use PDF.js in a headless browser:

```javascript
const puppeteer = require('puppeteer');

async function decryptWithBrowser(pdfPath, password) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(`file://${path.resolve(pdfPath)}`);
  
  // Inject PDF.js and extract text
  const text = await page.evaluate((pwd) => {
    return new Promise((resolve) => {
      pdfjsLib.getDocument({ url: window.location.href, password: pwd })
        .promise.then(pdf => {
          // Extract text from all pages
          // ... implementation
          resolve(extractedText);
        });
    });
  }, password);
  
  await browser.close();
  return text;
}
```

## Recommended Implementation

For the CAS Parser project, I recommend:

1. **Primary**: Try pdf-parse with password
2. **Fallback 1**: Use qpdf command if available
3. **Fallback 2**: Use pdftk command if available
4. **Fallback 3**: Provide clear error message with manual instructions

```javascript
async function readPDFWithFallbacks(filePath, password) {
  // Try 1: Direct parsing
  try {
    return await pdfParse(filePath, { password });
  } catch (e1) {
    console.log('Direct parsing failed, trying external tools...');
  }
  
  // Try 2: qpdf
  try {
    const tempFile = `temp_${Date.now()}.pdf`;
    await execPromise(`qpdf --password="${password}" --decrypt "${filePath}" "${tempFile}"`);
    const result = await pdfParse(fs.readFileSync(tempFile));
    fs.unlinkSync(tempFile);
    return result;
  } catch (e2) {
    console.log('qpdf not available or failed');
  }
  
  // Try 3: pdftk
  try {
    const tempFile = `temp_${Date.now()}.pdf`;
    await execPromise(`pdftk "${filePath}" input_pw "${password}" output "${tempFile}"`);
    const result = await pdfParse(fs.readFileSync(tempFile));
    fs.unlinkSync(tempFile);
    return result;
  } catch (e3) {
    console.log('pdftk not available or failed');
  }
  
  throw new Error(`
    Unable to decrypt PDF. Please install one of the following tools:
    1. qpdf: sudo apt-get install qpdf (Linux) or brew install qpdf (Mac)
    2. pdftk: sudo apt-get install pdftk (Linux) or brew install pdftk (Mac)
    
    Or manually decrypt the PDF using:
    qpdf --password="${password}" --decrypt "${filePath}" decrypted.pdf
  `);
}
```

## Installation Commands

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install qpdf
# or
sudo apt-get install pdftk
```

### macOS
```bash
brew install qpdf
# or
brew install pdftk
```

### Windows
Download installers from:
- qpdf: https://github.com/qpdf/qpdf/releases
- pdftk: https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/