/**
 * ZeroDB Table Creation Script
 * GitHub Issue #7: [Phase 1] Create ZeroDB table creation scripts
 *
 * This script creates all ZeroDB tables mapped from MongoDB/Mongoose schemas.
 * It is idempotent and can be run multiple times safely.
 *
 * Usage:
 *   node scripts/createZeroDBTables.js [--cleanup]
 *
 * Options:
 *   --cleanup  Drop all tables before creating (WARNING: destructive)
 *
 * Environment Variables Required:
 *   ZERODB_TOKEN  - Authentication token for ZeroDB API
 */

const zerodbService = require('../services/zerodbService');

// Table schemas mapped from Mongoose models
const TABLE_SCHEMAS = {
  // =============================================================================
  // USERS & AUTHENTICATION
  // =============================================================================

  users: {
    description: 'Primary user accounts from User.js',
    fields: {
      userId: { type: 'TEXT', notNull: true, unique: true },
      firstName: { type: 'TEXT', notNull: true },
      lastName: { type: 'TEXT', notNull: true },
      displayName: { type: 'TEXT' },
      email: { type: 'TEXT', notNull: true, unique: true },
      password: { type: 'TEXT', notNull: true },
      role: { type: 'TEXT', notNull: true }, // enum: admin, manager, user, client
      permissions: { type: 'TEXT[]' }, // Array of permission strings
      status: { type: 'TEXT', default: 'pending' }, // enum: active, pending, inactive, suspended
      companyId: { type: 'TEXT' },
      profile: { type: 'JSONB' }, // Nested profile object
      lastLogin: { type: 'TIMESTAMP' },
      passwordResetToken: { type: 'TEXT' },
      passwordResetExpires: { type: 'TIMESTAMP' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['email'] },
      { columns: ['userId'] },
      { columns: ['companyId'] },
      { columns: ['companyId', 'email'], unique: true }
    ],
    constraints: [
      "CHECK (role IN ('admin', 'manager', 'user', 'client'))",
      "CHECK (status IN ('active', 'pending', 'inactive', 'suspended'))"
    ]
  },

  user_models: {
    description: 'Alternative user model from userModel.js (separate from users table)',
    fields: {
      userId: { type: 'TEXT', notNull: true, unique: true },
      username: { type: 'TEXT', notNull: true },
      email: { type: 'TEXT', notNull: true },
      password: { type: 'TEXT' },
      UserRoles: { type: 'TEXT[]', notNull: true }, // enum: Admin, Editor, Viewer
      Permissions: { type: 'TEXT', notNull: true },
      AuditLogs: { type: 'TEXT[]', default: '{}' },
      AuthenticationMethods: { type: 'TEXT', default: 'UsernamePassword' }, // enum: OAuth, UsernamePassword
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['userId'] },
      { columns: ['email'] },
      { columns: ['username'] }
    ],
    constraints: [
      "CHECK (AuthenticationMethods IN ('OAuth', 'UsernamePassword'))"
    ]
  },

  admins: {
    description: 'Admin users from admin.js',
    fields: {
      UserID: { type: 'TEXT', notNull: true, unique: true },
      Name: { type: 'TEXT', notNull: true },
      Email: { type: 'TEXT', notNull: true, unique: true },
      UserRoles: { type: 'TEXT[]' },
      NotificationSettings: { type: 'JSONB' } // emailNotifications, smsNotifications, pushNotifications, notificationFrequency
    },
    indexes: [
      { columns: ['UserID'] },
      { columns: ['Email'] }
    ]
  },

  // =============================================================================
  // COMPANIES & STAKEHOLDERS
  // =============================================================================

  companies: {
    description: 'Company entities from Company.js',
    fields: {
      companyId: { type: 'TEXT', notNull: true, unique: true },
      name: { type: 'TEXT', notNull: true },
      legalName: { type: 'TEXT' },
      taxId: { type: 'TEXT', unique: true },
      incorporationDate: { type: 'DATE' },
      jurisdiction: { type: 'TEXT' },
      industry: { type: 'TEXT' },
      website: { type: 'TEXT' },
      description: { type: 'TEXT' },
      address: { type: 'JSONB' }, // street, city, state, zipCode, country
      contacts: { type: 'JSONB' }, // phone, email, fax
      status: { type: 'TEXT', default: 'active' }, // enum: active, inactive, dissolved
      metadata: { type: 'JSONB' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['companyId'] },
      { columns: ['taxId'] },
      { columns: ['status'] }
    ],
    constraints: [
      "CHECK (status IN ('active', 'inactive', 'dissolved'))"
    ]
  },

  stakeholders: {
    description: 'Stakeholders from Stakeholder.js',
    fields: {
      stakeholderId: { type: 'TEXT', notNull: true, unique: true },
      companyId: { type: 'TEXT', notNull: true },
      userId: { type: 'TEXT' },
      type: { type: 'TEXT', notNull: true }, // enum: investor, employee, advisor, founder
      firstName: { type: 'TEXT', notNull: true },
      lastName: { type: 'TEXT', notNull: true },
      email: { type: 'TEXT', notNull: true },
      phone: { type: 'TEXT' },
      address: { type: 'JSONB' },
      taxId: { type: 'TEXT' },
      citizenship: { type: 'TEXT' },
      accreditedInvestor: { type: 'BOOLEAN', default: false },
      shareHoldings: { type: 'JSONB[]' }, // Array of {shareClassId, quantity, purchaseDate, purchasePrice}
      documents: { type: 'TEXT[]' },
      status: { type: 'TEXT', default: 'active' }, // enum: active, inactive, terminated
      metadata: { type: 'JSONB' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['stakeholderId'] },
      { columns: ['companyId'] },
      { columns: ['userId'] },
      { columns: ['email'] },
      { columns: ['type'] }
    ],
    constraints: [
      "CHECK (type IN ('investor', 'employee', 'advisor', 'founder'))",
      "CHECK (status IN ('active', 'inactive', 'terminated'))"
    ]
  },

  investors: {
    description: 'Investor records from Investor.js',
    fields: {
      investorId: { type: 'TEXT', notNull: true, unique: true },
      name: { type: 'TEXT', notNull: true },
      email: { type: 'TEXT', notNull: true },
      phone: { type: 'TEXT' },
      accreditationStatus: { type: 'TEXT' },
      investmentHistory: { type: 'JSONB[]' }
    },
    indexes: [
      { columns: ['investorId'] },
      { columns: ['email'] }
    ]
  },

  // =============================================================================
  // EQUITY & SHARES
  // =============================================================================

  share_classes: {
    description: 'Share classes from ShareClass.js',
    fields: {
      shareClassId: { type: 'TEXT', notNull: true, unique: true },
      companyId: { type: 'TEXT', notNull: true },
      className: { type: 'TEXT', notNull: true },
      classType: { type: 'TEXT', notNull: true }, // enum: common, preferred, convertible
      authorizedShares: { type: 'BIGINT', notNull: true },
      issuedShares: { type: 'BIGINT', default: 0 },
      outstandingShares: { type: 'BIGINT', default: 0 },
      parValue: { type: 'DECIMAL(15,4)' },
      pricePerShare: { type: 'DECIMAL(15,4)' },
      votingRights: { type: 'TEXT', default: 'standard' }, // enum: standard, super, none
      conversionRatio: { type: 'DECIMAL(10,6)' },
      dividendRate: { type: 'DECIMAL(10,4)' },
      liquidationPreference: { type: 'DECIMAL(10,2)' },
      participationRights: { type: 'TEXT', default: 'non-participating' }, // enum: participating, non-participating, capped
      redemptionRights: { type: 'BOOLEAN', default: false },
      antiDilutionProvision: { type: 'TEXT' }, // enum: full-ratchet, weighted-average, none
      restrictions: { type: 'TEXT[]' },
      metadata: { type: 'JSONB' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['shareClassId'] },
      { columns: ['companyId'] },
      { columns: ['classType'] }
    ],
    constraints: [
      "CHECK (classType IN ('common', 'preferred', 'convertible'))",
      "CHECK (votingRights IN ('standard', 'super', 'none'))",
      "CHECK (participationRights IN ('participating', 'non-participating', 'capped'))",
      "CHECK (authorizedShares >= 0)",
      "CHECK (issuedShares >= 0)",
      "CHECK (outstandingShares >= 0)",
      "CHECK (outstandingShares <= issuedShares)"
    ]
  },

  equity_plans: {
    description: 'Equity incentive plans from EquityPlanModel.js',
    fields: {
      EquityPlanID: { type: 'TEXT', notNull: true, unique: true },
      CompanyID: { type: 'TEXT', notNull: true },
      PlanName: { type: 'TEXT', notNull: true },
      TotalShares: { type: 'BIGINT', notNull: true },
      AvailableShares: { type: 'BIGINT', notNull: true },
      VestingSchedule: { type: 'JSONB' },
      ExercisePrice: { type: 'DECIMAL(15,4)' }
    },
    indexes: [
      { columns: ['EquityPlanID'] },
      { columns: ['CompanyID'] }
    ],
    constraints: [
      "CHECK (TotalShares >= 0)",
      "CHECK (AvailableShares >= 0)",
      "CHECK (AvailableShares <= TotalShares)"
    ]
  },

  employees: {
    description: 'Employee records with equity from employeeModel.js',
    fields: {
      EmployeeID: { type: 'TEXT', notNull: true, unique: true },
      CompanyID: { type: 'TEXT', notNull: true },
      FirstName: { type: 'TEXT', notNull: true },
      LastName: { type: 'TEXT', notNull: true },
      Email: { type: 'TEXT', notNull: true },
      Position: { type: 'TEXT' },
      StartDate: { type: 'DATE', notNull: true },
      EndDate: { type: 'DATE' },
      Status: { type: 'TEXT', default: 'Active' }, // enum: Active, Terminated, OnLeave
      EquityGrant: { type: 'JSONB' }, // SharesGranted, VestedShares, VestingStartDate, VestingEndDate
      DocumentAccess: { type: 'TEXT[]', default: '{}' },
      // Pre-save validation logic: EquityGrant.VestedShares <= EquityGrant.SharesGranted
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['EmployeeID'] },
      { columns: ['CompanyID'] },
      { columns: ['Email'] },
      { columns: ['Status'] }
    ],
    constraints: [
      "CHECK (Status IN ('Active', 'Terminated', 'OnLeave'))"
    ]
  },

  // =============================================================================
  // TRANSACTIONS & FINANCE
  // =============================================================================

  transactions: {
    description: 'Financial transactions from Transaction.js',
    fields: {
      transactionId: { type: 'TEXT', notNull: true, unique: true },
      userId: { type: 'TEXT', notNull: true },
      companyId: { type: 'TEXT' },
      accountId: { type: 'TEXT' },
      amount: { type: 'DECIMAL(15,2)', notNull: true },
      currency: { type: 'TEXT', notNull: true }, // enum: USD, EUR, GBP, CAD, AUD, JPY, CNY, INR, CHF, BRL
      type: { type: 'TEXT', notNull: true }, // enum: payment, refund, payout, deposit, withdrawal, transfer, fee, adjustment
      status: { type: 'TEXT', notNull: true }, // enum: pending, processing, completed, failed, cancelled, refunded, declined
      description: { type: 'TEXT' },
      metadata: { type: 'JSONB' },
      fees: { type: 'JSONB' }, // processingFee, platformFee, taxAmount, otherFees
      relatedTransactions: { type: 'TEXT[]' },
      paymentMethod: { type: 'TEXT', default: 'other' }, // enum: credit_card, debit_card, bank_transfer, wallet, cash, other
      failureReason: { type: 'TEXT' },
      processedAt: { type: 'TIMESTAMP' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['transactionId'] },
      { columns: ['userId'] },
      { columns: ['companyId'] },
      { columns: ['accountId'] },
      { columns: ['userId', 'createdAt'] },
      { columns: ['companyId', 'createdAt'] },
      { columns: ['status', 'createdAt'] },
      { columns: ['type', 'createdAt'] }
    ],
    constraints: [
      "CHECK (amount > 0)",
      "CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'))",
      "CHECK (type IN ('payment', 'refund', 'payout', 'deposit', 'withdrawal', 'transfer', 'fee', 'adjustment'))",
      "CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'declined'))",
      "CHECK (paymentMethod IN ('credit_card', 'debit_card', 'bank_transfer', 'wallet', 'cash', 'other'))"
    ]
  },

  balance_sheets: {
    description: 'Balance sheet statements from BalanceSheet.js',
    fields: {
      balanceSheetId: { type: 'TEXT', notNull: true, unique: true },
      companyId: { type: 'TEXT', notNull: true },
      reportingDate: { type: 'DATE', notNull: true },
      fiscalYear: { type: 'INTEGER' },
      fiscalQuarter: { type: 'INTEGER' },
      assets: { type: 'JSONB', notNull: true }, // currentAssets, nonCurrentAssets, totalAssets
      liabilities: { type: 'JSONB', notNull: true }, // currentLiabilities, nonCurrentLiabilities, totalLiabilities
      equity: { type: 'JSONB', notNull: true }, // shareCapital, retainedEarnings, treasuryStock, totalEquity
      currency: { type: 'TEXT', default: 'USD' },
      status: { type: 'TEXT', default: 'draft' }, // enum: draft, final, audited
      notes: { type: 'TEXT' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['balanceSheetId'] },
      { columns: ['companyId'] },
      { columns: ['reportingDate'] },
      { columns: ['companyId', 'reportingDate'], unique: true }
    ],
    constraints: [
      "CHECK (status IN ('draft', 'final', 'audited'))",
      "CHECK (fiscalQuarter >= 1 AND fiscalQuarter <= 4)"
    ]
  },

  cash_flow_statements: {
    description: 'Cash flow statements from CashFlowStatement.js',
    fields: {
      cashFlowId: { type: 'TEXT', notNull: true, unique: true },
      companyId: { type: 'TEXT', notNull: true },
      reportingDate: { type: 'DATE', notNull: true },
      fiscalYear: { type: 'INTEGER' },
      fiscalQuarter: { type: 'INTEGER' },
      operatingActivities: { type: 'JSONB' },
      investingActivities: { type: 'JSONB' },
      financingActivities: { type: 'JSONB' },
      netCashFlow: { type: 'DECIMAL(15,2)' },
      openingCashBalance: { type: 'DECIMAL(15,2)' },
      closingCashBalance: { type: 'DECIMAL(15,2)' },
      currency: { type: 'TEXT', default: 'USD' },
      status: { type: 'TEXT', default: 'draft' },
      notes: { type: 'TEXT' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['cashFlowId'] },
      { columns: ['companyId'] },
      { columns: ['reportingDate'] }
    ],
    constraints: [
      "CHECK (status IN ('draft', 'final', 'audited'))"
    ]
  },

  financial_metrics: {
    description: 'Financial KPIs and metrics from FinancialMetrics.js',
    fields: {
      metricId: { type: 'TEXT', notNull: true, unique: true },
      companyId: { type: 'TEXT', notNull: true },
      reportingDate: { type: 'DATE', notNull: true },
      period: { type: 'TEXT', notNull: true }, // enum: monthly, quarterly, annual
      revenue: { type: 'JSONB' }, // totalRevenue, recurringRevenue, oneTimeRevenue
      expenses: { type: 'JSONB' }, // operatingExpenses, capitalExpenses, totalExpenses
      profitability: { type: 'JSONB' }, // grossProfit, netProfit, ebitda, ebit, margins
      cashMetrics: { type: 'JSONB' }, // cashBalance, burnRate, runway
      growthMetrics: { type: 'JSONB' }, // revenueGrowthRate, customerGrowthRate, arrGrowth
      efficiencyMetrics: { type: 'JSONB' }, // cacRatio, ltv, paybackPeriod
      financialRatios: { type: 'JSONB' }, // currentRatio, quickRatio, debtToEquity, roe, roa
      valuation: { type: 'JSONB' }, // preMoneyValuation, postMoneyValuation, enterpriseValue
      healthScore: { type: 'DECIMAL(5,2)' }, // Calculated 0-100 score
      currency: { type: 'TEXT', default: 'USD' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['metricId'] },
      { columns: ['companyId'] },
      { columns: ['reportingDate'] },
      { columns: ['companyId', 'reportingDate'] }
    ],
    constraints: [
      "CHECK (period IN ('monthly', 'quarterly', 'annual'))"
    ]
  },

  financial_reports: {
    description: 'Financial report data from financialReport.js',
    fields: {
      ReportID: { type: 'TEXT', notNull: true, unique: true },
      CompanyID: { type: 'TEXT', notNull: true },
      ReportType: { type: 'TEXT', notNull: true }, // enum: BalanceSheet, IncomeStatement, CashFlow
      PeriodStart: { type: 'DATE', notNull: true },
      PeriodEnd: { type: 'DATE', notNull: true },
      Revenue: { type: 'DECIMAL(15,2)', default: 0 },
      Expenses: { type: 'DECIMAL(15,2)', default: 0 },
      NetIncome: { type: 'DECIMAL(15,2)', default: 0 },
      Assets: { type: 'DECIMAL(15,2)', default: 0 },
      Liabilities: { type: 'DECIMAL(15,2)', default: 0 },
      Equity: { type: 'DECIMAL(15,2)', default: 0 },
      // Pre-save validation: All amounts >= 0, Assets = Liabilities + Equity
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['ReportID'] },
      { columns: ['CompanyID'] },
      { columns: ['ReportType'] },
      { columns: ['PeriodStart'] },
      { columns: ['PeriodEnd'] }
    ],
    constraints: [
      "CHECK (ReportType IN ('BalanceSheet', 'IncomeStatement', 'CashFlow'))",
      "CHECK (Revenue >= 0)",
      "CHECK (Expenses >= 0)",
      "CHECK (Assets >= 0)",
      "CHECK (Liabilities >= 0)",
      "CHECK (Equity >= 0)",
      "CHECK (PeriodEnd >= PeriodStart)"
    ]
  },

  tax_calculators: {
    description: 'Tax calculations from TaxCalculator.js',
    fields: {
      CalculationID: { type: 'TEXT', notNull: true, unique: true },
      CompanyID: { type: 'TEXT', notNull: true },
      TaxYear: { type: 'INTEGER', notNull: true },
      TaxScenario: { type: 'JSONB' }, // incomeAmount, deductions, credits, taxRate
      CalculatedTax: { type: 'DECIMAL(15,2)' },
      TaxImplications: { type: 'TEXT' }
    },
    indexes: [
      { columns: ['CalculationID'] },
      { columns: ['CompanyID'] },
      { columns: ['TaxYear'] }
    ]
  },

  investment_trackers: {
    description: 'Investment tracking from investmentTrackerModel.js',
    fields: {
      InvestmentID: { type: 'TEXT', notNull: true, unique: true },
      CompanyID: { type: 'TEXT', notNull: true },
      InvestorID: { type: 'TEXT', notNull: true },
      AmountInvested: { type: 'DECIMAL(15,2)', notNull: true },
      InvestmentDate: { type: 'DATE', notNull: true },
      CurrentValue: { type: 'DECIMAL(15,2)' }
    },
    indexes: [
      { columns: ['InvestmentID'] },
      { columns: ['CompanyID'] },
      { columns: ['InvestorID'] }
    ]
  },

  // =============================================================================
  // SPV (Special Purpose Vehicles)
  // =============================================================================

  spvs: {
    description: 'Special Purpose Vehicles from SPV.js',
    fields: {
      spvId: { type: 'TEXT', notNull: true, unique: true },
      companyId: { type: 'TEXT', notNull: true },
      name: { type: 'TEXT', notNull: true },
      legalName: { type: 'TEXT' },
      purpose: { type: 'TEXT' },
      jurisdiction: { type: 'TEXT' },
      incorporationDate: { type: 'DATE' },
      taxId: { type: 'TEXT' },
      status: { type: 'TEXT', default: 'active' }, // enum: active, inactive, dissolved
      managerId: { type: 'TEXT' },
      trusteeId: { type: 'TEXT' },
      totalAssetValue: { type: 'DECIMAL(15,2)', default: 0 },
      totalLiabilities: { type: 'DECIMAL(15,2)', default: 0 },
      currency: { type: 'TEXT', default: 'USD' },
      investors: { type: 'TEXT[]' },
      documents: { type: 'TEXT[]' },
      metadata: { type: 'JSONB' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['spvId'] },
      { columns: ['companyId'] },
      { columns: ['status'] }
    ],
    constraints: [
      "CHECK (status IN ('active', 'inactive', 'dissolved'))"
    ]
  },

  spv_assets: {
    description: 'SPV asset holdings from SPVAssetModel.js',
    fields: {
      AssetID: { type: 'TEXT', notNull: true, unique: true },
      SPVID: { type: 'TEXT', notNull: true },
      Type: { type: 'TEXT', notNull: true },
      Value: { type: 'DECIMAL(15,2)', notNull: true },
      Description: { type: 'TEXT' },
      AcquisitionDate: { type: 'DATE' }
    },
    indexes: [
      { columns: ['AssetID'] },
      { columns: ['SPVID'] }
    ]
  },

  spv_assets_v2: {
    description: 'Enhanced SPV assets from SPVasset.js (separate from SPVAssetModel)',
    fields: {
      AssetID: { type: 'TEXT', notNull: true, unique: true },
      SPVID: { type: 'TEXT', notNull: true },
      Type: { type: 'TEXT', notNull: true }, // enum: Real Estate, Financial Instrument
      Value: { type: 'DECIMAL(15,2)', notNull: true },
      Description: { type: 'TEXT' },
      AcquisitionDate: { type: 'DATE', notNull: true },
      // Instance methods: toApiResponse(), calculateCurrentValue()
      // Static methods: findBySPVID(), findByType(), findByFilters(), getTotalValueBySPVID()
      // Pre-save hook: Uppercase AssetID and SPVID
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['AssetID'] },
      { columns: ['SPVID'] },
      { columns: ['SPVID', 'Type'] }
    ],
    constraints: [
      "CHECK (Type IN ('Real Estate', 'Financial Instrument'))",
      "CHECK (Value >= 0)"
    ]
  },

  // =============================================================================
  // DOCUMENTS & EMBEDDINGS
  // =============================================================================

  documents: {
    description: 'Document metadata from Document.js',
    fields: {
      documentId: { type: 'TEXT', notNull: true, unique: true },
      companyId: { type: 'TEXT', notNull: true },
      uploadedBy: { type: 'TEXT', notNull: true },
      fileName: { type: 'TEXT', notNull: true },
      fileType: { type: 'TEXT', notNull: true },
      fileSize: { type: 'BIGINT', notNull: true },
      storageKey: { type: 'TEXT', notNull: true },
      url: { type: 'TEXT' },
      category: { type: 'TEXT', notNull: true }, // enum: cap_table, financial, legal, compliance, other
      subcategory: { type: 'TEXT' },
      description: { type: 'TEXT' },
      tags: { type: 'TEXT[]' },
      status: { type: 'TEXT', default: 'active' }, // enum: active, archived, deleted
      accessControl: { type: 'JSONB' }, // allowedUsers, allowedRoles
      version: { type: 'INTEGER', default: 1 },
      previousVersionId: { type: 'TEXT' },
      metadata: { type: 'JSONB' },
      uploadDate: { type: 'TIMESTAMP', default: 'NOW()' },
      lastAccessed: { type: 'TIMESTAMP' },
      expiryDate: { type: 'TIMESTAMP' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['documentId'] },
      { columns: ['companyId'] },
      { columns: ['uploadedBy'] },
      { columns: ['category'] },
      { columns: ['status'] }
    ],
    constraints: [
      "CHECK (category IN ('cap_table', 'financial', 'legal', 'compliance', 'other'))",
      "CHECK (status IN ('active', 'archived', 'deleted'))",
      "CHECK (fileSize > 0)",
      "CHECK (version > 0)"
    ]
  },

  documents_v2: {
    description: 'Alternative document model from documentModel.js (separate from documents table)',
    fields: {
      DocumentID: { type: 'TEXT', notNull: true, unique: true },
      FileName: { type: 'TEXT', notNull: true },
      FileType: { type: 'TEXT', notNull: true },
      UploadedBy: { type: 'TEXT', notNull: true },
      UploadDate: { type: 'TIMESTAMP', default: 'NOW()' },
      FileSize: { type: 'BIGINT' },
      AccessPermissions: { type: 'JSONB' }
    },
    indexes: [
      { columns: ['DocumentID'] },
      { columns: ['UploadedBy'] }
    ]
  },

  document_embeddings: {
    description: 'Vector embeddings for documents from DocumentEmbeddingModel.js',
    fields: {
      embeddingId: { type: 'TEXT', notNull: true, unique: true },
      documentId: { type: 'TEXT', notNull: true },
      chunkIndex: { type: 'INTEGER', notNull: true },
      content: { type: 'TEXT', notNull: true },
      embedding: { type: 'FLOAT[]', notNull: true }, // Vector embedding array
      model: { type: 'TEXT' },
      metadata: { type: 'JSONB' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['embeddingId'] },
      { columns: ['documentId'] },
      { columns: ['documentId', 'chunkIndex'] }
    ]
  },

  document_access: {
    description: 'Document access tracking from DocumentAccessModel.js',
    fields: {
      AccessID: { type: 'TEXT', notNull: true, unique: true },
      DocumentID: { type: 'TEXT', notNull: true },
      UserID: { type: 'TEXT', notNull: true },
      AccessLevel: { type: 'TEXT', notNull: true }, // enum: Read, Write, Admin
      AccessDate: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['AccessID'] },
      { columns: ['DocumentID'] },
      { columns: ['UserID'] },
      { columns: ['DocumentID', 'UserID'] }
    ],
    constraints: [
      "CHECK (AccessLevel IN ('Read', 'Write', 'Admin'))"
    ]
  },

  // =============================================================================
  // FUNDRAISING & ROUNDS
  // =============================================================================

  fundraising_rounds: {
    description: 'Fundraising rounds from FundraisingRoundModel.js',
    fields: {
      RoundID: { type: 'TEXT', notNull: true, unique: true },
      CompanyID: { type: 'TEXT', notNull: true },
      RoundName: { type: 'TEXT', notNull: true },
      TargetAmount: { type: 'DECIMAL(15,2)', notNull: true },
      AmountRaised: { type: 'DECIMAL(15,2)', default: 0 },
      StartDate: { type: 'DATE', notNull: true },
      EndDate: { type: 'DATE' },
      Investors: { type: 'TEXT[]' }
    },
    indexes: [
      { columns: ['RoundID'] },
      { columns: ['CompanyID'] }
    ],
    constraints: [
      "CHECK (TargetAmount > 0)",
      "CHECK (AmountRaised >= 0)"
    ]
  },

  // =============================================================================
  // COMPLIANCE & SECURITY
  // =============================================================================

  compliance_checks: {
    description: 'Compliance monitoring from ComplianceCheck.js',
    fields: {
      checkId: { type: 'TEXT', notNull: true, unique: true },
      companyId: { type: 'TEXT', notNull: true },
      checkType: { type: 'TEXT', notNull: true }, // enum: kyc, aml, accreditation, regulatory, tax, other
      entityType: { type: 'TEXT', notNull: true }, // enum: company, stakeholder, investor, document, transaction
      entityId: { type: 'TEXT', notNull: true },
      status: { type: 'TEXT', default: 'pending' }, // enum: pending, in_progress, passed, failed, requires_review
      priority: { type: 'TEXT', default: 'medium' }, // enum: low, medium, high, critical
      assignedTo: { type: 'TEXT' },
      reviewedBy: { type: 'TEXT' },
      findings: { type: 'TEXT' },
      evidence: { type: 'TEXT[]' },
      remediation: { type: 'TEXT' },
      dueDate: { type: 'DATE' },
      completedDate: { type: 'DATE' },
      metadata: { type: 'JSONB' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
      updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['checkId'] },
      { columns: ['companyId'] },
      { columns: ['entityType', 'entityId'] },
      { columns: ['status'] },
      { columns: ['checkType'] }
    ],
    constraints: [
      "CHECK (checkType IN ('kyc', 'aml', 'accreditation', 'regulatory', 'tax', 'other'))",
      "CHECK (entityType IN ('company', 'stakeholder', 'investor', 'document', 'transaction'))",
      "CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'requires_review'))",
      "CHECK (priority IN ('low', 'medium', 'high', 'critical'))"
    ]
  },

  security_audits: {
    description: 'Security audit logs from SecurityAudit.js',
    fields: {
      auditId: { type: 'TEXT', notNull: true, unique: true },
      userId: { type: 'TEXT' },
      userName: { type: 'TEXT' },
      eventType: { type: 'TEXT', notNull: true }, // enum: login, logout, access, modify, delete, export, permission_change, failed_attempt
      resource: { type: 'TEXT', notNull: true },
      resourceId: { type: 'TEXT' },
      action: { type: 'TEXT', notNull: true },
      ipAddress: { type: 'TEXT' },
      userAgent: { type: 'TEXT' },
      location: { type: 'JSONB' }, // city, country, coordinates
      status: { type: 'TEXT', notNull: true }, // enum: success, failure, blocked, suspicious
      riskScore: { type: 'INTEGER', default: 0 },
      details: { type: 'JSONB' },
      timestamp: { type: 'TIMESTAMP', default: 'NOW()' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['auditId'] },
      { columns: ['userId'] },
      { columns: ['eventType'] },
      { columns: ['status'] },
      { columns: ['timestamp'] }
    ],
    constraints: [
      "CHECK (eventType IN ('login', 'logout', 'access', 'modify', 'delete', 'export', 'permission_change', 'failed_attempt'))",
      "CHECK (status IN ('success', 'failure', 'blocked', 'suspicious'))",
      "CHECK (riskScore >= 0 AND riskScore <= 100)"
    ]
  },

  // =============================================================================
  // COMMUNICATION & NOTIFICATIONS
  // =============================================================================

  communications: {
    description: 'Communication logs from Communication.js',
    fields: {
      communicationId: { type: 'TEXT', notNull: true, unique: true },
      companyId: { type: 'TEXT' },
      fromUserId: { type: 'TEXT' },
      toUserIds: { type: 'TEXT[]' },
      type: { type: 'TEXT', notNull: true }, // enum: email, sms, notification, announcement
      subject: { type: 'TEXT' },
      body: { type: 'TEXT' },
      status: { type: 'TEXT', default: 'draft' }, // enum: draft, sent, delivered, failed, read
      priority: { type: 'TEXT', default: 'normal' }, // enum: low, normal, high, urgent
      metadata: { type: 'JSONB' },
      sentAt: { type: 'TIMESTAMP' },
      deliveredAt: { type: 'TIMESTAMP' },
      readAt: { type: 'TIMESTAMP' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['communicationId'] },
      { columns: ['companyId'] },
      { columns: ['fromUserId'] },
      { columns: ['type'] },
      { columns: ['status'] }
    ],
    constraints: [
      "CHECK (type IN ('email', 'sms', 'notification', 'announcement'))",
      "CHECK (status IN ('draft', 'sent', 'delivered', 'failed', 'read'))",
      "CHECK (priority IN ('low', 'normal', 'high', 'urgent'))"
    ]
  },

  notifications: {
    description: 'System notifications from Notification.js',
    fields: {
      notificationId: { type: 'TEXT', notNull: true, unique: true },
      userId: { type: 'TEXT', notNull: true },
      type: { type: 'TEXT', notNull: true }, // enum: info, warning, error, success
      title: { type: 'TEXT', notNull: true },
      message: { type: 'TEXT', notNull: true },
      link: { type: 'TEXT' },
      read: { type: 'BOOLEAN', default: false },
      readAt: { type: 'TIMESTAMP' },
      metadata: { type: 'JSONB' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['notificationId'] },
      { columns: ['userId'] },
      { columns: ['read'] },
      { columns: ['userId', 'read'] }
    ],
    constraints: [
      "CHECK (type IN ('info', 'warning', 'error', 'success'))"
    ]
  },

  // =============================================================================
  // INVITATIONS & ACCESS MANAGEMENT
  // =============================================================================

  invite_management: {
    description: 'Invitation management from inviteManagementModel.js and invitemanagement.js (consolidated duplicate)',
    fields: {
      InviteID: { type: 'TEXT', notNull: true, unique: true },
      ReceiverID: { type: 'TEXT', notNull: true },
      Status: { type: 'TEXT', default: 'Pending' }, // enum: Pending, Accepted, Declined
      Timestamp: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['InviteID'] },
      { columns: ['ReceiverID'] },
      { columns: ['Status'] }
    ],
    constraints: [
      "CHECK (Status IN ('Pending', 'Accepted', 'Declined'))"
    ]
  },

  // =============================================================================
  // ACTIVITIES & AUDIT TRAIL
  // =============================================================================

  activities: {
    description: 'Activity tracking from Activity.js',
    fields: {
      activityId: { type: 'TEXT', notNull: true, unique: true },
      userId: { type: 'TEXT' },
      companyId: { type: 'TEXT' },
      type: { type: 'TEXT', notNull: true },
      description: { type: 'TEXT', notNull: true },
      metadata: { type: 'JSONB' },
      timestamp: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['activityId'] },
      { columns: ['userId'] },
      { columns: ['companyId'] },
      { columns: ['timestamp'] }
    ]
  },

  // =============================================================================
  // DATABASE MIGRATIONS
  // =============================================================================

  migrations: {
    description: 'Database migration tracking from Migration.js',
    fields: {
      migrationId: { type: 'TEXT', notNull: true, unique: true },
      version: { type: 'TEXT', notNull: true, unique: true },
      name: { type: 'TEXT', notNull: true },
      description: { type: 'TEXT' },
      applied: { type: 'BOOLEAN', default: false },
      appliedAt: { type: 'TIMESTAMP' },
      rollbackScript: { type: 'TEXT' },
      metadata: { type: 'JSONB' },
      createdAt: { type: 'TIMESTAMP', default: 'NOW()' }
    },
    indexes: [
      { columns: ['migrationId'] },
      { columns: ['version'] },
      { columns: ['applied'] }
    ]
  },

  // =============================================================================
  // INTEGRATIONS
  // =============================================================================

  integrations: {
    description: 'Third-party integrations from integrationModel.js',
    fields: {
      IntegrationID: { type: 'TEXT', notNull: true, unique: true },
      CompanyID: { type: 'TEXT', notNull: true },
      IntegrationName: { type: 'TEXT', notNull: true },
      APIKey: { type: 'TEXT' },
      Endpoint: { type: 'TEXT' },
      Status: { type: 'TEXT', default: 'Active' }, // enum: Active, Inactive
      LastSynced: { type: 'TIMESTAMP' }
    },
    indexes: [
      { columns: ['IntegrationID'] },
      { columns: ['CompanyID'] },
      { columns: ['Status'] }
    ],
    constraints: [
      "CHECK (Status IN ('Active', 'Inactive'))"
    ]
  }
};

// Table creation order (respecting dependencies)
const TABLE_ORDER = [
  // Users first (no dependencies)
  'users',
  'user_models',
  'admins',

  // Companies (no dependencies)
  'companies',

  // Company-dependent entities
  'stakeholders',
  'investors',
  'share_classes',
  'equity_plans',
  'employees',

  // Transactions & Finance
  'transactions',
  'balance_sheets',
  'cash_flow_statements',
  'financial_metrics',
  'financial_reports',
  'tax_calculators',
  'investment_trackers',

  // SPV
  'spvs',
  'spv_assets',
  'spv_assets_v2',

  // Documents
  'documents',
  'documents_v2',
  'document_embeddings',
  'document_access',

  // Fundraising
  'fundraising_rounds',

  // Compliance
  'compliance_checks',
  'security_audits',

  // Communication
  'communications',
  'notifications',

  // Access management
  'invite_management',

  // Activities
  'activities',

  // System
  'migrations',
  'integrations'
];

/**
 * Build SQL CREATE TABLE statement
 */
function buildCreateTableSQL(tableName, schema) {
  const fields = [];

  for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
    let fieldSQL = `${fieldName} ${fieldDef.type}`;

    if (fieldDef.notNull) {
      fieldSQL += ' NOT NULL';
    }

    if (fieldDef.unique) {
      fieldSQL += ' UNIQUE';
    }

    if (fieldDef.default !== undefined) {
      if (fieldDef.default === 'NOW()' || fieldDef.default === '{}') {
        fieldSQL += ` DEFAULT ${fieldDef.default}`;
      } else if (typeof fieldDef.default === 'string') {
        fieldSQL += ` DEFAULT '${fieldDef.default}'`;
      } else if (typeof fieldDef.default === 'boolean') {
        fieldSQL += ` DEFAULT ${fieldDef.default}`;
      } else {
        fieldSQL += ` DEFAULT ${fieldDef.default}`;
      }
    }

    fields.push(fieldSQL);
  }

  // Add constraints
  if (schema.constraints) {
    fields.push(...schema.constraints);
  }

  const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${fields.join(',\n  ')}\n);`;
  return createTableSQL;
}

/**
 * Build SQL CREATE INDEX statements