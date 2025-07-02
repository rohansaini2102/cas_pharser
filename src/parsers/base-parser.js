class BaseParser {
  constructor() {
    this.casType = 'UNKNOWN';
    this.pdfText = '';
  }

  /**
   * Parse the CAS document
   * @param {string} pdfText - Extracted PDF text
   * @returns {Object} - Parsed data in standardized format
   */
  async parse(pdfText) {
    this.pdfText = pdfText;
    
    // Detect CAS type
    this.casType = this.detectCASType(pdfText);
    
    // Extract data
    const data = {
      investor: await this.extractInvestorInfo(),
      demat_accounts: await this.extractDematAccounts(),
      mutual_funds: await this.extractMutualFunds(),
      insurance: await this.extractInsurance(),
      meta: this.extractMetadata(),
      summary: {}
    };
    
    // Calculate summary
    data.summary = this.calculateSummary(data);
    
    return data;
  }

  /**
   * Detect the type of CAS document
   * @param {string} text - PDF text
   * @returns {string} - CAS type (CDSL, NSDL, CAMS, KFINTECH)
   */
  detectCASType(text) {
    if (text.includes('CDSL') && text.includes('Central Depository Services')) {
      return 'CDSL';
    } else if (text.includes('NSDL')) {
      return 'NSDL';
    } else if (text.includes('Computer Age Management Services')) {
      return 'CAMS';
    } else if (text.includes('KFintech') || text.includes('Karvy')) {
      return 'KFINTECH';
    }
    return 'UNKNOWN';
  }

  /**
   * Extract investor information
   * Must be implemented by subclasses
   */
  async extractInvestorInfo() {
    throw new Error('extractInvestorInfo must be implemented by subclass');
  }

  /**
   * Extract demat account information
   * Must be implemented by subclasses
   */
  async extractDematAccounts() {
    throw new Error('extractDematAccounts must be implemented by subclass');
  }

  /**
   * Extract mutual fund information
   * Must be implemented by subclasses
   */
  async extractMutualFunds() {
    throw new Error('extractMutualFunds must be implemented by subclass');
  }

  /**
   * Extract insurance information
   */
  async extractInsurance() {
    return {
      life_insurance_policies: []
    };
  }

  /**
   * Extract metadata
   */
  extractMetadata() {
    const meta = {
      cas_type: this.casType,
      generated_at: new Date().toISOString().split('.')[0],
      statement_period: this.extractStatementPeriod()
    };
    
    return meta;
  }

  /**
   * Extract statement period
   * Must be implemented by subclasses
   */
  extractStatementPeriod() {
    return {
      from: '',
      to: ''
    };
  }

  /**
   * Calculate summary totals
   */
  calculateSummary(data) {
    const summary = {
      accounts: {
        demat: {
          count: data.demat_accounts.length,
          total_value: 0
        },
        mutual_funds: {
          count: data.mutual_funds.length,
          total_value: 0
        },
        insurance: {
          count: data.insurance.life_insurance_policies.length,
          total_value: 0
        }
      },
      total_value: 0
    };

    // Calculate demat total
    data.demat_accounts.forEach(account => {
      summary.accounts.demat.total_value += account.value || 0;
    });

    // Calculate mutual funds total
    data.mutual_funds.forEach(fund => {
      summary.accounts.mutual_funds.total_value += fund.value || 0;
    });

    // Calculate insurance total
    data.insurance.life_insurance_policies.forEach(policy => {
      summary.accounts.insurance.total_value += policy.value || 0;
    });

    // Calculate grand total
    summary.total_value = 
      summary.accounts.demat.total_value + 
      summary.accounts.mutual_funds.total_value + 
      summary.accounts.insurance.total_value;

    return summary;
  }

  /**
   * Utility method to clean extracted text
   */
  cleanText(text) {
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Utility method to extract value between two patterns
   */
  extractBetween(text, startPattern, endPattern) {
    const startMatch = text.match(startPattern);
    if (!startMatch) return '';
    
    const startIndex = startMatch.index + startMatch[0].length;
    const remainingText = text.substring(startIndex);
    
    const endMatch = remainingText.match(endPattern);
    if (!endMatch) return remainingText.trim();
    
    return remainingText.substring(0, endMatch.index).trim();
  }

  /**
   * Parse date in various formats
   */
  parseDate(dateStr) {
    // Handle DD-MMM-YYYY format
    if (/\d{2}-[A-Z]{3}-\d{4}/i.test(dateStr)) {
      const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      const parts = dateStr.split('-');
      const month = months[parts[1].toUpperCase()];
      return `${parts[2]}-${month}-${parts[0]}`;
    }
    
    // Handle DD/MM/YYYY format
    if (/\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
      const parts = dateStr.split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    return dateStr;
  }

  /**
   * Parse numeric value
   */
  parseNumber(str) {
    if (!str) return 0;
    const cleanStr = str.toString().replace(/[^0-9.-]/g, '');
    return parseFloat(cleanStr) || 0;
  }
}

module.exports = BaseParser;