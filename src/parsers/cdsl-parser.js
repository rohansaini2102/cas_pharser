const BaseParser = require('./base-parser');

class CDSLParser extends BaseParser {
  constructor() {
    super();
    this.casType = 'CDSL';
  }

  /**
   * Extract investor information from CDSL CAS
   */
  async extractInvestorInfo() {
    const investor = {
      name: '',
      pan: '',
      address: '',
      email: '',
      mobile: '',
      cas_id: '',
      pincode: ''
    };

    try {
      // Extract name - appears before S O / D O / W O pattern or before PAN
      const nameMatch = this.pdfText.match(/([A-Z][a-z]+(?:\s+[a-z]+)*)\s+(?:S\s+O|D\s+O|W\s+O)\s+/i) ||
                       this.pdfText.match(/([A-Z][a-z]+(?:\s+[a-z]+)*)\s+PAN\s*:/i) ||
                       this.pdfText.match(/Your\s+Demat\s+Account[^]*?single\s+name\s+of\s+([A-Z\s]+)\s+\(/i);
      if (nameMatch) {
        investor.name = this.cleanText(nameMatch[1]);
      }

      // Extract PAN - appears as "PAN: XXXXX9999X"
      const panMatch = this.pdfText.match(/PAN\s*:?\s*([A-Z]{5}[0-9]{4}[A-Z])/i) ||
                      this.pdfText.match(/([A-Z]{5}[0-9]{4}[A-Z])/);
      if (panMatch) {
        investor.pan = panMatch[1];
      }

      // Extract address - appears after "S O [PARENT_NAME]" pattern
      const addressMatch = this.pdfText.match(/S\s+O\s+[A-Z\s]+\s+([A-Z][^]*?)(?:PINCODE|Statement|YOUR)/i);
      if (addressMatch) {
        let address = this.cleanText(addressMatch[1]);
        // Clean up address formatting
        address = address.replace(/\s+/g, ' ').trim();
        
        // Extract pincode from address
        const pincodeMatch = address.match(/(\d{6})/);
        if (pincodeMatch) {
          investor.pincode = pincodeMatch[1];
        }
        investor.address = address;
      }

      // Extract email - appears as "Email Id : user@example.com"
      const emailMatch = this.pdfText.match(/Email\s+Id\s*:?\s*([^\s]+@[^\s]+)/i) ||
                        this.pdfText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        investor.email = emailMatch[1].toLowerCase().replace(/\s/g, '');
      }

      // Extract mobile - appears as "Mobile No : XXXXXX0610"
      const mobileMatch = this.pdfText.match(/Mobile\s+No\s*:?\s*([X0-9]{10,})/i);
      if (mobileMatch && !mobileMatch[1].includes('X')) {
        investor.mobile = mobileMatch[1];
      }

      // Extract CAS ID
      const casIdMatch = this.pdfText.match(/CAS\s+ID\s*:?\s*([A-Z0-9]+)/i);
      if (casIdMatch) {
        investor.cas_id = casIdMatch[1];
      }

    } catch (error) {
      console.error('Error extracting investor info:', error);
    }

    return investor;
  }

  /**
   * Extract demat account information using section-based parsing
   */
  async extractDematAccounts() {
    const accounts = [];
    
    try {
      // Split text by DP Name sections to get distinct accounts
      const dpSections = this.splitIntoAccountSections();
      
      for (let i = 0; i < dpSections.length; i++) {
        const section = dpSections[i];
        const nextSection = dpSections[i + 1];
        
        const account = {
          dp_id: '',
          dp_name: '',
          bo_id: '',
          client_id: '',
          demat_type: 'cdsl',
          holdings: {
            equities: [],
            demat_mutual_funds: [],
            corporate_bonds: [],
            government_securities: [],
            aifs: []
          },
          additional_info: {
            status: 'Active',
            bo_type: null,
            bo_sub_status: '',
            bsda: 'NO',
            nominee: '',
            email: ''
          },
          value: 0
        };

        // Extract account details from section header
        this.extractAccountDetailsFromSection(section, account);
        
        // Find BO ID that belongs to this account using a more precise method
        account.bo_id = this.findBoIdForAccount(section, account, i);
        
        // Extract holdings for this specific account section
        account.holdings = await this.extractHoldingsForAccount(section, nextSection, account);
        
        // Calculate total value
        account.value = this.calculateAccountValue(account.holdings);

        accounts.push(account);
      }
      
    } catch (error) {
      console.error('Error extracting demat accounts:', error);
    }

    return accounts;
  }



  /**
   * Split PDF text into account sections based on DP Name markers
   */
  splitIntoAccountSections() {
    const sections = [];
    
    try {
      if (!this.pdfText || this.pdfText.trim().length === 0) {
        console.warn('No PDF text available for parsing');
        return sections;
      }
      
      // Only match English "DP Name:" sections (account definitions), not Hindi transaction sections
      // Look specifically for the account definition pattern
      const dpPattern = /DP\s+Name\s*:\s*([A-Z][^]*?)(?=DP\s+Name\s*:|MF\s+Folios|Mutual Fund|$)/gi;
      let match;
      
      while ((match = dpPattern.exec(this.pdfText)) !== null) {
        const sectionText = match[0];
        
        // Strict validation for account definition sections
        const hasRequiredFields = sectionText.includes('DP ID') && 
                                 sectionText.includes('CLIENT ID') &&
                                 sectionText.includes('Email Id') &&
                                 sectionText.includes('BO Sub Status');
        
        // Exclude Hindi transaction sections
        const isNotTransactionSection = !sectionText.includes('STATEMENT OF TRANSACTIONS') &&
                                       !sectionText.includes('No Transaction during the period') &&
                                       !sectionText.includes('HOLDING STATEMENT');
        
        // Ensure minimum meaningful content
        const hasMinimumContent = sectionText.trim().length > 200;
        
        if (hasRequiredFields && isNotTransactionSection && hasMinimumContent) {
          sections.push(sectionText);
          console.log(`Valid account section found: ${sectionText.substring(0, 50)}...`);
        } else {
          console.log(`Skipped invalid section: ${sectionText.substring(0, 50)}...`);
        }
      }
      
      console.log(`Found ${sections.length} valid demat account definition sections`);
    } catch (error) {
      console.error('Error splitting into account sections:', error);
    }
    
    return sections;
  }

  /**
   * Extract account details from a section
   */
  extractAccountDetailsFromSection(sectionText, account) {
    try {
      if (!sectionText || !account) {
        console.warn('Invalid parameters for extracting account details');
        return;
      }
      
      // Extract DP Name
      const dpNameMatch = sectionText.match(/DP\s+Name\s*:\s*([^\n]+)/i);
      if (dpNameMatch) {
        account.dp_name = this.cleanText(dpNameMatch[1]);
      } else {
        console.warn('DP Name not found in section');
      }

      // Extract DP ID
      const dpIdMatch = sectionText.match(/DP\s+ID\s*:?\s*(\d+)/i);
      if (dpIdMatch) {
        account.dp_id = dpIdMatch[1];
      } else {
        console.warn('DP ID not found in section');
      }

      // Extract Client ID
      const clientIdMatch = sectionText.match(/CLIENT\s+ID\s*:?\s*(\d+)/i);
      if (clientIdMatch) {
        account.client_id = clientIdMatch[1];
      } else {
        console.warn('Client ID not found in section');
      }

      // Extract additional info
      const emailMatch = sectionText.match(/Email\s+Id\s*:?\s*([^\s]+@[^\s]+)/i);
      if (emailMatch) {
        account.additional_info.email = emailMatch[1].toLowerCase();
      }

      const subStatusMatch = sectionText.match(/BO\s+Sub\s+Status\s*:?\s*([^\n]+)/i);
      if (subStatusMatch) {
        account.additional_info.bo_sub_status = this.cleanText(subStatusMatch[1]);
      }

      const nomineeMatch = sectionText.match(/Nominee\s*:?\s*([^\n]+)/i);
      if (nomineeMatch) {
        account.additional_info.nominee = this.cleanText(nomineeMatch[1]);
      }
      
      // Validate required fields
      if (!account.dp_name || !account.dp_id || !account.client_id) {
        console.warn('Missing required account fields:', {
          dp_name: account.dp_name,
          dp_id: account.dp_id,
          client_id: account.client_id
        });
      }
    } catch (error) {
      console.error('Error extracting account details:', error);
    }
  }

  /**
   * Find BO ID that belongs to this account
   */
  findBoIdForAccount(sectionText, account, accountIndex) {
    try {
      if (!sectionText || !account) {
        console.warn('Invalid parameters for finding BO ID');
        return '';
      }
      
      // Extract all BO IDs from the entire PDF text in order
      const allBoIds = [];
      const boIdPattern = /BO\s+ID\s*:?\s*(\d+)/gi;
      let match;
      
      while ((match = boIdPattern.exec(this.pdfText)) !== null) {
        const boId = match[1];
        if (!allBoIds.includes(boId)) {
          allBoIds.push(boId);
        }
      }
      
      console.log(`Found unique BO IDs in PDF: ${allBoIds.join(', ')}`);
      
      // Map the account index to the corresponding BO ID
      if (accountIndex < allBoIds.length) {
        const assignedBoId = allBoIds[accountIndex];
        console.log(`Assigned BO ID ${assignedBoId} to account ${accountIndex}: ${account.dp_name}`);
        return assignedBoId;
      }
      
      // Fallback: construct BO ID from DP ID + Client ID
      if (account.dp_id && account.client_id) {
        const constructedBoId = account.dp_id + account.client_id;
        console.log(`Constructed BO ID ${constructedBoId} for account ${account.dp_name}`);
        return constructedBoId;
      }
      
      console.warn('Could not find or construct BO ID for account:', account.dp_name);
    } catch (error) {
      console.error('Error finding BO ID for account:', error);
    }
    
    return '';
  }

  /**
   * Extract holdings for a specific account from its section
   */
  async extractHoldingsForAccount(sectionText, nextSectionText, account) {
    const holdings = {
      equities: [],
      demat_mutual_funds: [],
      corporate_bonds: [],
      government_securities: [],
      aifs: []
    };

    try {
      // Find the specific transaction section for this account using BO ID
      const boId = account.bo_id;
      if (!boId) {
        console.log(`No BO ID available for account ${account.dp_name}`);
        return holdings;
      }
      
      // Look for the transaction section that contains this specific BO ID
      // Find the position of this BO ID and extract everything until the next BO ID
      const boIdPattern1 = `BO ID: ${boId}`;
      const boIdPattern2 = `BO ID : ${boId}`;
      
      let startIndex = this.pdfText.indexOf(boIdPattern1);
      if (startIndex === -1) {
        startIndex = this.pdfText.indexOf(boIdPattern2);
      }
      
      if (startIndex !== -1) {
        // Find the next BO ID occurrence
        const nextBoIdIndex = this.pdfText.indexOf('BO ID', startIndex + 10);
        const transactionSection = nextBoIdIndex !== -1 ? 
          this.pdfText.substring(startIndex, nextBoIdIndex) :
          this.pdfText.substring(startIndex);
        
        console.log(`Transaction section for ${account.dp_name} (BO ID ${boId}): ${transactionSection.length} chars`);
        
        
        // Check if this section indicates no holdings
        // Only check for explicit "Nil Holding" - "No Transaction" doesn't mean no holdings
        if (transactionSection.includes('Nil Holding')) {
          console.log(`Account ${account.dp_name} has no holdings (Nil Holding)`);
          return holdings; // Return empty holdings
        }
        
        // Check if this section has actual holdings data
        if (transactionSection.includes('HOLDING STATEMENT') && 
            transactionSection.includes('Portfolio Value')) {
          console.log(`Found holdings section for ${account.dp_name} with BO ID ${boId}`);
          
          // Parse holdings from this specific transaction section
          const parsedHoldings = this.parseHoldingsFromSection(transactionSection);
          
          holdings.equities = parsedHoldings.equities;
          holdings.demat_mutual_funds = parsedHoldings.demat_mutual_funds;
          holdings.corporate_bonds = parsedHoldings.corporate_bonds;
          holdings.government_securities = parsedHoldings.government_securities;
          
          console.log(`Found ${holdings.equities.length} equities and ${holdings.demat_mutual_funds.length} funds for ${account.dp_name}`);
        } else {
          console.log(`Account ${account.dp_name} transaction section found but no holdings data`);
        }
      } else {
        console.log(`No transaction section found for ${account.dp_name} with BO ID ${boId}`);
      }
      
    } catch (error) {
      console.error('Error extracting holdings for account:', account.dp_name, error);
    }

    return holdings;
  }

  /**
   * Parse holdings from a specific section
   */
  parseHoldingsFromSection(sectionText) {
    const holdings = {
      equities: [],
      demat_mutual_funds: [],
      corporate_bonds: [],
      government_securities: [],
      aifs: []
    };

    try {
      // Look for ISIN pattern in holdings table
      const isinPattern = /([A-Z]{2}[A-Z0-9]{9}\d)\s+([^]+?)\s+([\d,]+\.?\d*)\s+--\s+--\s+--\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g;
      let match;
      
      while ((match = isinPattern.exec(sectionText)) !== null) {
        const isin = match[1];
        const name = this.cleanText(match[2]);
        const currentBal = this.parseNumber(match[3]);
        const freeBal = this.parseNumber(match[4]);
        const marketPrice = this.parseNumber(match[5]);
        const value = this.parseNumber(match[6]);
        
        const holding = {
          isin: isin,
          name: name,
          units: currentBal,
          value: value,
          additional_info: {
            market_price: marketPrice,
            free_balance: freeBal
          }
        };
        
        // Categorize by ISIN prefix or name
        if (isin.startsWith('INE') || name.toLowerCase().includes('equity') || name.toLowerCase().includes('shares')) {
          holdings.equities.push(holding);
        } else if (isin.startsWith('INF') || name.toLowerCase().includes('etf') || name.toLowerCase().includes('fund')) {
          holdings.demat_mutual_funds.push(holding);
        } else {
          holdings.equities.push(holding); // Default to equity
        }
      }

    } catch (error) {
      console.error('Error parsing holdings from section:', error);
    }

    return holdings;
  }


  /**
   * Extract holdings from account section (legacy method)
   */
  async extractHoldings(sectionText) {
    return this.parseHoldingsFromSection(sectionText);
  }

  /**
   * Parse equity holdings
   */
  parseEquityHoldings(text) {
    const equities = [];
    
    try {
      // Match pattern: ISIN, Name, Units, Value
      const lines = text.split('\n');
      let currentEquity = null;
      
      for (const line of lines) {
        const cleanLine = this.cleanText(line);
        
        // Match ISIN
        const isinMatch = cleanLine.match(/([A-Z]{2}[A-Z0-9]{9}\d)/);
        if (isinMatch) {
          if (currentEquity) {
            equities.push(currentEquity);
          }
          currentEquity = {
            isin: isinMatch[1],
            name: '',
            units: 0,
            value: 0,
            additional_info: {}
          };
          
          // Extract name after ISIN
          const nameStart = cleanLine.indexOf(isinMatch[1]) + isinMatch[1].length;
          const remainingText = cleanLine.substring(nameStart).trim();
          
          // Look for numeric values (units and value)
          const numbers = remainingText.match(/[\d,]+\.?\d*/g);
          if (numbers && numbers.length >= 2) {
            currentEquity.units = this.parseNumber(numbers[0]);
            currentEquity.value = this.parseNumber(numbers[numbers.length - 1]);
            
            // Extract name between ISIN and first number
            const nameEnd = remainingText.indexOf(numbers[0]);
            currentEquity.name = remainingText.substring(0, nameEnd).trim();
          } else {
            currentEquity.name = remainingText;
          }
        } else if (currentEquity && !currentEquity.name && cleanLine) {
          // Continue name from next line
          currentEquity.name += ' ' + cleanLine;
        }
      }
      
      if (currentEquity) {
        equities.push(currentEquity);
      }
      
    } catch (error) {
      console.error('Error parsing equity holdings:', error);
    }

    return equities;
  }

  /**
   * Parse mutual fund holdings
   */
  parseMutualFundHoldings(text) {
    const funds = [];
    
    try {
      // Similar pattern to equities
      const lines = text.split('\n');
      let currentFund = null;
      
      for (const line of lines) {
        const cleanLine = this.cleanText(line);
        
        // Match ISIN
        const isinMatch = cleanLine.match(/([A-Z]{2}[A-Z0-9]{9}\d)/);
        if (isinMatch) {
          if (currentFund) {
            funds.push(currentFund);
          }
          currentFund = {
            isin: isinMatch[1],
            name: '',
            units: 0,
            value: 0,
            additional_info: {}
          };
          
          // Extract details similar to equity parsing
          const nameStart = cleanLine.indexOf(isinMatch[1]) + isinMatch[1].length;
          const remainingText = cleanLine.substring(nameStart).trim();
          
          const numbers = remainingText.match(/[\d,]+\.?\d*/g);
          if (numbers && numbers.length >= 2) {
            currentFund.units = this.parseNumber(numbers[0]);
            currentFund.value = this.parseNumber(numbers[numbers.length - 1]);
            
            const nameEnd = remainingText.indexOf(numbers[0]);
            currentFund.name = remainingText.substring(0, nameEnd).trim();
          } else {
            currentFund.name = remainingText;
          }
        }
      }
      
      if (currentFund) {
        funds.push(currentFund);
      }
      
    } catch (error) {
      console.error('Error parsing mutual fund holdings:', error);
    }

    return funds;
  }

  /**
   * Parse bond holdings
   */
  parseBondHoldings(text) {
    // Similar implementation to equity parsing
    return [];
  }

  /**
   * Parse government securities
   */
  parseGovSecurities(text) {
    // Similar implementation to equity parsing
    return [];
  }

  /**
   * Extract mutual funds (non-demat) - Generic implementation
   */
  async extractMutualFunds() {
    const mutualFunds = [];
    
    try {
      // Look for mutual fund companies in the document
      const amcPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+Mutual\s+Fund)?)/g;
      const amcSections = [];
      
      // Find MF sections by looking for common patterns
      const mfStartPattern = /MUTUAL\s+FUND\s+UNITS\s+HELD/i;
      const mfStartIndex = this.pdfText.search(mfStartPattern);
      
      if (mfStartIndex !== -1) {
        const mfSection = this.pdfText.substring(mfStartIndex);
        
        // Extract AMC name
        const amcMatch = mfSection.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+Mutual\s+Fund/i);
        if (amcMatch) {
          const mutualFund = {
            amc: amcMatch[1],
            folio_number: '',
            registrar: '',
            schemes: [],
            value: 0
          };
          
          // Extract folio number
          const folioMatch = mfSection.match(/Folio\s+No[\s:]*([\d\/]+)/i);
          if (folioMatch) {
            mutualFund.folio_number = folioMatch[1];
          }
          
          // Extract registrar (RTA)
          const rtaMatch = mfSection.match(/RTA[\s:]*([A-Z]+)/i);
          if (rtaMatch) {
            mutualFund.registrar = rtaMatch[1];
          }
          
          // Extract scheme details from the structured table
          const tablePattern = /Scheme\s+Name[^]*?ISIN[^]*?Folio\s+No[^]*?Closing\s+Bal[^]*?NAV[^]*?Cumulative[^]*?Valuation[^]*?([A-Z][A-Za-z\s-]+(?:Fund|Growth|Plan)[^]*?)\s+([A-Z0-9]+)\s+([^\s]+)\s+([\d.]+)\s+([\d.]+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
          const tableMatch = mfSection.match(tablePattern);
          
          if (tableMatch) {
            const schemeName = this.cleanText(tableMatch[1]);
            const isin = tableMatch[2];
            const folio = tableMatch[3];
            const units = this.parseNumber(tableMatch[4]);
            const nav = tableMatch[5];
            const investmentValue = this.parseNumber(tableMatch[6]);
            const currentValue = this.parseNumber(tableMatch[7]);
            
            // Update folio if not already extracted
            if (!mutualFund.folio_number && folio) {
              mutualFund.folio_number = folio;
            }
            
            const scheme = {
              isin: isin,
              name: schemeName,
              units: units,
              nav: nav,
              value: currentValue,
              scheme_type: this.determineSchemeType(schemeName),
              additional_info: {
                arn_code: null,
                investment_value: investmentValue
              }
            };
            
            mutualFund.schemes.push(scheme);
            mutualFund.value = currentValue;
          }
          
          if (mutualFund.schemes.length > 0) {
            mutualFunds.push(mutualFund);
          }
        }
      }
      
    } catch (error) {
      console.error('Error extracting mutual funds:', error);
    }

    return mutualFunds;
  }

  /**
   * Determine scheme type from scheme name
   */
  determineSchemeType(schemeName) {
    if (!schemeName) return 'equity';
    
    const name = schemeName.toLowerCase();
    if (name.includes('debt') || name.includes('bond') || name.includes('liquid') || name.includes('money')) {
      return 'debt';
    } else if (name.includes('hybrid') || name.includes('balanced')) {
      return 'hybrid';
    } else {
      return 'equity'; // Default
    }
  }

  /**
   * Parse mutual fund schemes
   */
  parseMutualFundSchemes(text) {
    const schemes = [];
    
    try {
      // Extract scheme details
      const schemePattern = /([A-Z]{2}[A-Z0-9]{9}\d)\s+([^]+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g;
      let match;
      
      while ((match = schemePattern.exec(text)) !== null) {
        const scheme = {
          isin: match[1],
          name: this.cleanText(match[2]),
          units: this.parseNumber(match[3]),
          nav: match[4],
          value: this.parseNumber(match[5]),
          scheme_type: 'equity', // Default, can be determined from name
          additional_info: {
            arn_code: null,
            investment_value: 0
          }
        };
        
        // Determine scheme type from name
        if (scheme.name.match(/debt|bond|liquid|money/i)) {
          scheme.scheme_type = 'debt';
        } else if (scheme.name.match(/hybrid|balanced/i)) {
          scheme.scheme_type = 'hybrid';
        }
        
        schemes.push(scheme);
      }
    } catch (error) {
      console.error('Error parsing mutual fund schemes:', error);
    }

    return schemes;
  }

  /**
   * Extract statement period
   */
  extractStatementPeriod() {
    const period = {
      from: '',
      to: ''
    };

    try {
      // Look for period pattern
      const periodMatch = this.pdfText.match(/(?:Period|Statement\s+Period)\s*:?\s*(\d{2}-[A-Z]{3}-\d{4})\s*to\s*(\d{2}-[A-Z]{3}-\d{4})/i) ||
                         this.pdfText.match(/From\s*:?\s*(\d{2}-[A-Z]{3}-\d{4})\s*To\s*:?\s*(\d{2}-[A-Z]{3}-\d{4})/i);
      
      if (periodMatch) {
        period.from = this.parseDate(periodMatch[1]);
        period.to = this.parseDate(periodMatch[2]);
      }
    } catch (error) {
      console.error('Error extracting statement period:', error);
    }

    return period;
  }

  /**
   * Extract DP name pattern for searching in transaction sections
   */
  extractDpNameForSearch(dpName) {
    try {
      // Generic approach: extract the first meaningful company name from any broker
      if (!dpName || typeof dpName !== 'string') {
        return null;
      }
      
      const words = dpName.trim().split(/\s+/);
      
      // Skip common words and find the main company identifier
      const skipWords = ['DP', 'ID', 'CLIENT', 'LIMITED', 'PRIVATE', 'LTD', 'SERVICES', 'FINANCIAL', 'TECH', 'INVEST'];
      
      for (const word of words) {
        // Look for words that are likely company names (length > 3, not common words)
        if (word.length > 3 && 
            !skipWords.includes(word.toUpperCase()) && 
            !/^\d+$/.test(word) && // Not just numbers
            word.match(/^[A-Z][A-Z]+$/)) { // All caps words (company names)
          return word;
        }
      }
      
      // Fallback: return first non-generic word
      for (const word of words) {
        if (word.length > 4 && !skipWords.includes(word.toUpperCase())) {
          return word;
        }
      }
    } catch (error) {
      console.error('Error extracting DP name pattern:', error);
    }
    
    return null;
  }

  /**
   * Calculate account value
   */
  calculateAccountValue(holdings) {
    let total = 0;
    
    Object.values(holdings).forEach(holdingType => {
      holdingType.forEach(holding => {
        total += holding.value || 0;
      });
    });
    
    return total;
  }
}

module.exports = CDSLParser;