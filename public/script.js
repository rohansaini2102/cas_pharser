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

// Visualization elements
const viewToggle = document.getElementById('viewToggle');
const tableViewBtn = document.getElementById('tableViewBtn');
const jsonViewBtn = document.getElementById('jsonViewBtn');
const visualizationContent = document.getElementById('visualizationContent');
const jsonContent = document.getElementById('jsonContent');

// Visualization containers
const summaryCards = document.getElementById('summaryCards');
const allocationOverview = document.getElementById('allocationOverview');
const investorCard = document.getElementById('investorCard');
const dematTables = document.getElementById('dematTables');
const mutualFundTables = document.getElementById('mutualFundTables');
const mutualFundSection = document.getElementById('mutualFundSection');

const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');

// Global variables
let currentFile = null;
let currentResult = null;
let currentView = 'table';

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
    
    // View toggle
    tableViewBtn.addEventListener('click', () => switchView('table'));
    jsonViewBtn.addEventListener('click', () => switchView('json'));
    
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
    
    // Update result info for JSON view
    resultFileName.textContent = result.filename;
    resultCasType.textContent = result.data.meta.cas_type;
    resultInvestor.textContent = result.data.investor.name || 'N/A';
    resultTotalValue.textContent = `₹${result.data.summary.total_value.toLocaleString()}`;
    
    // Format and display JSON
    jsonOutput.textContent = JSON.stringify(result.data, null, 2);
    
    // Create visualizations
    createVisualization(result.data);
    
    // Show results with view toggle
    resultsSection.style.display = 'block';
    viewToggle.style.display = 'flex';
    errorResult.style.display = 'none';
    
    // Show initial view (table by default)
    switchView('table');
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    
    showToast('PDF parsed successfully!', 'success');
}

// Create complete visualization
function createVisualization(data) {
    createPortfolioSummary(data);
    createInvestorCard(data.investor, data.meta);
    createDematTables(data.demat_accounts);
    createMutualFundTables(data.mutual_funds);
}

// Create portfolio summary dashboard
function createPortfolioSummary(data) {
    const summary = data.summary;
    
    // Summary cards
    summaryCards.innerHTML = `
        <div class="summary-card">
            <div class="card-title">Total Portfolio</div>
            <div class="card-value">₹${summary.total_value.toLocaleString()}</div>
            <div class="card-subtitle">Complete Holdings</div>
        </div>
        <div class="summary-card secondary">
            <div class="card-title">Demat Accounts</div>
            <div class="card-value">${summary.accounts.demat.count}</div>
            <div class="card-subtitle">₹${summary.accounts.demat.total_value.toLocaleString()}</div>
        </div>
        <div class="summary-card tertiary">
            <div class="card-title">Mutual Fund Folios</div>
            <div class="card-value">${summary.accounts.mutual_funds.count}</div>
            <div class="card-subtitle">₹${summary.accounts.mutual_funds.total_value.toLocaleString()}</div>
        </div>
    `;
    
    // Allocation overview
    const totalValue = summary.total_value;
    const dematValue = summary.accounts.demat.total_value;
    const mfValue = summary.accounts.mutual_funds.total_value;
    
    allocationOverview.innerHTML = `
        <h4 style="margin-bottom: 15px; color: #374151;">Asset Allocation</h4>
        <div class="allocation-item">
            <div class="allocation-label">
                <div class="allocation-dot equity"></div>
                <span>Demat Holdings</span>
            </div>
            <div class="allocation-value">₹${dematValue.toLocaleString()} (${((dematValue/totalValue)*100).toFixed(1)}%)</div>
        </div>
        <div class="allocation-item">
            <div class="allocation-label">
                <div class="allocation-dot mutual-fund"></div>
                <span>Mutual Fund Folios</span>
            </div>
            <div class="allocation-value">₹${mfValue.toLocaleString()} (${((mfValue/totalValue)*100).toFixed(1)}%)</div>
        </div>
    `;
}

// Create investor information card
function createInvestorCard(investor, meta) {
    investorCard.innerHTML = `
        <div class="investor-grid">
            <div class="investor-item">
                <div class="investor-label">Name</div>
                <div class="investor-value">${investor.name || 'N/A'}</div>
            </div>
            <div class="investor-item">
                <div class="investor-label">PAN</div>
                <div class="investor-value">${investor.pan || 'N/A'}</div>
            </div>
            <div class="investor-item">
                <div class="investor-label">Email</div>
                <div class="investor-value">${investor.email || 'N/A'}</div>
            </div>
            <div class="investor-item">
                <div class="investor-label">Mobile</div>
                <div class="investor-value">${investor.mobile || 'N/A'}</div>
            </div>
            <div class="investor-item">
                <div class="investor-label">Address</div>
                <div class="investor-value">${investor.address || 'N/A'}</div>
            </div>
            <div class="investor-item">
                <div class="investor-label">Pincode</div>
                <div class="investor-value">${investor.pincode || 'N/A'}</div>
            </div>
            <div class="investor-item">
                <div class="investor-label">CAS Type</div>
                <div class="investor-value">${meta.cas_type}</div>
            </div>
            <div class="investor-item">
                <div class="investor-label">Statement Period</div>
                <div class="investor-value">${meta.statement_period.from} to ${meta.statement_period.to}</div>
            </div>
        </div>
    `;
}

// Create demat account tables
function createDematTables(accounts) {
    if (!accounts || accounts.length === 0) {
        dematTables.innerHTML = `
            <div class="empty-holdings">
                <div class="empty-holdings-icon">🏦</div>
                <p>No demat accounts found</p>
            </div>
        `;
        return;
    }
    
    dematTables.innerHTML = accounts.map(account => {
        const totalHoldings = 
            account.holdings.equities.length + 
            account.holdings.demat_mutual_funds.length + 
            account.holdings.corporate_bonds.length + 
            account.holdings.government_securities.length;
        
        if (totalHoldings === 0) {
            return `
                <div class="account-table">
                    <div class="table-header">
                        <div>
                            <div class="table-title">${account.dp_name}</div>
                            <div class="table-subtitle">DP ID: ${account.dp_id} | Client ID: ${account.client_id}</div>
                        </div>
                        <div class="table-value">₹${account.value.toLocaleString()}</div>
                    </div>
                    <div class="empty-holdings">
                        <div class="empty-holdings-icon">📊</div>
                        <p>No holdings in this account</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="account-table">
                <div class="table-header">
                    <div>
                        <div class="table-title">${account.dp_name}</div>
                        <div class="table-subtitle">DP ID: ${account.dp_id} | Client ID: ${account.client_id}</div>
                    </div>
                    <div class="table-value">₹${account.value.toLocaleString()}</div>
                </div>
                ${createHoldingsTable(account.holdings)}
            </div>
        `;
    }).join('');
}

// Create holdings table for an account
function createHoldingsTable(holdings) {
    let tablesHTML = '';
    
    // Equities table
    if (holdings.equities && holdings.equities.length > 0) {
        tablesHTML += `
            <div style="background: white; padding: 0;">
                <h4 style="padding: 15px; margin: 0; background: #f8fafc; color: #374151; border-bottom: 1px solid #e2e8f0;">📈 Equity Holdings</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ISIN</th>
                            <th>Security Name</th>
                            <th style="text-align: right;">Units</th>
                            <th style="text-align: right;">Price (₹)</th>
                            <th style="text-align: right;">Value (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${holdings.equities.map(equity => `
                            <tr>
                                <td><span class="isin-code">${equity.isin}</span></td>
                                <td><span class="security-name">${equity.name}</span></td>
                                <td class="units-value">${equity.units.toLocaleString()}</td>
                                <td class="units-value">${equity.additional_info?.market_price?.toLocaleString() || 'N/A'}</td>
                                <td class="numeric-value">₹${equity.value.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Mutual Funds table
    if (holdings.demat_mutual_funds && holdings.demat_mutual_funds.length > 0) {
        tablesHTML += `
            <div style="background: white; padding: 0;">
                <h4 style="padding: 15px; margin: 0; background: #f8fafc; color: #374151; border-bottom: 1px solid #e2e8f0;">🏛️ Mutual Fund Holdings (Demat)</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ISIN</th>
                            <th>Fund Name</th>
                            <th style="text-align: right;">Units</th>
                            <th style="text-align: right;">NAV (₹)</th>
                            <th style="text-align: right;">Value (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${holdings.demat_mutual_funds.map(fund => `
                            <tr>
                                <td><span class="isin-code">${fund.isin}</span></td>
                                <td><span class="security-name">${fund.name}</span></td>
                                <td class="units-value">${fund.units.toLocaleString()}</td>
                                <td class="nav-value">${fund.additional_info?.market_price?.toLocaleString() || 'N/A'}</td>
                                <td class="numeric-value">₹${fund.value.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    return tablesHTML;
}

// Create mutual fund tables
function createMutualFundTables(mutualFunds) {
    if (!mutualFunds || mutualFunds.length === 0) {
        mutualFundSection.style.display = 'none';
        return;
    }
    
    mutualFundSection.style.display = 'block';
    
    mutualFundTables.innerHTML = mutualFunds.map(fund => `
        <div class="fund-table">
            <div class="table-header">
                <div>
                    <div class="table-title">${fund.amc}</div>
                    <div class="table-subtitle">Folio: ${fund.folio_number}</div>
                </div>
                <div class="table-value">₹${fund.value.toLocaleString()}</div>
            </div>
            <table class="scheme-table">
                <thead>
                    <tr>
                        <th>ISIN</th>
                        <th>Scheme Name</th>
                        <th style="text-align: right;">Units</th>
                        <th style="text-align: right;">NAV (₹)</th>
                        <th style="text-align: right;">Value (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${fund.schemes.map(scheme => `
                        <tr>
                            <td><span class="isin-code">${scheme.isin}</span></td>
                            <td><span class="security-name">${scheme.name}</span></td>
                            <td class="units-value">${scheme.units.toLocaleString()}</td>
                            <td class="nav-value">${scheme.nav}</td>
                            <td class="numeric-value">₹${scheme.value.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `).join('');
}

// Switch between table and JSON view
function switchView(view) {
    currentView = view;
    
    // Update buttons
    tableViewBtn.classList.toggle('active', view === 'table');
    jsonViewBtn.classList.toggle('active', view === 'json');
    
    // Show/hide content
    if (view === 'table') {
        visualizationContent.style.display = 'block';
        jsonContent.style.display = 'none';
    } else {
        visualizationContent.style.display = 'none';
        jsonContent.style.display = 'block';
    }
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
    viewToggle.style.display = 'none';
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
    currentView = 'table';
    
    // Reset view toggle
    tableViewBtn.classList.add('active');
    jsonViewBtn.classList.remove('active');
    
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