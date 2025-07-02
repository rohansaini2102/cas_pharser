class JSONFormatter {
  /**
   * Format the parsed data into the required JSON structure
   * @param {Object} data - Parsed data from CAS parser
   * @returns {Object} - Formatted JSON
   */
  format(data) {
    return {
      investor: this.formatInvestor(data.investor),
      demat_accounts: this.formatDematAccounts(data.demat_accounts),
      mutual_funds: this.formatMutualFunds(data.mutual_funds),
      insurance: this.formatInsurance(data.insurance),
      meta: this.formatMeta(data.meta),
      summary: this.formatSummary(data.summary)
    };
  }

  /**
   * Format investor information
   */
  formatInvestor(investor) {
    return {
      name: (investor.name || '').trim(),
      pan: (investor.pan || '').toUpperCase(),
      address: (investor.address || '').trim(),
      email: (investor.email || '').toLowerCase(),
      mobile: (investor.mobile || '').trim(),
      cas_id: (investor.cas_id || '').trim(),
      pincode: (investor.pincode || '').trim()
    };
  }

  /**
   * Format demat accounts
   */
  formatDematAccounts(accounts) {
    return accounts.map(account => ({
      dp_id: account.dp_id || '',
      dp_name: account.dp_name || '',
      bo_id: account.bo_id || '',
      client_id: account.client_id || '',
      demat_type: account.demat_type || 'cdsl',
      holdings: this.formatHoldings(account.holdings),
      additional_info: {
        status: account.additional_info?.status || 'Active',
        bo_type: account.additional_info?.bo_type || null,
        bo_sub_status: account.additional_info?.bo_sub_status || '',
        bsda: account.additional_info?.bsda || 'NO',
        nominee: account.additional_info?.nominee || '',
        email: account.additional_info?.email || ''
      },
      value: this.formatNumber(account.value)
    }));
  }

  /**
   * Format holdings
   */
  formatHoldings(holdings) {
    return {
      equities: this.formatEquities(holdings.equities || []),
      demat_mutual_funds: this.formatDematMutualFunds(holdings.demat_mutual_funds || []),
      corporate_bonds: this.formatBonds(holdings.corporate_bonds || []),
      government_securities: this.formatGovSecurities(holdings.government_securities || []),
      aifs: holdings.aifs || []
    };
  }

  /**
   * Format equities
   */
  formatEquities(equities) {
    return equities.map(equity => ({
      isin: equity.isin || '',
      name: equity.name || '',
      units: this.formatNumber(equity.units),
      value: this.formatNumber(equity.value),
      additional_info: equity.additional_info || {}
    }));
  }

  /**
   * Format demat mutual funds
   */
  formatDematMutualFunds(funds) {
    return funds.map(fund => ({
      isin: fund.isin || '',
      name: fund.name || '',
      units: this.formatNumber(fund.units),
      value: this.formatNumber(fund.value),
      additional_info: fund.additional_info || {}
    }));
  }

  /**
   * Format bonds
   */
  formatBonds(bonds) {
    return bonds.map(bond => ({
      isin: bond.isin || '',
      name: bond.name || '',
      units: this.formatNumber(bond.units),
      value: this.formatNumber(bond.value),
      additional_info: bond.additional_info || {}
    }));
  }

  /**
   * Format government securities
   */
  formatGovSecurities(securities) {
    return securities.map(security => ({
      isin: security.isin || '',
      name: security.name || '',
      units: this.formatNumber(security.units),
      value: this.formatNumber(security.value),
      additional_info: security.additional_info || {}
    }));
  }

  /**
   * Format mutual funds (non-demat)
   */
  formatMutualFunds(funds) {
    return funds.map(fund => ({
      amc: fund.amc || '',
      folio_number: fund.folio_number || '',
      registrar: fund.registrar || '',
      schemes: this.formatSchemes(fund.schemes || []),
      value: this.formatNumber(fund.value)
    }));
  }

  /**
   * Format mutual fund schemes
   */
  formatSchemes(schemes) {
    return schemes.map(scheme => ({
      isin: scheme.isin || '',
      name: scheme.name || '',
      nav: scheme.nav || '',
      scheme_type: scheme.scheme_type || 'equity',
      units: this.formatNumber(scheme.units),
      value: this.formatNumber(scheme.value),
      additional_info: {
        arn_code: scheme.additional_info?.arn_code || null,
        investment_value: this.formatNumber(scheme.additional_info?.investment_value || 0)
      }
    }));
  }

  /**
   * Format insurance
   */
  formatInsurance(insurance) {
    return {
      life_insurance_policies: insurance.life_insurance_policies || []
    };
  }

  /**
   * Format metadata
   */
  formatMeta(meta) {
    return {
      cas_type: meta.cas_type || 'UNKNOWN',
      generated_at: meta.generated_at || new Date().toISOString().split('.')[0],
      statement_period: {
        from: meta.statement_period?.from || '',
        to: meta.statement_period?.to || ''
      }
    };
  }

  /**
   * Format summary
   */
  formatSummary(summary) {
    return {
      accounts: {
        demat: {
          count: summary.accounts?.demat?.count || 0,
          total_value: this.formatNumber(summary.accounts?.demat?.total_value || 0)
        },
        mutual_funds: {
          count: summary.accounts?.mutual_funds?.count || 0,
          total_value: this.formatNumber(summary.accounts?.mutual_funds?.total_value || 0)
        },
        insurance: {
          count: summary.accounts?.insurance?.count || 0,
          total_value: this.formatNumber(summary.accounts?.insurance?.total_value || 0)
        }
      },
      total_value: this.formatNumber(summary.total_value || 0)
    };
  }

  /**
   * Format number to ensure proper decimal places
   */
  formatNumber(value) {
    const num = parseFloat(value) || 0;
    return Math.round(num * 100) / 100;
  }

  /**
   * Pretty print JSON
   */
  prettyPrint(data) {
    return JSON.stringify(this.format(data), null, 2);
  }
}

module.exports = JSONFormatter;