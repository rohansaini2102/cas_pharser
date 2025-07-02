// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadArea = document.getElementById('uploadArea');
const pdfFile = document.getElementById('pdfFile');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFile = document.getElementById('removeFile');
const password = document.getElementById('password');
const parseBtn = document.getElementById('parseBtn');
const btnText = document.querySelector('.btn-text');
const spinner = document.querySelector('.spinner');

const resultsSection = document.getElementById('resultsSection');
const successResult = document.getElementById('successResult');
const errorResult = document.getElementById('errorResult');
const resultFileName = document.getElementById('resultFileName');
const resultCasType = document.getElementById('resultCasType');
const resultInvestor = document.getElementById('resultInvestor');
const resultTotalValue = document.getElementById('resultTotalValue');
const jsonOutput = document.getElementById('jsonOutput');
const errorMessage = document.getElementById('errorMessage');

const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const parseAnotherBtn = document.getElementById('parseAnotherBtn');

const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');

// Global variables
let currentFile = null;
let currentResult = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkAPIHealth();
});

function setupEventListeners() {
    // File upload events
    uploadArea.addEventListener('click', () => pdfFile.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    pdfFile.addEventListener('change', handleFileSelect);
    removeFile.addEventListener('click', clearFile);
    
    // Form submission
    uploadForm.addEventListener('submit', handleFormSubmit);
    
    // Result actions
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadJSON);
    parseAnotherBtn.addEventListener('click', resetForm);
    
    // Toast close
    toastClose.addEventListener('click', hideToast);
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (validateFile(file)) {
            setFile(file);
        }
    }
}

// File selection handler
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && validateFile(file)) {
        setFile(file);
    }
}

// File validation
function validateFile(file) {
    if (!file.type.includes('pdf')) {
        showToast('Please select a PDF file', 'error');
        return false;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
        showToast('File size must be less than 10MB', 'error');
        return false;
    }
    
    return true;
}

// Set selected file
function setFile(file) {
    currentFile = file;
    pdfFile.files = createFileList(file);
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    uploadArea.classList.add('has-file');
    document.querySelector('.upload-content').style.display = 'none';
    fileInfo.style.display = 'flex';
    
    // Enable parse button
    updateParseButton(false);
}

// Clear selected file
function clearFile() {
    currentFile = null;
    pdfFile.value = '';
    
    uploadArea.classList.remove('has-file');
    document.querySelector('.upload-content').style.display = 'block';
    fileInfo.style.display = 'none';
    
    // Disable parse button
    updateParseButton(true);
}

// Create FileList object (for programmatic file setting)
function createFileList(file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    return dt.files;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update parse button state
function updateParseButton(disabled) {
    parseBtn.disabled = disabled;
    if (disabled) {
        btnText.textContent = 'Select a PDF file first';
    } else {
        btnText.textContent = 'Parse PDF';
    }
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!currentFile) {
        showToast('Please select a PDF file', 'error');
        return;
    }
    
    // Show loading state
    setLoading(true);
    hideResults();
    
    try {
        const formData = new FormData();
        formData.append('pdf', currentFile);
        formData.append('password', password.value);
        
        const response = await fetch('/api/parse-pdf', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result);
        } else {
            showError(result.error);
        }
        
    } catch (error) {
        showError('Failed to connect to server. Please try again.');
        console.error('Upload error:', error);
    } finally {
        setLoading(false);
    }
}

// Set loading state
function setLoading(loading) {
    parseBtn.disabled = loading;
    if (loading) {
        btnText.style.display = 'none';
        spinner.style.display = 'block';
    } else {
        btnText.style.display = 'block';
        spinner.style.display = 'none';
        btnText.textContent = 'Parse PDF';
    }
}

// Show success result
function showSuccess(result) {
    currentResult = result.data;
    
    // Update result info
    resultFileName.textContent = result.filename;
    resultCasType.textContent = result.data.meta.cas_type;
    resultInvestor.textContent = result.data.investor.name || 'N/A';
    resultTotalValue.textContent = `₹${result.data.summary.total_value.toLocaleString()}`;
    
    // Format and display JSON
    jsonOutput.textContent = JSON.stringify(result.data, null, 2);
    
    // Show results
    resultsSection.style.display = 'block';
    successResult.style.display = 'block';
    errorResult.style.display = 'none';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    
    showToast('PDF parsed successfully!', 'success');
}

// Show error result
function showError(error) {
    errorMessage.textContent = error;
    
    // Show error
    resultsSection.style.display = 'block';
    successResult.style.display = 'none';
    errorResult.style.display = 'block';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    
    showToast(error, 'error');
}

// Hide results
function hideResults() {
    resultsSection.style.display = 'none';
}

// Copy JSON to clipboard
async function copyToClipboard() {
    if (!currentResult) return;
    
    try {
        const jsonText = JSON.stringify(currentResult, null, 2);
        await navigator.clipboard.writeText(jsonText);
        showToast('JSON copied to clipboard!', 'success');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(currentResult, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('JSON copied to clipboard!', 'success');
    }
}

// Download JSON file
function downloadJSON() {
    if (!currentResult) return;
    
    const jsonText = JSON.stringify(currentResult, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentResult.investor.name || 'cas_data'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('JSON file downloaded!', 'success');
}

// Reset form for another parse
function resetForm() {
    clearFile();
    password.value = '';
    hideResults();
    currentResult = null;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toast notifications
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(hideToast, 5000);
}

function hideToast() {
    toast.style.display = 'none';
}

// Check API health
async function checkAPIHealth() {
    try {
        const response = await fetch('/api/health');
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ API is healthy');
        } else {
            showToast('API health check failed', 'error');
        }
    } catch (error) {
        console.error('❌ API health check failed:', error);
        showToast('Failed to connect to API', 'error');
    }
}

// Handle page visibility changes (cleanup on page hide)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is being hidden, could cleanup here if needed
    }
});

// Prevent default drag behaviors on the document
document.addEventListener('dragover', function(e) {
    e.preventDefault();
});

document.addEventListener('drop', function(e) {
    e.preventDefault();
});

// Initialize button state
updateParseButton(true);