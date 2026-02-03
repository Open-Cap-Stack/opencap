/**
 * Currency Service
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * Provides comprehensive currency features including:
 * - Multi-currency support
 * - Exchange rate management
 * - Currency conversion
 */

const databaseAdapter = require('./databaseAdapter');

class CurrencyService {
  constructor() {
    // Cache for exchange rates
    this._ratesCache = null;
    this._cacheTimestamp = null;
    this._cacheTTL = 5 * 60 * 1000; // 5 minutes

    // Currency metadata
    this.currencyDetails = {
      USD: { name: 'US Dollar', symbol: '$', locale: 'en-US' },
      EUR: { name: 'Euro', symbol: '\u20AC', locale: 'de-DE' },
      GBP: { name: 'British Pound', symbol: '\u00A3', locale: 'en-GB' },
      JPY: { name: 'Japanese Yen', symbol: '\u00A5', locale: 'ja-JP' },
      CAD: { name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
      AUD: { name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
      CHF: { name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH' },
      CNY: { name: 'Chinese Yuan', symbol: '\u00A5', locale: 'zh-CN' },
      INR: { name: 'Indian Rupee', symbol: '\u20B9', locale: 'en-IN' },
      MXN: { name: 'Mexican Peso', symbol: '$', locale: 'es-MX' },
      BRL: { name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR' },
      KRW: { name: 'South Korean Won', symbol: '\u20A9', locale: 'ko-KR' },
      SGD: { name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
      HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'zh-HK' },
      NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ' }
    };
  }

  /**
   * Convert amount from one currency to another
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @param {Object} options - Conversion options
   * @returns {Object} Conversion result
   */
  async convertCurrency(amount, fromCurrency, toCurrency, options = {}) {
    // Validate inputs
    if (typeof amount !== 'number' || amount < 0) {
      throw new Error('Amount must be a positive number');
    }

    if (!fromCurrency) {
      throw new Error('From currency is required');
    }

    if (!toCurrency) {
      throw new Error('To currency is required');
    }

    // Normalize currency codes
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Same currency - no conversion needed
    if (from === to) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency: from,
        toCurrency: to,
        exchangeRate: 1,
        timestamp: new Date()
      };
    }

    // Get exchange rate
    const rateData = await this._getRatesData();
    const exchangeRate = this._calculateRate(from, to, rateData);

    // Apply precision
    const precision = options.precision || 2;
    const convertedAmount = Number((amount * exchangeRate).toFixed(precision));

    return {
      originalAmount: amount,
      convertedAmount,
      fromCurrency: from,
      toCurrency: to,
      exchangeRate,
      timestamp: new Date()
    };
  }

  /**
   * Get current exchange rate between two currencies
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @param {Object} options - Options including historical date
   * @returns {Object} Exchange rate information
   */
  async getExchangeRate(fromCurrency, toCurrency, options = {}) {
    const from = fromCurrency?.toUpperCase();
    const to = toCurrency?.toUpperCase();

    // Same currency
    if (from === to) {
      return {
        rate: 1,
        fromCurrency: from,
        toCurrency: to,
        timestamp: new Date(),
        historical: false
      };
    }

    let rateData;

    if (options.date) {
      // Fetch historical rate
      rateData = await databaseAdapter.findOne('ExchangeRate', {
        date: {
          $gte: new Date(options.date.setHours(0, 0, 0, 0)),
          $lt: new Date(options.date.setHours(23, 59, 59, 999))
        }
      });

      if (!rateData) {
        throw new Error('Historical exchange rate data not available');
      }
    } else {
      // Fetch current rate
      rateData = await this._getRatesData();
    }

    const rate = this._calculateRate(from, to, rateData);

    return {
      rate,
      fromCurrency: from,
      toCurrency: to,
      timestamp: rateData.updatedAt || new Date(),
      historical: !!options.date
    };
  }

  /**
   * Update exchange rates from external source
   * @param {Object} options - Update options
   * @returns {Object} Update result
   */
  async updateRates(options = {}) {
    const baseCurrency = options.baseCurrency || 'USD';

    try {
      // Fetch rates from external source
      const externalData = await this._fetchExternalRates(baseCurrency);

      // Check for existing rate record
      const existingRate = await databaseAdapter.findOne('ExchangeRate', {
        baseCurrency,
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      });

      let savedRate;
      if (existingRate) {
        // Update existing
        savedRate = await databaseAdapter.findByIdAndUpdate(
          'ExchangeRate',
          existingRate._id,
          {
            rates: externalData.rates,
            updatedAt: new Date()
          }
        );
      } else {
        // Create new
        savedRate = await databaseAdapter.create('ExchangeRate', {
          baseCurrency,
          rates: externalData.rates,
          date: new Date(),
          updatedAt: new Date()
        });
      }

      // Clear cache
      this._ratesCache = null;
      this._cacheTimestamp = null;

      return {
        success: true,
        baseCurrency,
        ratesUpdated: Object.keys(externalData.rates).length,
        updatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to update exchange rates: ${error.message}`);
    }
  }

  /**
   * Get list of supported currencies
   * @param {Object} options - Options
   * @returns {Object} Supported currencies
   */
  async getSupportedCurrencies(options = {}) {
    const rateData = await this._getRatesData();

    const currencies = [rateData.baseCurrency, ...Object.keys(rateData.rates)];

    const result = {
      currencies: currencies.sort(),
      baseCurrency: rateData.baseCurrency,
      count: currencies.length
    };

    if (options.includeDetails) {
      result.currencyDetails = {};
      currencies.forEach(code => {
        result.currencyDetails[code] = this.currencyDetails[code] || {
          name: code,
          symbol: code,
          locale: 'en-US'
        };
      });
    }

    return result;
  }

  /**
   * Format amount with currency
   * @param {number} amount - Amount to format
   * @param {string} currencyCode - Currency code
   * @param {Object} options - Formatting options
   * @returns {string} Formatted amount
   */
  formatCurrency(amount, currencyCode, options = {}) {
    const code = currencyCode?.toUpperCase() || 'USD';
    const details = this.currencyDetails[code] || { locale: 'en-US' };
    const locale = options.locale || details.locale;

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: options.minimumFractionDigits ?? 2,
        maximumFractionDigits: options.maximumFractionDigits ?? 2
      }).format(amount);
    } catch (error) {
      // Fallback for unsupported currencies
      const symbol = details.symbol || code;
      return `${symbol}${amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
  }

  /**
   * Get exchange rate history
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @param {Object} options - Options including date range
   * @returns {Object} Rate history
   */
  async getRateHistory(fromCurrency, toCurrency, options = {}) {
    const from = fromCurrency?.toUpperCase();
    const to = toCurrency?.toUpperCase();

    const query = {};
    if (options.startDate || options.endDate) {
      query.date = {};
      if (options.startDate) query.date.$gte = options.startDate;
      if (options.endDate) query.date.$lte = options.endDate;
    }

    const historicalRates = await databaseAdapter.find('ExchangeRate', query, {
      sort: { date: 1 }
    });

    const history = historicalRates.map(record => {
      const rate = this._calculateRate(from, to, record);
      return {
        date: record.date,
        rate
      };
    });

    // Calculate statistics
    const rates = history.map(h => h.rate);
    const statistics = {
      min: rates.length > 0 ? Math.min(...rates) : null,
      max: rates.length > 0 ? Math.max(...rates) : null,
      average: rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
      volatility: this._calculateVolatility(rates)
    };

    return {
      fromCurrency: from,
      toCurrency: to,
      history,
      statistics,
      dataPoints: history.length
    };
  }

  /**
   * Batch convert multiple amounts to a single currency
   * @param {Array} conversions - Array of {amount, currency} objects
   * @param {string} targetCurrency - Target currency
   * @returns {Object} Batch conversion results
   */
  async batchConvert(conversions, targetCurrency) {
    if (!conversions || conversions.length === 0) {
      return {
        conversions: [],
        total: 0,
        targetCurrency
      };
    }

    const target = targetCurrency?.toUpperCase();
    const rateData = await this._getRatesData();

    const results = conversions.map(item => {
      const from = item.currency?.toUpperCase();
      const rate = this._calculateRate(from, target, rateData);
      const convertedAmount = Number((item.amount * rate).toFixed(2));

      return {
        originalAmount: item.amount,
        originalCurrency: from,
        convertedAmount,
        exchangeRate: rate
      };
    });

    const total = results.reduce((sum, r) => sum + r.convertedAmount, 0);

    return {
      conversions: results,
      total: Number(total.toFixed(2)),
      targetCurrency: target,
      timestamp: new Date()
    };
  }

  // Private helper methods

  /**
   * Get rates data with caching
   * @returns {Object} Exchange rate data
   */
  async _getRatesData() {
    // Check cache
    if (this._ratesCache && this._cacheTimestamp) {
      const cacheAge = Date.now() - this._cacheTimestamp;
      if (cacheAge < this._cacheTTL) {
        return this._ratesCache;
      }
    }

    // Fetch from database
    const rateData = await databaseAdapter.findOne('ExchangeRate', {}, {
      sort: { updatedAt: -1 }
    });

    if (!rateData) {
      throw new Error('Exchange rate data not available');
    }

    // Update cache
    this._ratesCache = rateData;
    this._cacheTimestamp = Date.now();

    return rateData;
  }

  /**
   * Calculate exchange rate between two currencies
   * @param {string} from - Source currency
   * @param {string} to - Target currency
   * @param {Object} rateData - Exchange rate data
   * @returns {number} Exchange rate
   */
  _calculateRate(from, to, rateData) {
    const base = rateData.baseCurrency;
    const rates = rateData.rates;

    // Same currency - no conversion needed
    if (from === to) {
      return 1;
    }

    // If converting from base currency
    if (from === base) {
      if (to === base) {
        return 1;
      }
      if (!rates[to]) {
        throw new Error(`Unsupported currency: ${to}`);
      }
      return rates[to];
    }

    // If converting to base currency
    if (to === base) {
      if (!rates[from]) {
        throw new Error(`Unsupported currency: ${from}`);
      }
      return 1 / rates[from];
    }

    // Cross-currency conversion (from -> base -> to)
    if (!rates[from]) {
      throw new Error(`Unsupported currency: ${from}`);
    }
    if (!rates[to]) {
      throw new Error(`Unsupported currency: ${to}`);
    }

    // from -> base -> to
    const fromToBase = 1 / rates[from];
    const baseToTarget = rates[to];

    return fromToBase * baseToTarget;
  }

  /**
   * Fetch exchange rates from external API (mock implementation)
   * @param {string} baseCurrency - Base currency
   * @returns {Object} External rate data
   */
  async _fetchExternalRates(baseCurrency) {
    // In production, this would call an external API like exchangeratesapi.io
    // For now, return mock data structure
    // The actual implementation would use axios/fetch to call the API

    // Mock response structure matching external API format
    return {
      base: baseCurrency,
      rates: {
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110.5,
        CAD: 1.25,
        AUD: 1.35,
        CHF: 0.92,
        CNY: 6.45,
        INR: 74.5,
        MXN: 20.1,
        BRL: 5.25
      },
      timestamp: Date.now()
    };
  }

  /**
   * Calculate volatility (standard deviation / mean)
   * @param {Array} values - Array of rate values
   * @returns {number} Volatility measure
   */
  _calculateVolatility(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / mean;
  }

  /**
   * Reset rates cache (for testing)
   */
  _resetRatesCache() {
    this._ratesCache = null;
    this._cacheTimestamp = null;
  }

  /**
   * Expire cache (for testing)
   */
  _expireCache() {
    this._cacheTimestamp = 0;
  }
}

// Export singleton instance
module.exports = new CurrencyService();
