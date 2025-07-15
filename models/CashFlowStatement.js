/**
 * Cash Flow Statement Model
 * 
 * [Feature] OCDI-202: Create financial reporting database models
 * 
 * Comprehensive cash flow statement model tracking operating, investing, 
 * and financing activities with proper validation and calculation methods.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Operating Activities Schema
 */
const operatingActivitiesSchema = new Schema({
  // Cash receipts from operations
  cashFromCustomers: {
    type: Number,
    default: 0,
    description: 'Cash received from customers'
  },
  otherOperatingReceipts: {
    type: Number,
    default: 0,
    description: 'Other cash receipts from operating activities'
  },
  
  // Cash payments for operations
  cashToSuppliers: {
    type: Number,
    default: 0,
    description: 'Cash paid to suppliers and vendors'
  },
  cashToEmployees: {
    type: Number,
    default: 0,
    description: 'Cash paid to employees for services'
  },
  interestPaid: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Interest paid on debt'
  },
  taxesPaid: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Income taxes paid'
  },
  otherOperatingPayments: {
    type: Number,
    default: 0,
    description: 'Other cash payments for operating activities'
  },
  
  // Non-cash adjustments (indirect method)
  netIncome: {
    type: Number,
    default: 0,
    description: 'Net income from income statement'
  },
  depreciation: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Depreciation and amortization expense'
  },
  stockBasedCompensation: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Stock-based compensation expense'
  },
  
  // Working capital changes
  changeInAccountsReceivable: {
    type: Number,
    default: 0,
    description: 'Change in accounts receivable (increase is negative)'
  },
  changeInInventory: {
    type: Number,
    default: 0,
    description: 'Change in inventory (increase is negative)'
  },
  changeInPrepaidExpenses: {
    type: Number,
    default: 0,
    description: 'Change in prepaid expenses (increase is negative)'
  },
  changeInAccountsPayable: {
    type: Number,
    default: 0,
    description: 'Change in accounts payable (increase is positive)'
  },
  changeInAccruedExpenses: {
    type: Number,
    default: 0,
    description: 'Change in accrued expenses (increase is positive)'
  },
  changeInDeferredRevenue: {
    type: Number,
    default: 0,
    description: 'Change in deferred revenue (increase is positive)'
  },
  otherWorkingCapitalChanges: {
    type: Number,
    default: 0,
    description: 'Other working capital changes'
  }
}, { _id: false });

/**
 * Investing Activities Schema
 */
const investingActivitiesSchema = new Schema({
  // Property, plant, and equipment
  purchaseOfPPE: {
    type: Number,
    default: 0,
    max: 0,
    description: 'Purchase of property, plant, and equipment (negative)'
  },
  saleOfPPE: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Proceeds from sale of property, plant, and equipment'
  },
  
  // Investments
  purchaseOfInvestments: {
    type: Number,
    default: 0,
    max: 0,
    description: 'Purchase of investments (negative)'
  },
  saleOfInvestments: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Proceeds from sale of investments'
  },
  
  // Business acquisitions and disposals
  acquisitions: {
    type: Number,
    default: 0,
    max: 0,
    description: 'Cash paid for acquisitions (negative)'
  },
  disposals: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Cash received from disposals'
  },
  
  // Loans and advances
  loansToOthers: {
    type: Number,
    default: 0,
    max: 0,
    description: 'Loans made to others (negative)'
  },
  collectionOfLoans: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Collection of loans from others'
  },
  
  otherInvestingActivities: {
    type: Number,
    default: 0,
    description: 'Other investing activities'
  }
}, { _id: false });

/**
 * Financing Activities Schema
 */
const financingActivitiesSchema = new Schema({
  // Equity financing
  proceedsFromEquityIssuance: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Proceeds from issuance of equity'
  },
  shareRepurchases: {
    type: Number,
    default: 0,
    max: 0,
    description: 'Share repurchases (negative)'
  },
  dividendsPaid: {
    type: Number,
    default: 0,
    max: 0,
    description: 'Dividends paid to shareholders (negative)'
  },
  
  // Debt financing
  proceedsFromDebt: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Proceeds from borrowings'
  },
  debtRepayments: {
    type: Number,
    default: 0,
    max: 0,
    description: 'Repayment of debt (negative)'
  },
  
  // Other financing activities
  proceedsFromStockOptions: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Proceeds from exercise of stock options'
  },
  otherFinancingActivities: {
    type: Number,
    default: 0,
    description: 'Other financing activities'
  }
}, { _id: false });

/**
 * Main Cash Flow Statement Schema
 */
const cashFlowStatementSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  reportingPeriod: {
    type: String,
    required: true,
    trim: true,
    description: 'e.g., 2024-Q1, 2024'
  },
  
  periodStartDate: {
    type: Date,
    required: true
  },
  
  periodEndDate: {
    type: Date,
    required: true,
    index: true
  },
  
  method: {
    type: String,
    enum: ['direct', 'indirect'],
    default: 'indirect',
    description: 'Method used for operating activities'
  },
  
  // Cash flow sections
  operatingActivities: {
    type: operatingActivitiesSchema,
    required: true
  },
  
  investingActivities: {
    type: investingActivitiesSchema,
    required: true
  },
  
  financingActivities: {
    type: financingActivitiesSchema,
    required: true
  },
  
  // Calculated totals
  netCashFromOperating: {
    type: Number,
    default: 0,
    description: 'Net cash provided by operating activities'
  },
  
  netCashFromInvesting: {
    type: Number,
    default: 0,
    description: 'Net cash used in investing activities'
  },
  
  netCashFromFinancing: {
    type: Number,
    default: 0,
    description: 'Net cash provided by financing activities'
  },
  
  netChangeInCash: {
    type: Number,
    default: 0,
    description: 'Net increase/decrease in cash'
  },
  
  // Cash balances
  cashBeginningOfPeriod: {
    type: Number,
    required: true,
    min: 0,
    description: 'Cash at beginning of period'
  },
  
  cashEndOfPeriod: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Cash at end of period'
  },
  
  effectOfExchangeRates: {
    type: Number,
    default: 0,
    description: 'Effect of exchange rate changes on cash'
  },
  
  // Supplemental information
  supplementalDisclosures: {
    interestReceived: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Interest received during the period'
    },
    dividendsReceived: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Dividends received during the period'
    },
    nonCashInvestingActivities: {
      type: String,
      description: 'Description of significant non-cash investing activities'
    },
    nonCashFinancingActivities: {
      type: String,
      description: 'Description of significant non-cash financing activities'
    }
  },
  
  // Metadata
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
  },
  
  preparedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  status: {
    type: String,
    enum: ['draft', 'under_review', 'approved', 'published'],
    default: 'draft'
  },
  
  notes: {
    type: String,
    trim: true
  },
  
  auditStatus: {
    type: String,
    enum: ['unaudited', 'reviewed', 'audited'],
    default: 'unaudited'
  }
  
}, {
  timestamps: true,
  collection: 'cashflowstatements'
});

// Indexes
cashFlowStatementSchema.index({ companyId: 1, periodEndDate: -1 });
cashFlowStatementSchema.index({ reportingPeriod: 1 });
cashFlowStatementSchema.index({ status: 1 });
cashFlowStatementSchema.index({ companyId: 1, reportingPeriod: 1 }, { unique: true });

/**
 * Calculate operating cash flow using indirect method
 */
cashFlowStatementSchema.methods.calculateOperatingCashFlowIndirect = function() {
  const operating = this.operatingActivities;
  
  // Start with net income and add back non-cash items
  let operatingCashFlow = (operating.netIncome || 0) +
                         (operating.depreciation || 0) +
                         (operating.stockBasedCompensation || 0);
  
  // Add working capital changes
  operatingCashFlow += (operating.changeInAccountsReceivable || 0) +
                      (operating.changeInInventory || 0) +
                      (operating.changeInPrepaidExpenses || 0) +
                      (operating.changeInAccountsPayable || 0) +
                      (operating.changeInAccruedExpenses || 0) +
                      (operating.changeInDeferredRevenue || 0) +
                      (operating.otherWorkingCapitalChanges || 0);
  
  return operatingCashFlow;
};

/**
 * Calculate operating cash flow using direct method
 */
cashFlowStatementSchema.methods.calculateOperatingCashFlowDirect = function() {
  const operating = this.operatingActivities;
  
  // Cash receipts
  const cashReceipts = (operating.cashFromCustomers || 0) +
                      (operating.otherOperatingReceipts || 0);
  
  // Cash payments
  const cashPayments = (operating.cashToSuppliers || 0) +
                      (operating.cashToEmployees || 0) +
                      (operating.interestPaid || 0) +
                      (operating.taxesPaid || 0) +
                      (operating.otherOperatingPayments || 0);
  
  return cashReceipts - cashPayments;
};

/**
 * Calculate all cash flow totals
 */
cashFlowStatementSchema.methods.calculateTotals = function() {
  // Calculate operating cash flow based on method
  if (this.method === 'direct') {
    this.netCashFromOperating = this.calculateOperatingCashFlowDirect();
  } else {
    this.netCashFromOperating = this.calculateOperatingCashFlowIndirect();
  }
  
  // Calculate investing cash flow
  const investing = this.investingActivities;
  this.netCashFromInvesting = (investing.purchaseOfPPE || 0) +
                             (investing.saleOfPPE || 0) +
                             (investing.purchaseOfInvestments || 0) +
                             (investing.saleOfInvestments || 0) +
                             (investing.acquisitions || 0) +
                             (investing.disposals || 0) +
                             (investing.loansToOthers || 0) +
                             (investing.collectionOfLoans || 0) +
                             (investing.otherInvestingActivities || 0);
  
  // Calculate financing cash flow
  const financing = this.financingActivities;
  this.netCashFromFinancing = (financing.proceedsFromEquityIssuance || 0) +
                             (financing.shareRepurchases || 0) +
                             (financing.dividendsPaid || 0) +
                             (financing.proceedsFromDebt || 0) +
                             (financing.debtRepayments || 0) +
                             (financing.proceedsFromStockOptions || 0) +
                             (financing.otherFinancingActivities || 0);
  
  // Calculate net change in cash
  this.netChangeInCash = this.netCashFromOperating +
                        this.netCashFromInvesting +
                        this.netCashFromFinancing +
                        (this.effectOfExchangeRates || 0);
  
  // Calculate ending cash balance
  this.cashEndOfPeriod = (this.cashBeginningOfPeriod || 0) + this.netChangeInCash;
  
  return this;
};

/**
 * Validate cash flow statement consistency
 */
cashFlowStatementSchema.methods.validateCashFlow = function() {
  const tolerance = 0.01;
  const calculatedEndingCash = (this.cashBeginningOfPeriod || 0) + this.netChangeInCash;
  const difference = Math.abs(this.cashEndOfPeriod - calculatedEndingCash);
  
  return difference <= tolerance;
};

/**
 * Calculate cash flow ratios
 */
cashFlowStatementSchema.methods.calculateRatios = function() {
  const ratios = {};
  
  // Operating cash flow ratios
  if (this.netCashFromOperating !== 0) {
    ratios.operatingCashFlowRatio = this.netCashFromOperating;
    
    // Free cash flow (Operating CF - Capital Expenditures)
    const capex = Math.abs(this.investingActivities.purchaseOfPPE || 0);
    ratios.freeCashFlow = this.netCashFromOperating - capex;
    
    if (capex > 0) {
      ratios.cashFlowToCapexRatio = this.netCashFromOperating / capex;
    }
  }
  
  // Cash coverage ratios
  if (this.operatingActivities.interestPaid > 0) {
    ratios.cashCoverageRatio = this.netCashFromOperating / this.operatingActivities.interestPaid;
  }
  
  return ratios;
};

/**
 * Get free cash flow
 */
cashFlowStatementSchema.methods.getFreeCashFlow = function() {
  const capex = Math.abs(this.investingActivities.purchaseOfPPE || 0);
  return this.netCashFromOperating - capex;
};

/**
 * Pre-validate hook
 */
cashFlowStatementSchema.pre('validate', function(next) {
  // Calculate totals before validation
  this.calculateTotals();
  
  // Validate cash flow consistency
  if (!this.validateCashFlow()) {
    return next(new Error('Cash flow statement is inconsistent: ending cash does not match calculated value'));
  }
  
  // Validate period dates
  if (this.periodStartDate >= this.periodEndDate) {
    return next(new Error('Period start date must be before period end date'));
  }
  
  next();
});

/**
 * Pre-save hook
 */
cashFlowStatementSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

/**
 * Static method to get comparative cash flow statements
 */
cashFlowStatementSchema.statics.getComparative = async function(companyId, periods) {
  return this.find({
    companyId,
    reportingPeriod: { $in: periods }
  }).sort({ periodEndDate: 1 });
};

/**
 * Static method to get latest cash flow statement
 */
cashFlowStatementSchema.statics.getLatest = async function(companyId) {
  return this.findOne({ companyId }).sort({ periodEndDate: -1 });
};

module.exports = mongoose.model('CashFlowStatement', cashFlowStatementSchema);