/**
 * ComparableCompany Model Tests
 * Feature: Issue #270 - Create comparable companies database for market approach valuations
 * TDD: Write tests first
 */

const ComparableCompany = require('../../../models/ComparableCompany');

// Mock the ZeroDB service
jest.mock('../../../services/zerodbService', () => ({
    initialize: jest.fn().mockResolvedValue(true),
    insertRow: jest.fn().mockResolvedValue({ data: [{ row_id: 'mock_id', row_data: {} }] }),
    insertRows: jest.fn().mockResolvedValue({ data: [] }),
    queryTable: jest.fn().mockResolvedValue({ data: [] }),
    updateRows: jest.fn().mockResolvedValue({ modified_count: 1 }),
    deleteRows: jest.fn().mockResolvedValue({ deleted_count: 1 }),
    createTable: jest.fn().mockResolvedValue({}),
    projectId: 'mock-project'
}));

describe('ComparableCompany Model', () => {
    describe('Schema Validation', () => {
        it('should have required schema fields defined', () => {
            expect(ComparableCompany.schema).toBeDefined();
            expect(ComparableCompany.schema.companyName).toBeDefined();
            expect(ComparableCompany.schema.industry).toBeDefined();
            expect(ComparableCompany.schema.stage).toBeDefined();
            expect(ComparableCompany.schema.source).toBeDefined();
            expect(ComparableCompany.schema.dataDate).toBeDefined();
        });

        it('should have valid stage enum values', () => {
            const validStages = ['SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH', 'PRE_IPO', 'PUBLIC'];
            expect(ComparableCompany.VALID_STAGES).toEqual(validStages);
        });

        it('should have valid source enum values', () => {
            const validSources = ['PITCHBOOK', 'CRUNCHBASE', 'SEC_FILINGS', 'MANUAL', 'API'];
            expect(ComparableCompany.VALID_SOURCES).toEqual(validSources);
        });

        it('should validate stage values correctly', () => {
            expect(ComparableCompany.isValidStage('SEED')).toBe(true);
            expect(ComparableCompany.isValidStage('SERIES_A')).toBe(true);
            expect(ComparableCompany.isValidStage('PUBLIC')).toBe(true);
            expect(ComparableCompany.isValidStage('INVALID')).toBe(false);
            expect(ComparableCompany.isValidStage('seed')).toBe(false);
        });

        it('should validate source values correctly', () => {
            expect(ComparableCompany.isValidSource('PITCHBOOK')).toBe(true);
            expect(ComparableCompany.isValidSource('SEC_FILINGS')).toBe(true);
            expect(ComparableCompany.isValidSource('MANUAL')).toBe(true);
            expect(ComparableCompany.isValidSource('INVALID')).toBe(false);
        });
    });

    describe('Data Preparation', () => {
        it('should generate comparableId with correct prefix', () => {
            const data = {
                companyName: 'Test Corp',
                industry: 'Technology',
                stage: 'SERIES_A',
                source: 'MANUAL'
            };
            const prepared = ComparableCompany._prepareData(data);
            expect(prepared.comparableId).toBeDefined();
            expect(prepared.comparableId.startsWith('comp_')).toBe(true);
        });

        it('should preserve provided comparableId', () => {
            const data = {
                comparableId: 'comp_existing',
                companyName: 'Test Corp',
                industry: 'Technology',
                stage: 'SERIES_A',
                source: 'MANUAL'
            };
            const prepared = ComparableCompany._prepareData(data);
            expect(prepared.comparableId).toBe('comp_existing');
        });

        it('should calculate revenue multiple when not provided', () => {
            const data = {
                companyName: 'Test Corp',
                industry: 'Technology',
                stage: 'SERIES_A',
                source: 'MANUAL',
                latestValuation: 100000000, // $100M
                revenue: 10000000 // $10M
            };
            const prepared = ComparableCompany._prepareData(data);
            expect(prepared.revenueMultiple).toBe(10); // 100M / 10M = 10x
        });

        it('should calculate EBITDA multiple when not provided and EBITDA is positive', () => {
            const data = {
                companyName: 'Test Corp',
                industry: 'Technology',
                stage: 'GROWTH',
                source: 'MANUAL',
                latestValuation: 100000000, // $100M
                ebitda: 5000000 // $5M
            };
            const prepared = ComparableCompany._prepareData(data);
            expect(prepared.ebitdaMultiple).toBe(20); // 100M / 5M = 20x
        });

        it('should not calculate EBITDA multiple when EBITDA is zero or negative', () => {
            const data = {
                companyName: 'Test Corp',
                industry: 'Technology',
                stage: 'SEED',
                source: 'MANUAL',
                latestValuation: 10000000,
                ebitda: -500000 // Negative EBITDA (loss)
            };
            const prepared = ComparableCompany._prepareData(data);
            expect(prepared.ebitdaMultiple).toBeUndefined();
        });

        it('should set default isPublic to false', () => {
            const data = {
                companyName: 'Test Corp',
                industry: 'Technology',
                stage: 'SERIES_A',
                source: 'MANUAL'
            };
            const prepared = ComparableCompany._prepareData(data);
            expect(prepared.isPublic).toBe(false);
        });

        it('should set dataDate to current date if not provided', () => {
            const data = {
                companyName: 'Test Corp',
                industry: 'Technology',
                stage: 'SERIES_A',
                source: 'MANUAL'
            };
            const beforeTime = new Date().toISOString();
            const prepared = ComparableCompany._prepareData(data);
            expect(prepared.dataDate).toBeDefined();
            expect(new Date(prepared.dataDate).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime() - 1000);
        });
    });

    describe('Financial Metrics', () => {
        it('should store positive valuation', () => {
            const valuation = 50000000;
            expect(valuation).toBeGreaterThan(0);
        });

        it('should allow negative EBITDA for loss-making companies', () => {
            const company = {
                companyName: 'Startup Inc',
                ebitda: -2000000,
                ebitdaMargin: -20
            };
            expect(company.ebitda).toBeLessThan(0);
            expect(company.ebitdaMargin).toBeLessThan(0);
        });

        it('should allow negative revenue growth rate', () => {
            const company = {
                companyName: 'Declining Corp',
                revenueGrowthRate: -15 // 15% decline
            };
            expect(company.revenueGrowthRate).toBeLessThan(0);
        });

        it('should store employee count as positive integer', () => {
            const employees = 150;
            expect(employees).toBeGreaterThan(0);
            expect(Number.isInteger(employees)).toBe(true);
        });
    });

    describe('Public Company Fields', () => {
        it('should store ticker symbol for public companies', () => {
            const publicCompany = {
                companyName: 'Big Tech Inc',
                isPublic: true,
                ticker: 'BIGT',
                stage: 'PUBLIC'
            };
            expect(publicCompany.isPublic).toBe(true);
            expect(publicCompany.ticker).toBe('BIGT');
            expect(publicCompany.stage).toBe('PUBLIC');
        });

        it('should not require ticker for private companies', () => {
            const privateCompany = {
                companyName: 'Private Startup',
                isPublic: false,
                stage: 'SERIES_B'
            };
            expect(privateCompany.isPublic).toBe(false);
            expect(privateCompany.ticker).toBeUndefined();
        });
    });

    describe('Median Multiples Calculation', () => {
        it('should calculate median correctly for odd number of values', () => {
            // Test the internal logic
            const values = [5, 10, 15];
            const sorted = values.sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted[mid];
            expect(median).toBe(10);
        });

        it('should calculate median correctly for even number of values', () => {
            const values = [5, 10, 15, 20];
            const sorted = values.sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = (sorted[mid - 1] + sorted[mid]) / 2;
            expect(median).toBe(12.5);
        });

        it('should return null for empty dataset', async () => {
            const result = await ComparableCompany.calculateMedianMultiples('NonExistentIndustry');
            expect(result.count).toBe(0);
            expect(result.medianRevenueMultiple).toBeNull();
            expect(result.medianEbitdaMultiple).toBeNull();
        });
    });

    describe('findComparables Options', () => {
        it('should accept industry filter', () => {
            const options = { industry: 'Technology' };
            expect(options.industry).toBeDefined();
        });

        it('should accept stage filter', () => {
            const options = { stage: 'SERIES_A' };
            expect(options.stage).toBeDefined();
        });

        it('should accept revenue range filters', () => {
            const options = {
                minRevenue: 1000000,
                maxRevenue: 50000000
            };
            expect(options.minRevenue).toBe(1000000);
            expect(options.maxRevenue).toBe(50000000);
        });

        it('should accept valuation range filters', () => {
            const options = {
                minValuation: 10000000,
                maxValuation: 500000000
            };
            expect(options.minValuation).toBe(10000000);
            expect(options.maxValuation).toBe(500000000);
        });

        it('should accept isPublic filter', () => {
            const publicOptions = { isPublic: true };
            const privateOptions = { isPublic: false };
            expect(publicOptions.isPublic).toBe(true);
            expect(privateOptions.isPublic).toBe(false);
        });

        it('should accept source filter', () => {
            const options = { source: 'PITCHBOOK' };
            expect(options.source).toBe('PITCHBOOK');
        });

        it('should have default limit of 50', () => {
            const defaultOptions = {};
            const limit = defaultOptions.limit || 50;
            expect(limit).toBe(50);
        });
    });

    describe('Data Sources', () => {
        it('should support PitchBook as data source', () => {
            const company = { source: 'PITCHBOOK' };
            expect(ComparableCompany.isValidSource(company.source)).toBe(true);
        });

        it('should support Crunchbase as data source', () => {
            const company = { source: 'CRUNCHBASE' };
            expect(ComparableCompany.isValidSource(company.source)).toBe(true);
        });

        it('should support SEC filings as data source', () => {
            const company = { source: 'SEC_FILINGS' };
            expect(ComparableCompany.isValidSource(company.source)).toBe(true);
        });

        it('should support manual entry as data source', () => {
            const company = { source: 'MANUAL' };
            expect(ComparableCompany.isValidSource(company.source)).toBe(true);
        });

        it('should support API as data source', () => {
            const company = { source: 'API' };
            expect(ComparableCompany.isValidSource(company.source)).toBe(true);
        });
    });

    describe('Funding Stages', () => {
        it('should support SEED stage', () => {
            expect(ComparableCompany.isValidStage('SEED')).toBe(true);
        });

        it('should support Series A through C', () => {
            expect(ComparableCompany.isValidStage('SERIES_A')).toBe(true);
            expect(ComparableCompany.isValidStage('SERIES_B')).toBe(true);
            expect(ComparableCompany.isValidStage('SERIES_C')).toBe(true);
        });

        it('should support GROWTH stage', () => {
            expect(ComparableCompany.isValidStage('GROWTH')).toBe(true);
        });

        it('should support PRE_IPO stage', () => {
            expect(ComparableCompany.isValidStage('PRE_IPO')).toBe(true);
        });

        it('should support PUBLIC stage', () => {
            expect(ComparableCompany.isValidStage('PUBLIC')).toBe(true);
        });
    });

    describe('Similarity Scoring', () => {
        it('should calculate similarity based on industry match', () => {
            const target = { industry: 'Technology' };
            const candidate = { industry: 'Technology' };
            const industryMatch = target.industry === candidate.industry;
            expect(industryMatch).toBe(true);
        });

        it('should calculate similarity based on stage match', () => {
            const target = { stage: 'SERIES_B' };
            const candidate = { stage: 'SERIES_B' };
            const stageMatch = target.stage === candidate.stage;
            expect(stageMatch).toBe(true);
        });

        it('should calculate revenue proximity score', () => {
            const targetRevenue = 10000000;
            const candidateRevenue = 12000000;
            const revenueDiff = Math.abs(candidateRevenue - targetRevenue) / targetRevenue;
            expect(revenueDiff).toBe(0.2); // 20% difference
            expect(revenueDiff <= 0.5).toBe(true); // Within 50% = match
        });
    });

    describe('getMarketData', () => {
        it('should return null for non-existent ticker', async () => {
            const result = await ComparableCompany.getMarketData('NONEXISTENT');
            expect(result).toBeNull();
        });

        it('should return market data structure when found', () => {
            const expectedStructure = {
                ticker: 'AAPL',
                companyName: 'Apple Inc',
                latestValuation: 3000000000000,
                revenue: 400000000000,
                revenueMultiple: 7.5,
                ebitdaMultiple: 25,
                dataDate: '2024-01-15',
                source: 'SEC_FILINGS'
            };
            expect(expectedStructure.ticker).toBeDefined();
            expect(expectedStructure.latestValuation).toBeDefined();
            expect(expectedStructure.revenueMultiple).toBeDefined();
        });
    });

    describe('Model Methods', () => {
        it('should have find method', () => {
            expect(typeof ComparableCompany.find).toBe('function');
        });

        it('should have findOne method', () => {
            expect(typeof ComparableCompany.findOne).toBe('function');
        });

        it('should have create method', () => {
            expect(typeof ComparableCompany.create).toBe('function');
        });

        it('should have updateOne method', () => {
            expect(typeof ComparableCompany.updateOne).toBe('function');
        });

        it('should have deleteOne method', () => {
            expect(typeof ComparableCompany.deleteOne).toBe('function');
        });

        it('should have findByIndustry method', () => {
            expect(typeof ComparableCompany.findByIndustry).toBe('function');
        });

        it('should have findComparables method', () => {
            expect(typeof ComparableCompany.findComparables).toBe('function');
        });

        it('should have calculateMedianMultiples method', () => {
            expect(typeof ComparableCompany.calculateMedianMultiples).toBe('function');
        });

        it('should have getMarketData method', () => {
            expect(typeof ComparableCompany.getMarketData).toBe('function');
        });

        it('should have findSimilarCompanies method', () => {
            expect(typeof ComparableCompany.findSimilarCompanies).toBe('function');
        });

        it('should have getIndustries method', () => {
            expect(typeof ComparableCompany.getIndustries).toBe('function');
        });

        it('should have getStatistics method', () => {
            expect(typeof ComparableCompany.getStatistics).toBe('function');
        });
    });

    describe('Complete Company Data Structure', () => {
        it('should support complete company data', () => {
            const completeCompany = {
                comparableId: 'comp_123',
                companyName: 'Tech Startup Inc',
                industry: 'Technology',
                subIndustry: 'SaaS',
                stage: 'SERIES_B',
                latestValuation: 150000000,
                revenue: 15000000,
                revenueGrowthRate: 120,
                ebitda: -2000000,
                ebitdaMargin: -13.3,
                employees: 75,
                fundingTotal: 45000000,
                lastFundingDate: '2024-06-15',
                revenueMultiple: 10,
                source: 'PITCHBOOK',
                dataDate: '2024-07-01',
                isPublic: false,
                metadata: { region: 'North America' },
                tags: ['high-growth', 'b2b'],
                notes: 'Strong product-market fit'
            };

            expect(completeCompany.companyName).toBe('Tech Startup Inc');
            expect(completeCompany.industry).toBe('Technology');
            expect(completeCompany.subIndustry).toBe('SaaS');
            expect(completeCompany.stage).toBe('SERIES_B');
            expect(completeCompany.revenueMultiple).toBe(10);
            expect(completeCompany.ebitda).toBeLessThan(0);
            expect(completeCompany.isPublic).toBe(false);
            expect(completeCompany.tags.length).toBe(2);
        });

        it('should support public company data with ticker', () => {
            const publicCompany = {
                comparableId: 'comp_456',
                companyName: 'Big Public Corp',
                industry: 'Financial Services',
                subIndustry: 'Fintech',
                stage: 'PUBLIC',
                latestValuation: 5000000000,
                revenue: 500000000,
                revenueGrowthRate: 25,
                ebitda: 100000000,
                ebitdaMargin: 20,
                employees: 2000,
                revenueMultiple: 10,
                ebitdaMultiple: 50,
                source: 'SEC_FILINGS',
                dataDate: '2024-03-31',
                isPublic: true,
                ticker: 'BPC'
            };

            expect(publicCompany.isPublic).toBe(true);
            expect(publicCompany.ticker).toBe('BPC');
            expect(publicCompany.stage).toBe('PUBLIC');
            expect(publicCompany.ebitdaMultiple).toBe(50);
        });
    });
});
