# CAS Parser - Consolidated Account Statement Parser

A Node.js library to parse Consolidated Account Statement (CAS) documents from various Indian depositories and registrars (CDSL, NSDL, CAMS, KFintech) and extract data in structured JSON format.

## Features

- Parse password-protected CAS PDFs
- Support for CDSL format (other formats coming soon)
- Extract investor information, demat accounts, holdings, and mutual funds
- Structured JSON output
- Modular architecture for easy extension

## Installation

```bash
npm install
```

## Usage

### Command Line

```bash
# Basic usage
node src/index.js <pdf-file> <password> [output-file]

# Example
node src/index.js MAY2025_AA07602549_TXN.pdf APEPY1667C output.json
```

### Programmatic Usage

```javascript
const CASParser = require('./src/index');

const parser = new CASParser();

// Parse a CAS document
const result = await parser.parse('path/to/cas.pdf', 'password');

// Save to file
await parser.saveToFile(result, 'output.json');
```

## Output Format

The parser outputs JSON in the following structure:

```json
{
  "investor": {
    "name": "string",
    "pan": "string",
    "address": "string",
    "email": "string",
    "mobile": "string",
    "cas_id": "string",
    "pincode": "string"
  },
  "demat_accounts": [
    {
      "dp_id": "string",
      "dp_name": "string",
      "bo_id": "string",
      "client_id": "string",
      "demat_type": "cdsl|nsdl",
      "holdings": {
        "equities": [],
        "demat_mutual_funds": [],
        "corporate_bonds": [],
        "government_securities": [],
        "aifs": []
      },
      "additional_info": {},
      "value": "number"
    }
  ],
  "mutual_funds": [
    {
      "amc": "string",
      "folio_number": "string",
      "registrar": "string",
      "schemes": [],
      "value": "number"
    }
  ],
  "insurance": {
    "life_insurance_policies": []
  },
  "meta": {
    "cas_type": "CDSL|NSDL|CAMS|KFINTECH",
    "generated_at": "datetime",
    "statement_period": {
      "from": "date",
      "to": "date"
    }
  },
  "summary": {
    "accounts": {},
    "total_value": "number"
  }
}
```

## Project Structure

```
cas-parser/
├── src/
│   ├── index.js            # Main entry point
│   ├── parsers/           # CAS-specific parsers
│   │   ├── base-parser.js # Abstract base class
│   │   └── cdsl-parser.js # CDSL implementation
│   ├── extractors/        # Data extraction modules (future)
│   ├── utils/             # Utilities
│   │   ├── pdf-reader-*.js # PDF reading utilities
│   │   └── json-formatter.js # JSON formatting
│   └── config/            # Configuration (future)
└── test/                  # Test files
```

## Development

### Adding Support for New CAS Types

1. Create a new parser in `src/parsers/` extending `BaseParser`
2. Implement the required extraction methods
3. Register the parser in `src/index.js`

Example:
```javascript
class NSDLParser extends BaseParser {
  async extractInvestorInfo() {
    // NSDL-specific extraction logic
  }
  
  async extractDematAccounts() {
    // NSDL-specific extraction logic
  }
}
```

### Testing

```bash
npm test
```

## ✅ Encryption Support

The parser now **successfully handles password-protected PDFs** using Mozilla's `pdfjs-dist` library! 

### Tested & Working:
- ✅ CDSL encrypted CAS documents
- ✅ Password: `APEPY1667C` 
- ✅ 9-page PDF with complex formatting
- ✅ Real data extraction (not mock data)

### Successfully Extracts:
- ✅ Investor details (name, PAN, address, email)
- ✅ Multiple demat accounts with DP details
- ✅ Equity holdings with ISINs, quantities, and values
- ✅ Mutual fund holdings (demat)
- ✅ Non-demat mutual fund folios
- ✅ Portfolio valuations and summaries
- ✅ Statement periods and metadata

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC License

## TODO

- [ ] Implement actual PDF decryption for the sample file
- [ ] Add support for NSDL CAS format
- [ ] Add support for CAMS format
- [ ] Add support for KFintech format
- [ ] Add comprehensive error handling
- [ ] Add unit tests for all components
- [ ] Add validation for extracted data
- [ ] Support for multi-page parsing
- [ ] Add CLI options for different output formats (CSV, Excel)