const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const CASParser = require('./src/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp to avoid filename conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '.pdf');
  }
});

const fileFilter = (req, file, cb) => {
  // Only allow PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Utility function to clean up uploaded files
const cleanupFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Routes

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to parse PDF
app.post('/api/parse-pdf', upload.single('pdf'), async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    uploadedFilePath = req.file.path;
    const password = req.body.password || '';

    console.log(`Processing PDF: ${req.file.originalname}`);
    console.log(`File size: ${req.file.size} bytes`);
    
    // Initialize parser
    const parser = new CASParser();
    
    // Parse the PDF
    const result = await parser.parse(uploadedFilePath, password);
    
    // Clean up the uploaded file
    cleanupFile(uploadedFilePath);
    
    // Return the parsed data
    res.json({
      success: true,
      data: result,
      filename: req.file.originalname
    });

  } catch (error) {
    console.error('Error parsing PDF:', error);
    
    // Clean up the uploaded file in case of error
    if (uploadedFilePath) {
      cleanupFile(uploadedFilePath);
    }
    
    // Return error response
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse PDF'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CAS Parser API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  if (error.message === 'Only PDF files are allowed!') {
    return res.status(400).json({
      success: false,
      error: 'Only PDF files are allowed. Please upload a valid PDF file.'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CAS Parser Web Interface running on http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${path.resolve(uploadsDir)}`);
  console.log(`🔧 API endpoint: http://localhost:${PORT}/api/parse-pdf`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Clean up any remaining files in uploads directory
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      cleanupFile(filePath);
    });
  }
  
  process.exit(0);
});

module.exports = app;