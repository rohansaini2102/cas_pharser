const path = require('path');
const CASParser = require('../src/index');

async function testParser() {
  console.log('=== CAS Parser Test ===\n');
  
  const testFile = path.join(__dirname, '..', 'MAY2025_AA07602549_TXN.pdf');
  const password = 'APEPY1667C';
  
  const parser = new CASParser();
  
  try {
    console.log('Testing with sample CDSL CAS document...');
    console.log(`File: ${testFile}`);
    console.log(`Password: ${password}\n`);
    
    const result = await parser.parse(testFile, password);
    
    // Validate structure
    console.log('Validating output structure...');
    const requiredFields = ['investor', 'demat_accounts', 'mutual_funds', 'insurance', 'meta', 'summary'];
    const missingFields = requiredFields.filter(field => !(field in result));
    
    if (missingFields.length > 0) {
      console.error(`Missing required fields: ${missingFields.join(', ')}`);
    } else {
      console.log('✓ All required fields present');
    }
    
    // Check investor info
    console.log('\nInvestor Information:');
    console.log(`- Name: ${result.investor.name}`);
    console.log(`- PAN: ${result.investor.pan}`);
    console.log(`- Email: ${result.investor.email}`);
    
    // Check demat accounts
    console.log(`\nDemat Accounts: ${result.demat_accounts.length}`);
    result.demat_accounts.forEach((account, index) => {
      console.log(`\nAccount ${index + 1}:`);
      console.log(`- DP ID: ${account.dp_id}`);
      console.log(`- DP Name: ${account.dp_name}`);
      console.log(`- BO ID: ${account.bo_id}`);
      console.log(`- Total Value: ₹${account.value}`);
      console.log(`- Equities: ${account.holdings.equities.length}`);
      console.log(`- Mutual Funds: ${account.holdings.demat_mutual_funds.length}`);
    });
    
    // Check mutual funds
    console.log(`\nMutual Fund Folios: ${result.mutual_funds.length}`);
    result.mutual_funds.forEach((fund, index) => {
      console.log(`\nFolio ${index + 1}:`);
      console.log(`- AMC: ${fund.amc}`);
      console.log(`- Folio Number: ${fund.folio_number}`);
      console.log(`- Schemes: ${fund.schemes.length}`);
      console.log(`- Total Value: ₹${fund.value}`);
    });
    
    // Check summary
    console.log('\nSummary:');
    console.log(`- Total Demat Value: ₹${result.summary.accounts.demat.total_value}`);
    console.log(`- Total MF Value: ₹${result.summary.accounts.mutual_funds.total_value}`);
    console.log(`- Grand Total: ₹${result.summary.total_value}`);
    
    console.log('\n✓ Test completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
testParser();