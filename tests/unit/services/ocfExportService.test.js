'use strict';

/**
 * OCF Export Service — Unit Tests
 * Issue #637: OCF export adapter for Open Cap Table Format
 */

// Mock all model dependencies before requiring the service
jest.mock('../../../models/Company');
jest.mock('../../../models/Stakeholder');
jest.mock('../../../models/ShareClass');
jest.mock('../../../models/EquityGrant');
jest.mock('../../../models/SAFE');
jest.mock('../../../models/Valuation409A');

const Company = require('../../../models/Company');
const Stakeholder = require('../../../models/Stakeholder');
const ShareClass = require('../../../models/ShareClass');
const EquityGrant = require('../../../models/EquityGrant');
const SAFE = require('../../../models/SAFE');
const Valuation409A = require('../../../models/Valuation409A');

const {
  exportToOCF,
  mapIssuer,
  mapStakeholder,
  mapShareClass,
  mapEquityGrant,
  mapSAFE,
  mapValuation,
} = require('../../../services/ocfExportService');

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------
const COMPANY_ID = 'company_test-123';

const mockCompany = {
  companyId: COMPANY_ID,
  CompanyName: 'Acme Corp',
  CompanyType: 'startup',
  RegisteredAddress: '123 Main St, Wilmington, DE 19801',
  TaxID: '12-3456789',
  corporationDate: '2020-01-15T00:00:00.000Z',
  entityType: 'DELAWARE_C_CORP',
  stateOfIncorporation: 'DE',
  ein: '12-3456789',
  authorizedShares: 10000000,
};

const mockStakeholders = [
  {
    stakeholderId: 'stakeholder_001',
    companyId: COMPANY_ID,
    name: 'Jane Founder',
    email: 'jane@acme.com',
    role: 'founder',
    type: 'common',
    status: 'active',
    totalGrantedShares: 5000000,
    totalVestedShares: 5000000,
    address: { street: '1 Elm St', city: 'SF', state: 'CA', zipCode: '94105', country: 'USA' },
  },
  {
    stakeholderId: 'stakeholder_002',
    companyId: COMPANY_ID,
    name: 'VC Partners LLC',
    email: 'fund@vcpartners.com',
    role: 'investor',
    type: 'preferred',
    status: 'active',
    totalGrantedShares: 1000000,
    totalVestedShares: 1000000,
    accreditedInvestor: true,
  },
];

const mockShareClasses = [
  {
    shareClassId: 'sc_common',
    companyId: COMPANY_ID,
    name: 'Common Stock',
    classType: 'common',
    authorizedShares: 8000000,
    outstandingShares: 5000000,
    issuedShares: 5000000,
    dilutedShares: 6000000,
    parValue: 0.0001,
    pricePerShare: 1.0,
    votesPerShare: 1,
    votingRights: true,
    liquidationPreference: 0,
    amountRaised: 0,
    ownershipPercentage: 60,
  },
  {
    shareClassId: 'sc_series_a',
    companyId: COMPANY_ID,
    name: 'Series A Preferred',
    classType: 'preferred',
    authorizedShares: 2000000,
    outstandingShares: 1000000,
    issuedShares: 1000000,
    dilutedShares: 1500000,
    parValue: 0.0001,
    pricePerShare: 2.5,
    votesPerShare: 1,
    votingRights: true,
    liquidationPreference: 1,
    participatingPreferred: true,
    conversionRatio: 1,
    amountRaised: 2500000,
    ownershipPercentage: 20,
    seniorityRank: 1,
  },
];

const mockEquityGrants = [
  {
    grantId: 'grant_001',
    companyId: COMPANY_ID,
    employeeId: 'stakeholder_001',
    grantType: 'ISO',
    numberOfShares: 100000,
    strikePrice: 1.0,
    grantDate: '2021-06-01T00:00:00.000Z',
    expirationDate: '2031-06-01T00:00:00.000Z',
    status: 'active',
    exercisedShares: 25000,
    vestingSchedule: {
      vestingStartDate: '2021-06-01',
      vestingPeriodMonths: 48,
      cliffMonths: 12,
      vestingFrequency: 'monthly',
    },
    equityPlanId: 'plan_001',
    fmvAtGrant: 1.0,
  },
];

const mockSAFEs = [
  {
    safeId: 'safe_001',
    companyId: COMPANY_ID,
    investorId: 'stakeholder_002',
    investorName: 'VC Partners LLC',
    investmentAmount: 500000,
    currency: 'USD',
    safeType: 'post-money',
    valuationCap: 10000000,
    discountRate: 0,
    status: 'funded',
    fundedAt: '2021-03-15T00:00:00.000Z',
    proRataRights: true,
  },
];

const mockValuations = [
  {
    valuationId: 'val_001',
    companyId: COMPANY_ID,
    fairMarketValue: 2.5,
    valuationMethod: 'income',
    effectiveDate: '2024-01-15T00:00:00.000Z',
    expirationDate: '2025-01-15T00:00:00.000Z',
    status: 'approved',
    reason: 'annual_valuation',
    valuationFirm: { name: 'ValuCo', contactName: 'John Appraiser' },
    boardApproval: { approved: true, approvedAt: '2024-02-01T00:00:00.000Z' },
  },
];

// ---------------------------------------------------------------------------
// Setup mocks
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();

  Company.findByCompanyId = jest.fn().mockResolvedValue(mockCompany);
  Stakeholder.findByCompany = jest.fn().mockResolvedValue(mockStakeholders);
  ShareClass.findByCompany = jest.fn().mockResolvedValue(mockShareClasses);
  EquityGrant.findByCompany = jest.fn().mockResolvedValue(mockEquityGrants);
  SAFE.findByCompany = jest.fn().mockResolvedValue(mockSAFEs);
  Valuation409A.findByCompany = jest.fn().mockResolvedValue(mockValuations);
});

// ---------------------------------------------------------------------------
// Individual Mapper Tests
// ---------------------------------------------------------------------------
describe('mapIssuer', () => {
  it('maps a Company record to an OCF Issuer object', () => {
    const issuer = mapIssuer(mockCompany);

    expect(issuer.id).toBe(COMPANY_ID);
    expect(issuer.object_type).toBe('ISSUER');
    expect(issuer.legal_name).toBe('Acme Corp');
    expect(issuer.formation_date).toBe('2020-01-15T00:00:00.000Z');
    expect(issuer.country_of_formation).toBe('US');
    expect(issuer.state_of_formation).toBe('DE');
    expect(issuer.tax_ids).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tax_id: '12-3456789' }),
      ])
    );
  });

  it('handles missing optional fields gracefully', () => {
    const minimal = { companyId: 'c1', CompanyName: 'Min Co' };
    const issuer = mapIssuer(minimal);

    expect(issuer.id).toBe('c1');
    expect(issuer.legal_name).toBe('Min Co');
    expect(issuer.state_of_formation).toBeUndefined();
  });
});

describe('mapStakeholder', () => {
  it('maps a founder stakeholder as INDIVIDUAL', () => {
    const ocf = mapStakeholder(mockStakeholders[0]);

    expect(ocf.id).toBe('stakeholder_001');
    expect(ocf.object_type).toBe('STAKEHOLDER');
    expect(ocf.stakeholder_type).toBe('INDIVIDUAL');
    expect(ocf.name).toEqual(
      expect.objectContaining({ legal_name: 'Jane Founder' })
    );
    expect(ocf.contact_info).toEqual(
      expect.objectContaining({ email: 'jane@acme.com' })
    );
  });

  it('maps an investor stakeholder as INSTITUTION', () => {
    const ocf = mapStakeholder(mockStakeholders[1]);

    expect(ocf.stakeholder_type).toBe('INSTITUTION');
  });

  it('maps address when present', () => {
    const ocf = mapStakeholder(mockStakeholders[0]);
    expect(ocf.addresses).toBeDefined();
    expect(ocf.addresses.length).toBe(1);
    expect(ocf.addresses[0].city).toBe('SF');
  });
});

describe('mapShareClass', () => {
  it('maps a common share class to OCF StockClass', () => {
    const ocf = mapShareClass(mockShareClasses[0]);

    expect(ocf.id).toBe('sc_common');
    expect(ocf.object_type).toBe('STOCK_CLASS');
    expect(ocf.name).toBe('Common Stock');
    expect(ocf.class_type).toBe('COMMON');
    expect(ocf.shares_authorized).toBe(8000000);
    expect(ocf.shares_issued).toBe(5000000);
    expect(ocf.par_value).toEqual({ amount: '0.0001', currency: 'USD' });
    expect(ocf.price_per_share).toEqual({ amount: '1', currency: 'USD' });
    expect(ocf.votes_per_share).toBe(1);
  });

  it('maps a preferred share class with liquidation preferences', () => {
    const ocf = mapShareClass(mockShareClasses[1]);

    expect(ocf.class_type).toBe('PREFERRED');
    expect(ocf.liquidation_preference_multiple).toBe(1);
    expect(ocf.participation_cap_multiple).toBeUndefined();
    expect(ocf.seniority).toBe(1);
    expect(ocf.conversion_rights).toBeDefined();
    expect(ocf.conversion_rights[0].conversion_mechanism.type).toBe('RATIO_CONVERSION');
    expect(ocf.conversion_rights[0].conversion_mechanism.ratio.numerator).toBe(1);
  });
});

describe('mapEquityGrant', () => {
  it('maps an equity grant to an OCF StockIssuance transaction', () => {
    const ocf = mapEquityGrant(mockEquityGrants[0]);

    expect(ocf.id).toBe('grant_001');
    expect(ocf.object_type).toBe('TX_STOCK_ISSUANCE');
    expect(ocf.stakeholder_id).toBe('stakeholder_001');
    expect(ocf.quantity).toBe(100000);
    expect(ocf.share_price).toEqual({ amount: '1', currency: 'USD' });
    expect(ocf.security_id).toBe('grant_001');
    expect(ocf.date).toBe('2021-06-01');
    expect(ocf.stock_plan_id).toBe('plan_001');
    expect(ocf.custom_id).toBe('grant_001');
  });

  it('includes vesting schedule when present', () => {
    const ocf = mapEquityGrant(mockEquityGrants[0]);

    expect(ocf.vesting_conditions).toBeDefined();
    expect(ocf.vesting_conditions.length).toBeGreaterThan(0);
    expect(ocf.vesting_conditions[0].cliff_months).toBe(12);
    expect(ocf.vesting_conditions[0].vesting_period_months).toBe(48);
  });

  it('sets option_grant_type for ISO/NSO', () => {
    const ocf = mapEquityGrant(mockEquityGrants[0]);
    expect(ocf.option_grant_type).toBe('ISO');
  });
});

describe('mapSAFE', () => {
  it('maps a SAFE to an OCF ConvertibleIssuance transaction', () => {
    const ocf = mapSAFE(mockSAFEs[0]);

    expect(ocf.id).toBe('safe_001');
    expect(ocf.object_type).toBe('TX_CONVERTIBLE_ISSUANCE');
    expect(ocf.stakeholder_id).toBe('stakeholder_002');
    expect(ocf.investment_amount).toEqual({ amount: '500000', currency: 'USD' });
    expect(ocf.convertible_type).toBe('SAFE');
    expect(ocf.conversion_triggers).toBeDefined();
    expect(ocf.conversion_triggers.length).toBeGreaterThan(0);
  });

  it('includes valuation cap when present', () => {
    const ocf = mapSAFE(mockSAFEs[0]);
    const trigger = ocf.conversion_triggers[0];

    expect(trigger.conversion_valuation_cap).toEqual({
      amount: '10000000',
      currency: 'USD',
    });
  });

  it('includes pro rata rights flag', () => {
    const ocf = mapSAFE(mockSAFEs[0]);
    expect(ocf.pro_rata_rights).toBe(true);
  });
});

describe('mapValuation', () => {
  it('maps a 409A valuation to an OCF Valuation object', () => {
    const ocf = mapValuation(mockValuations[0]);

    expect(ocf.id).toBe('val_001');
    expect(ocf.object_type).toBe('VALUATION');
    expect(ocf.price_per_share).toEqual({ amount: '2.5', currency: 'USD' });
    expect(ocf.effective_date).toBe('2024-01-15');
    expect(ocf.valuation_type).toBe('409A');
    expect(ocf.provider).toBe('ValuCo');
    expect(ocf.board_approval_date).toBe('2024-02-01');
  });

  it('handles missing optional valuation fields', () => {
    const minimal = {
      valuationId: 'val_min',
      fairMarketValue: 1.0,
      effectiveDate: '2023-06-01T00:00:00.000Z',
    };
    const ocf = mapValuation(minimal);

    expect(ocf.id).toBe('val_min');
    expect(ocf.provider).toBeUndefined();
    expect(ocf.board_approval_date).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Full Export Tests
// ---------------------------------------------------------------------------
describe('exportToOCF', () => {
  it('returns a valid OCF package with all sections', async () => {
    const { ocfPackage, stats } = await exportToOCF(COMPANY_ID);

    // Package structure
    expect(ocfPackage.ocfVersion).toBe('1.0.0');
    expect(ocfPackage.generatedAt).toBeDefined();
    expect(ocfPackage.issuer).toBeDefined();
    expect(ocfPackage.issuer.object_type).toBe('ISSUER');
    expect(Array.isArray(ocfPackage.stakeholders)).toBe(true);
    expect(Array.isArray(ocfPackage.stockClasses)).toBe(true);
    expect(Array.isArray(ocfPackage.transactions)).toBe(true);
    expect(Array.isArray(ocfPackage.valuations)).toBe(true);

    // Counts
    expect(ocfPackage.stakeholders.length).toBe(2);
    expect(ocfPackage.stockClasses.length).toBe(2);
    // transactions = equity grants + SAFEs
    expect(ocfPackage.transactions.length).toBe(2);
    expect(ocfPackage.valuations.length).toBe(1);

    // Stats
    expect(stats.stakeholderCount).toBe(2);
    expect(stats.stockClassCount).toBe(2);
    expect(stats.transactionCount).toBe(2);
    expect(stats.valuationCount).toBe(1);
  });

  it('calls each model with the correct companyId', async () => {
    await exportToOCF(COMPANY_ID);

    expect(Company.findByCompanyId).toHaveBeenCalledWith(COMPANY_ID);
    expect(Stakeholder.findByCompany).toHaveBeenCalledWith(COMPANY_ID);
    expect(ShareClass.findByCompany).toHaveBeenCalledWith(COMPANY_ID);
    expect(EquityGrant.findByCompany).toHaveBeenCalledWith(COMPANY_ID);
    expect(SAFE.findByCompany).toHaveBeenCalledWith(COMPANY_ID);
    expect(Valuation409A.findByCompany).toHaveBeenCalledWith(COMPANY_ID);
  });

  it('throws when company is not found', async () => {
    Company.findByCompanyId.mockResolvedValue(null);

    await expect(exportToOCF(COMPANY_ID)).rejects.toThrow(
      /company.*not found/i
    );
  });

  it('returns empty arrays when no related records exist', async () => {
    Stakeholder.findByCompany.mockResolvedValue([]);
    ShareClass.findByCompany.mockResolvedValue([]);
    EquityGrant.findByCompany.mockResolvedValue([]);
    SAFE.findByCompany.mockResolvedValue([]);
    Valuation409A.findByCompany.mockResolvedValue([]);

    const { ocfPackage, stats } = await exportToOCF(COMPANY_ID);

    expect(ocfPackage.stakeholders).toEqual([]);
    expect(ocfPackage.stockClasses).toEqual([]);
    expect(ocfPackage.transactions).toEqual([]);
    expect(ocfPackage.valuations).toEqual([]);
    expect(stats.transactionCount).toBe(0);
  });
});
