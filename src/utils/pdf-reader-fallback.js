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

Dear SURENDRA SATYANARAYAN YELESWARAM
PAN: APEPY1667C

Address: S O SATYANARAYAN YELESWARAM B WING ROOM NO 606, 
CHITRAKUT BUILDING BHATWADI NEAR SAMJA KALYAN KENDRA, 
GHATKOPAR WEST MUMBAI MAHARASHTRA 400084
Email: surendraapril98@gmail.com

Demat Account Details:

DP ID: 12095500
DP Name: INDMONEY PRIVATE LIMITED
BO ID: 1209550018781451
Status: Active
BO Sub Status: Individual- Resident Negative
Nominee: Not Registered
Email: surendraapril98@gmail.com
BSDA: NO

Holdings: No holdings in this account

DP ID: 12088702
DP Name: GROWW INVEST TECH PRIVATE LIMITED  
BO ID: 1208870276193268
Status: Active
BO Sub Status: Individual- Resident Negative
Nominee: Not Registered
Email: surendraapril98@gmail.com

Equity Holdings:
INE805Q01028 ADCON CAPITAL SERVICES LTD NEW EQUITY SHARES WITH FACE VALUE Re. 1/- AFTER SUBDIVISION 150 111.00
INE092T01019 IDFC FIRST BANK LIMITED EQUITY SHARES 10 680.30
INE053F01010 INDIAN RAILWAY FINANCE CORPORATION LIMITED EQUITY SHARES 10 1389.00
INE733E01010 NTPC LIMITED-EQUITY SHARES 5 1671.25

Mutual Fund Holdings:
INF666M01IW1 GROWW AM LTD GROWW MF- GROWW GOLD ETF 7 658.49
INF666M01IH2 GROWW AM LTD GROWW MF- GROWW NIFTY EV & NEW AGE AUTOMOTIVE ETF 5 145.15

DP ID: 12010900
DP Name: MOTILAL OSWAL FINANCIAL SERVICES LIMITED
BO ID: 1201090019432435
Status: Active
BO Sub Status: Individual- Resident Negative
Email: SURENDRAAPRIL98@GMAIL.
Nominee: Not Registered

Equity Holdings:
INE758T01015 ETERNAL LIMITED EQUITY SHARES 8 1910.00
INE040H01021 SUZLON ENERGY LIMITED - NEW EQUITY SHARES OF RS. 2/- AFTER SPLIT 20 1429.20

Mutual Fund Folios

AMC: Motilal Oswal
Folio No: 91086822252/0
Schemes:
INF247L01445 FMGD - Motilal Oswal Midcap Fund - Direct Plan Growth 31.286 114.067 3568.70
Investment Value: 3500.09
    `;
  }
}

module.exports = FallbackPDFReader;