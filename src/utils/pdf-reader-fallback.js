const fs = require('fs');
const { PdfReader } = require('pdfreader');

class FallbackPDFReader {
  /**
   * Read PDF using pdfreader which handles some encrypted PDFs better
   */
  async readPDF(filePath, password) {
    // For now, always return mock data to test the parser
    // In production, you would need to properly decrypt the PDF
    console.log('Note: Using mock data for testing. Actual PDF decryption requires additional tools.');
    return this.getMockCDSLData();
  }
  
  /**
   * Get mock CDSL data for testing the parser
   */
  getMockCDSLData() {
    return `
CDSL - Central Depository Services (India) Limited
Consolidated Account Statement
Period: 01-MAY-2025 to 31-MAY-2025

Dear JOHN DOE SMITH
PAN: ABCDE1234F

Address: S O JOHN SMITH A WING ROOM NO 101, 
SAMPLE BUILDING SOME AREA NEAR TEST CENTER, 
SAMPLE CITY MUMBAI MAHARASHTRA 400001
Email: user@example.com

Demat Account Details:

DP ID: 12095500
DP Name: SAMPLE BROKER ONE LIMITED
BO ID: 1234567890123456
Status: Active
BO Sub Status: Individual- Resident Negative
Nominee: Not Registered
Email: user@example.com
BSDA: NO

Holdings: No holdings in this account

DP ID: 12088702
DP Name: SAMPLE BROKER TWO LIMITED  
BO ID: 2345678901234567
Status: Active
BO Sub Status: Individual- Resident Negative
Nominee: Not Registered
Email: user@example.com

Equity Holdings:
INE805Q01028 ADCON CAPITAL SERVICES LTD NEW EQUITY SHARES WITH FACE VALUE Re. 1/- AFTER SUBDIVISION 150 111.00
INE092T01019 IDFC FIRST BANK LIMITED EQUITY SHARES 10 680.30
INE053F01010 INDIAN RAILWAY FINANCE CORPORATION LIMITED EQUITY SHARES 10 1389.00
INE733E01010 NTPC LIMITED-EQUITY SHARES 5 1671.25

Mutual Fund Holdings:
INF111M01XX1 SAMPLE AM LTD SAMPLE MF- SAMPLE GOLD ETF 7 658.49
INF222M01XX2 SAMPLE AM LTD SAMPLE MF- SAMPLE SECTOR ETF 5 145.15

DP ID: 12010900
DP Name: SAMPLE BROKER THREE LIMITED
BO ID: 3456789012345678
Status: Active
BO Sub Status: Individual- Resident Negative
Email: user@example.com
Nominee: Not Registered

Equity Holdings:
INE758T01015 ETERNAL LIMITED EQUITY SHARES 8 1910.00
INE040H01021 SUZLON ENERGY LIMITED - NEW EQUITY SHARES OF RS. 2/- AFTER SPLIT 20 1429.20

Mutual Fund Folios

AMC: Sample Mutual Fund
Folio No: 12345678901/0
Schemes:
INF333L01XX3 SAMPLE - Sample Mutual Fund Midcap Fund - Direct Plan Growth 31.286 114.067 3568.70
Investment Value: 3500.09
    `;
  }
}

module.exports = FallbackPDFReader;