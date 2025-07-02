const fs = require('fs');
const pdf = require('pdf-parse');

async function testDirect() {
  try {
    const dataBuffer = fs.readFileSync('MAY2025_AA07602549_TXN.pdf');
    
    // Test 1: Try without password
    console.log('Test 1: Trying without password...');
    try {
      const data1 = await pdf(dataBuffer);
      console.log('Success! Text length:', data1.text.length);
      console.log('First 200 chars:', data1.text.substring(0, 200));
    } catch (e1) {
      console.log('Failed:', e1.message);
    }
    
    // Test 2: Try with password
    console.log('\nTest 2: Trying with password...');
    try {
      const data2 = await pdf(dataBuffer, { password: 'APEPY1667C' });
      console.log('Success! Text length:', data2.text.length);
      console.log('First 200 chars:', data2.text.substring(0, 200));
    } catch (e2) {
      console.log('Failed:', e2.message);
    }
    
    // Test 3: Try with different render options
    console.log('\nTest 3: Trying with render options...');
    try {
      const data3 = await pdf(dataBuffer, {
        password: 'APEPY1667C',
        // Try different render options
        max: 0,
        version: 'v2.0.0'
      });
      console.log('Success! Text length:', data3.text.length);
    } catch (e3) {
      console.log('Failed:', e3.message);
    }
    
  } catch (error) {
    console.error('General error:', error);
  }
}

testDirect();