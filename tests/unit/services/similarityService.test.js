/**
 * Similarity Service Test Suite
 *
 * [Feature] Issue #25: Implement stakeholder/company similarity search
 * Comprehensive test coverage for stakeholder and company similarity search
 * using vector embeddings for meaningful matching
 */

const similarityService = require('../../../services/similarityService');
const vectorService = require('../../../services/vectorService');
const zerodbService = require('../../../services/zerodbService');
const Stakeholder = require('../../../models/Stakeholder');
const Company = require('../../../models/Company');

// Mock external services
jest.mock('../../../services/vectorService');
jest.mock('../../../services/zerodbService');
jest.mock('../../../models/Stakeholder');
jest.mock('../../../models/Company');

describe('Similarity Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    vectorService.generateEmbedding = jest.fn().mockResolvedValue(new Array(768).fill(0.1));
    zerodbService.upsertVector = jest.fn().mockResolvedValue({ success: true });
    zerodbService.searchVectors = jest.fn().mockResolvedValue({
      vectors: [],
      search_time_ms: 10
    });
    zerodbService.listVectors = jest.fn().mockResolvedValue([]);
  });

  describe('Stakeholder Similarity', () => {
    describe('generateStakeholderEmbedding', () => {
      it('should generate embedding for a stakeholder profile', async () => {
        const stakeholder = {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001',
          equityHoldings: 15.5,
          investmentHistory: ['Series A', 'Series B'],
          industry: 'Technology'
        };

        const result = await similarityService.generateStakeholderEmbedding(stakeholder);

        expect(result).toBeDefined();
        expect(result.embedding).toBeInstanceOf(Array);
        expect(result.embedding.length).toBe(768);
        expect(result.stakeholderId).toBe('SH001');
      });

      it('should include role in embedding generation', async () => {
        const stakeholder = {
          stakeholderId: 'SH002',
          name: 'Jane Smith',
          role: 'Investor',
          projectId: 'PROJ002'
        };

        await similarityService.generateStakeholderEmbedding(stakeholder);

        expect(vectorService.generateEmbedding).toHaveBeenCalledWith(
          expect.stringContaining('Investor')
        );
      });

      it('should include equity holdings in embedding when present', async () => {
        const stakeholder = {
          stakeholderId: 'SH003',
          name: 'Bob Wilson',
          role: 'Board Member',
          projectId: 'PROJ003',
          equityHoldings: 8.2
        };

        await similarityService.generateStakeholderEmbedding(stakeholder);

        expect(vectorService.generateEmbedding).toHaveBeenCalledWith(
          expect.stringContaining('8.2')
        );
      });

      it('should include investment history in embedding when present', async () => {
        const stakeholder = {
          stakeholderId: 'SH004',
          name: 'Alice Brown',
          role: 'Angel Investor',
          projectId: 'PROJ004',
          investmentHistory: ['Seed Round', 'Series A']
        };

        await similarityService.generateStakeholderEmbedding(stakeholder);

        expect(vectorService.generateEmbedding).toHaveBeenCalledWith(
          expect.stringContaining('Seed Round')
        );
      });

      it('should include industry in embedding when present', async () => {
        const stakeholder = {
          stakeholderId: 'SH005',
          name: 'Charlie Davis',
          role: 'Advisor',
          projectId: 'PROJ005',
          industry: 'Healthcare'
        };

        await similarityService.generateStakeholderEmbedding(stakeholder);

        expect(vectorService.generateEmbedding).toHaveBeenCalledWith(
          expect.stringContaining('Healthcare')
        );
      });

      it('should throw error for invalid stakeholder data', async () => {
        const invalidStakeholder = null;

        await expect(similarityService.generateStakeholderEmbedding(invalidStakeholder))
          .rejects.toThrow('Invalid stakeholder data');
      });

      it('should throw error when stakeholder has no ID', async () => {
        const stakeholderWithoutId = {
          name: 'Test User',
          role: 'Founder'
        };

        await expect(similarityService.generateStakeholderEmbedding(stakeholderWithoutId))
          .rejects.toThrow('Stakeholder ID is required');
      });
    });

    describe('indexStakeholder', () => {
      it('should index a stakeholder for similarity search', async () => {
        const stakeholder = {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001'
        };

        const result = await similarityService.indexStakeholder(stakeholder);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(zerodbService.upsertVector).toHaveBeenCalled();
      });

      it('should store stakeholder in correct namespace', async () => {
        const stakeholder = {
          stakeholderId: 'SH002',
          name: 'Jane Smith',
          role: 'Investor',
          projectId: 'PROJ002'
        };

        await similarityService.indexStakeholder(stakeholder);

        expect(zerodbService.upsertVector).toHaveBeenCalledWith(
          expect.any(Array),
          'stakeholders',
          expect.any(Object),
          expect.any(String),
          expect.stringContaining('stakeholder:SH002')
        );
      });

      it('should include metadata in indexed vector', async () => {
        const stakeholder = {
          stakeholderId: 'SH003',
          name: 'Bob Wilson',
          role: 'Board Member',
          projectId: 'PROJ003',
          industry: 'Fintech'
        };

        await similarityService.indexStakeholder(stakeholder);

        expect(zerodbService.upsertVector).toHaveBeenCalledWith(
          expect.any(Array),
          'stakeholders',
          expect.objectContaining({
            stakeholder_id: 'SH003',
            name: 'Bob Wilson',
            role: 'Board Member',
            industry: 'Fintech'
          }),
          expect.any(String),
          expect.any(String)
        );
      });
    });

    describe('findSimilarStakeholders', () => {
      it('should find stakeholders similar to a given stakeholder', async () => {
        const sourceStakeholder = {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001'
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: {
                stakeholder_id: 'SH002',
                name: 'Jane Smith',
                role: 'Founder'
              },
              similarity_score: 0.95
            },
            {
              vector_metadata: {
                stakeholder_id: 'SH003',
                name: 'Bob Wilson',
                role: 'CEO'
              },
              similarity_score: 0.85
            }
          ],
          search_time_ms: 15
        });

        const result = await similarityService.findSimilarStakeholders(sourceStakeholder, 5);

        expect(result).toBeDefined();
        expect(result.source_stakeholder_id).toBe('SH001');
        expect(result.similar_stakeholders).toBeInstanceOf(Array);
        expect(result.similar_stakeholders.length).toBeGreaterThan(0);
      });

      it('should exclude the source stakeholder from results', async () => {
        const sourceStakeholder = {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001'
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { stakeholder_id: 'SH001', name: 'John Doe' },
              similarity_score: 1.0
            },
            {
              vector_metadata: { stakeholder_id: 'SH002', name: 'Jane Smith' },
              similarity_score: 0.85
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findSimilarStakeholders(sourceStakeholder, 5);

        const selfMatch = result.similar_stakeholders.find(
          s => s.vector_metadata.stakeholder_id === 'SH001'
        );
        expect(selfMatch).toBeUndefined();
      });

      it('should respect the limit parameter', async () => {
        const sourceStakeholder = {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001'
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { vector_metadata: { stakeholder_id: 'SH002' }, similarity_score: 0.95 },
            { vector_metadata: { stakeholder_id: 'SH003' }, similarity_score: 0.90 },
            { vector_metadata: { stakeholder_id: 'SH004' }, similarity_score: 0.85 },
            { vector_metadata: { stakeholder_id: 'SH005' }, similarity_score: 0.80 }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findSimilarStakeholders(sourceStakeholder, 2);

        expect(result.similar_stakeholders.length).toBeLessThanOrEqual(2);
      });

      it('should include similarity scores in results', async () => {
        const sourceStakeholder = {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001'
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { stakeholder_id: 'SH002', name: 'Jane Smith' },
              similarity_score: 0.92
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findSimilarStakeholders(sourceStakeholder, 5);

        expect(result.similar_stakeholders[0].similarity_score).toBe(0.92);
      });

      it('should return empty array when no similar stakeholders found', async () => {
        const sourceStakeholder = {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001'
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [],
          search_time_ms: 5
        });

        const result = await similarityService.findSimilarStakeholders(sourceStakeholder, 5);

        expect(result.similar_stakeholders).toEqual([]);
        expect(result.total_count).toBe(0);
      });
    });

    describe('findSimilarStakeholdersById', () => {
      it('should find similar stakeholders by ID', async () => {
        Stakeholder.findOne = jest.fn().mockResolvedValue({
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001'
        });

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { stakeholder_id: 'SH002', name: 'Jane Smith' },
              similarity_score: 0.90
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findSimilarStakeholdersById('SH001', 5);

        expect(result).toBeDefined();
        expect(result.source_stakeholder_id).toBe('SH001');
        expect(Stakeholder.findOne).toHaveBeenCalledWith({ stakeholderId: 'SH001' });
      });

      it('should throw error when stakeholder not found', async () => {
        Stakeholder.findOne = jest.fn().mockResolvedValue(null);

        await expect(similarityService.findSimilarStakeholdersById('NONEXISTENT', 5))
          .rejects.toThrow('Stakeholder not found');
      });
    });

    describe('searchStakeholdersByRole', () => {
      it('should search for stakeholders with similar role', async () => {
        const query = 'Founder with tech background';

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { stakeholder_id: 'SH001', name: 'John Doe', role: 'Founder' },
              similarity_score: 0.88
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.searchStakeholdersByRole(query, 10);

        expect(result).toBeDefined();
        expect(result.query).toBe(query);
        expect(result.results).toBeInstanceOf(Array);
      });

      it('should filter by role when specified', async () => {
        const query = 'experienced investor';
        const roleFilter = 'Investor';

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { stakeholder_id: 'SH001', role: 'Investor' },
              similarity_score: 0.92
            },
            {
              vector_metadata: { stakeholder_id: 'SH002', role: 'Founder' },
              similarity_score: 0.80
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.searchStakeholdersByRole(query, 10, { role: roleFilter });

        const filteredResults = result.results.filter(r => r.vector_metadata.role === 'Investor');
        expect(filteredResults.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Company Similarity', () => {
    describe('generateCompanyEmbedding', () => {
      it('should generate embedding for a company profile', async () => {
        const company = {
          companyId: 'COMP001',
          CompanyName: 'TechCorp Inc',
          CompanyType: 'startup',
          RegisteredAddress: '123 Tech Street',
          TaxID: 'TC123456',
          corporationDate: new Date('2020-01-15'),
          industry: 'Technology',
          stage: 'Series A'
        };

        const result = await similarityService.generateCompanyEmbedding(company);

        expect(result).toBeDefined();
        expect(result.embedding).toBeInstanceOf(Array);
        expect(result.embedding.length).toBe(768);
        expect(result.companyId).toBe('COMP001');
      });

      it('should include company type in embedding generation', async () => {
        const company = {
          companyId: 'COMP002',
          CompanyName: 'HealthTech LLC',
          CompanyType: 'startup',
          RegisteredAddress: '456 Health Ave',
          TaxID: 'HT789012',
          corporationDate: new Date('2021-06-20')
        };

        await similarityService.generateCompanyEmbedding(company);

        expect(vectorService.generateEmbedding).toHaveBeenCalledWith(
          expect.stringContaining('startup')
        );
      });

      it('should include industry in embedding when present', async () => {
        const company = {
          companyId: 'COMP003',
          CompanyName: 'FinServe Corp',
          CompanyType: 'corporation',
          RegisteredAddress: '789 Finance Blvd',
          TaxID: 'FS345678',
          corporationDate: new Date('2019-03-10'),
          industry: 'Financial Services'
        };

        await similarityService.generateCompanyEmbedding(company);

        expect(vectorService.generateEmbedding).toHaveBeenCalledWith(
          expect.stringContaining('Financial Services')
        );
      });

      it('should include funding stage in embedding when present', async () => {
        const company = {
          companyId: 'COMP004',
          CompanyName: 'AI Startup',
          CompanyType: 'startup',
          RegisteredAddress: '101 AI Lane',
          TaxID: 'AI901234',
          corporationDate: new Date('2022-09-01'),
          stage: 'Seed'
        };

        await similarityService.generateCompanyEmbedding(company);

        expect(vectorService.generateEmbedding).toHaveBeenCalledWith(
          expect.stringContaining('Seed')
        );
      });

      it('should throw error for invalid company data', async () => {
        const invalidCompany = null;

        await expect(similarityService.generateCompanyEmbedding(invalidCompany))
          .rejects.toThrow('Invalid company data');
      });

      it('should throw error when company has no ID', async () => {
        const companyWithoutId = {
          CompanyName: 'Test Corp',
          CompanyType: 'startup'
        };

        await expect(similarityService.generateCompanyEmbedding(companyWithoutId))
          .rejects.toThrow('Company ID is required');
      });
    });

    describe('indexCompany', () => {
      it('should index a company for similarity search', async () => {
        const company = {
          companyId: 'COMP001',
          CompanyName: 'TechCorp Inc',
          CompanyType: 'startup',
          RegisteredAddress: '123 Tech Street',
          TaxID: 'TC123456',
          corporationDate: new Date('2020-01-15')
        };

        const result = await similarityService.indexCompany(company);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(zerodbService.upsertVector).toHaveBeenCalled();
      });

      it('should store company in correct namespace', async () => {
        const company = {
          companyId: 'COMP002',
          CompanyName: 'HealthTech LLC',
          CompanyType: 'startup',
          RegisteredAddress: '456 Health Ave',
          TaxID: 'HT789012',
          corporationDate: new Date('2021-06-20')
        };

        await similarityService.indexCompany(company);

        expect(zerodbService.upsertVector).toHaveBeenCalledWith(
          expect.any(Array),
          'companies',
          expect.any(Object),
          expect.any(String),
          expect.stringContaining('company:COMP002')
        );
      });

      it('should include metadata in indexed vector', async () => {
        const company = {
          companyId: 'COMP003',
          CompanyName: 'FinServe Corp',
          CompanyType: 'corporation',
          RegisteredAddress: '789 Finance Blvd',
          TaxID: 'FS345678',
          corporationDate: new Date('2019-03-10'),
          industry: 'Finance'
        };

        await similarityService.indexCompany(company);

        expect(zerodbService.upsertVector).toHaveBeenCalledWith(
          expect.any(Array),
          'companies',
          expect.objectContaining({
            company_id: 'COMP003',
            company_name: 'FinServe Corp',
            company_type: 'corporation',
            industry: 'Finance'
          }),
          expect.any(String),
          expect.any(String)
        );
      });
    });

    describe('findSimilarCompanies', () => {
      it('should find companies similar to a given company', async () => {
        const sourceCompany = {
          companyId: 'COMP001',
          CompanyName: 'TechCorp Inc',
          CompanyType: 'startup',
          RegisteredAddress: '123 Tech Street',
          TaxID: 'TC123456',
          corporationDate: new Date('2020-01-15')
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: {
                company_id: 'COMP002',
                company_name: 'Another Tech Inc',
                company_type: 'startup'
              },
              similarity_score: 0.93
            },
            {
              vector_metadata: {
                company_id: 'COMP003',
                company_name: 'Tech Solutions',
                company_type: 'startup'
              },
              similarity_score: 0.87
            }
          ],
          search_time_ms: 12
        });

        const result = await similarityService.findSimilarCompanies(sourceCompany, 5);

        expect(result).toBeDefined();
        expect(result.source_company_id).toBe('COMP001');
        expect(result.similar_companies).toBeInstanceOf(Array);
        expect(result.similar_companies.length).toBeGreaterThan(0);
      });

      it('should exclude the source company from results', async () => {
        const sourceCompany = {
          companyId: 'COMP001',
          CompanyName: 'TechCorp Inc',
          CompanyType: 'startup',
          RegisteredAddress: '123 Tech Street',
          TaxID: 'TC123456',
          corporationDate: new Date('2020-01-15')
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { company_id: 'COMP001', company_name: 'TechCorp Inc' },
              similarity_score: 1.0
            },
            {
              vector_metadata: { company_id: 'COMP002', company_name: 'Another Tech' },
              similarity_score: 0.88
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findSimilarCompanies(sourceCompany, 5);

        const selfMatch = result.similar_companies.find(
          c => c.vector_metadata.company_id === 'COMP001'
        );
        expect(selfMatch).toBeUndefined();
      });

      it('should respect the limit parameter', async () => {
        const sourceCompany = {
          companyId: 'COMP001',
          CompanyName: 'TechCorp Inc',
          CompanyType: 'startup',
          RegisteredAddress: '123 Tech Street',
          TaxID: 'TC123456',
          corporationDate: new Date('2020-01-15')
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { vector_metadata: { company_id: 'COMP002' }, similarity_score: 0.95 },
            { vector_metadata: { company_id: 'COMP003' }, similarity_score: 0.90 },
            { vector_metadata: { company_id: 'COMP004' }, similarity_score: 0.85 },
            { vector_metadata: { company_id: 'COMP005' }, similarity_score: 0.80 }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findSimilarCompanies(sourceCompany, 2);

        expect(result.similar_companies.length).toBeLessThanOrEqual(2);
      });

      it('should include similarity scores in results', async () => {
        const sourceCompany = {
          companyId: 'COMP001',
          CompanyName: 'TechCorp Inc',
          CompanyType: 'startup',
          RegisteredAddress: '123 Tech Street',
          TaxID: 'TC123456',
          corporationDate: new Date('2020-01-15')
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { company_id: 'COMP002', company_name: 'Tech Inc' },
              similarity_score: 0.89
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findSimilarCompanies(sourceCompany, 5);

        expect(result.similar_companies[0].similarity_score).toBe(0.89);
      });

      it('should return empty array when no similar companies found', async () => {
        const sourceCompany = {
          companyId: 'COMP001',
          CompanyName: 'TechCorp Inc',
          CompanyType: 'startup',
          RegisteredAddress: '123 Tech Street',
          TaxID: 'TC123456',
          corporationDate: new Date('2020-01-15')
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [],
          search_time_ms: 5
        });

        const result = await similarityService.findSimilarCompanies(sourceCompany, 5);

        expect(result.similar_companies).toEqual([]);
        expect(result.total_count).toBe(0);
      });
    });

    describe('findSimilarCompaniesById', () => {
      it('should find similar companies by ID', async () => {
        Company.findOne = jest.fn().mockResolvedValue({
          companyId: 'COMP001',
          CompanyName: 'TechCorp Inc',
          CompanyType: 'startup',
          RegisteredAddress: '123 Tech Street',
          TaxID: 'TC123456',
          corporationDate: new Date('2020-01-15')
        });

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { company_id: 'COMP002', company_name: 'Tech Inc' },
              similarity_score: 0.91
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findSimilarCompaniesById('COMP001', 5);

        expect(result).toBeDefined();
        expect(result.source_company_id).toBe('COMP001');
        expect(Company.findOne).toHaveBeenCalledWith({ companyId: 'COMP001' });
      });

      it('should throw error when company not found', async () => {
        Company.findOne = jest.fn().mockResolvedValue(null);

        await expect(similarityService.findSimilarCompaniesById('NONEXISTENT', 5))
          .rejects.toThrow('Company not found');
      });
    });

    describe('searchCompaniesByType', () => {
      it('should search for companies with similar type', async () => {
        const query = 'Technology startup with AI focus';

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { company_id: 'COMP001', company_name: 'AI Corp', company_type: 'startup' },
              similarity_score: 0.91
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.searchCompaniesByType(query, 10);

        expect(result).toBeDefined();
        expect(result.query).toBe(query);
        expect(result.results).toBeInstanceOf(Array);
      });

      it('should filter by company type when specified', async () => {
        const query = 'technology company';
        const typeFilter = 'startup';

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { company_id: 'COMP001', company_type: 'startup' },
              similarity_score: 0.90
            },
            {
              vector_metadata: { company_id: 'COMP002', company_type: 'corporation' },
              similarity_score: 0.75
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.searchCompaniesByType(query, 10, { companyType: typeFilter });

        const filteredResults = result.results.filter(r => r.vector_metadata.company_type === 'startup');
        expect(filteredResults.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('indexAllStakeholders', () => {
      it('should index all stakeholders from database', async () => {
        const mockStakeholders = [
          { stakeholderId: 'SH001', name: 'John Doe', role: 'Founder', projectId: 'PROJ001' },
          { stakeholderId: 'SH002', name: 'Jane Smith', role: 'Investor', projectId: 'PROJ001' }
        ];

        Stakeholder.find = jest.fn().mockResolvedValue(mockStakeholders);

        const result = await similarityService.indexAllStakeholders();

        expect(result).toBeDefined();
        expect(result.indexed_count).toBe(2);
        expect(result.success).toBe(true);
      });

      it('should handle empty stakeholder list', async () => {
        Stakeholder.find = jest.fn().mockResolvedValue([]);

        const result = await similarityService.indexAllStakeholders();

        expect(result.indexed_count).toBe(0);
        expect(result.success).toBe(true);
      });

      it('should continue indexing on individual failures', async () => {
        const mockStakeholders = [
          { stakeholderId: 'SH001', name: 'John Doe', role: 'Founder', projectId: 'PROJ001' },
          { stakeholderId: null, name: 'Invalid', role: 'Investor', projectId: 'PROJ001' },
          { stakeholderId: 'SH003', name: 'Jane Smith', role: 'Advisor', projectId: 'PROJ001' }
        ];

        Stakeholder.find = jest.fn().mockResolvedValue(mockStakeholders);

        const result = await similarityService.indexAllStakeholders();

        expect(result.indexed_count).toBe(2);
        expect(result.failed_count).toBe(1);
      });
    });

    describe('indexAllCompanies', () => {
      it('should index all companies from database', async () => {
        const mockCompanies = [
          { companyId: 'COMP001', CompanyName: 'TechCorp', CompanyType: 'startup', RegisteredAddress: '123 St', TaxID: 'TC1', corporationDate: new Date() },
          { companyId: 'COMP002', CompanyName: 'HealthInc', CompanyType: 'corporation', RegisteredAddress: '456 Ave', TaxID: 'HI2', corporationDate: new Date() }
        ];

        Company.find = jest.fn().mockResolvedValue(mockCompanies);

        const result = await similarityService.indexAllCompanies();

        expect(result).toBeDefined();
        expect(result.indexed_count).toBe(2);
        expect(result.success).toBe(true);
      });

      it('should handle empty company list', async () => {
        Company.find = jest.fn().mockResolvedValue([]);

        const result = await similarityService.indexAllCompanies();

        expect(result.indexed_count).toBe(0);
        expect(result.success).toBe(true);
      });

      it('should continue indexing on individual failures', async () => {
        const mockCompanies = [
          { companyId: 'COMP001', CompanyName: 'TechCorp', CompanyType: 'startup', RegisteredAddress: '123 St', TaxID: 'TC1', corporationDate: new Date() },
          { companyId: null, CompanyName: 'Invalid', CompanyType: 'startup', RegisteredAddress: '789 Blvd', TaxID: 'INV', corporationDate: new Date() },
          { companyId: 'COMP003', CompanyName: 'HealthInc', CompanyType: 'corporation', RegisteredAddress: '456 Ave', TaxID: 'HI3', corporationDate: new Date() }
        ];

        Company.find = jest.fn().mockResolvedValue(mockCompanies);

        const result = await similarityService.indexAllCompanies();

        expect(result.indexed_count).toBe(2);
        expect(result.failed_count).toBe(1);
      });
    });
  });

  describe('Cross-Entity Similarity', () => {
    describe('findNetworkConnections', () => {
      it('should find networking recommendations based on stakeholder profile', async () => {
        const stakeholder = {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001',
          industry: 'Technology'
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { stakeholder_id: 'SH002', name: 'Jane Smith', role: 'Investor', industry: 'Technology' },
              similarity_score: 0.88
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findNetworkConnections(stakeholder, 10);

        expect(result).toBeDefined();
        expect(result.recommendations).toBeInstanceOf(Array);
      });

      it('should prioritize complementary roles for networking', async () => {
        const founder = {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder',
          projectId: 'PROJ001'
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { stakeholder_id: 'SH002', name: 'Jane', role: 'Investor' },
              similarity_score: 0.85
            },
            {
              vector_metadata: { stakeholder_id: 'SH003', name: 'Bob', role: 'Founder' },
              similarity_score: 0.90
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findNetworkConnections(founder, 10);

        // Investors should be recommended to founders
        const investorRecommendation = result.recommendations.find(
          r => r.vector_metadata.role === 'Investor'
        );
        expect(investorRecommendation).toBeDefined();
      });
    });

    describe('findCompaniesForStakeholder', () => {
      it('should find companies matching stakeholder investment criteria', async () => {
        const investor = {
          stakeholderId: 'SH001',
          name: 'Jane Smith',
          role: 'Investor',
          projectId: 'PROJ001',
          industry: 'Technology',
          investmentPreferences: {
            stage: 'Series A',
            sectors: ['AI', 'SaaS']
          }
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: { company_id: 'COMP001', company_name: 'AI Startup', company_type: 'startup', industry: 'Technology' },
              similarity_score: 0.92
            }
          ],
          search_time_ms: 10
        });

        const result = await similarityService.findCompaniesForStakeholder(investor, 10);

        expect(result).toBeDefined();
        expect(result.matched_companies).toBeInstanceOf(Array);
      });
    });
  });

  describe('Analytics', () => {
    describe('getSimilarityAnalytics', () => {
      it('should return analytics for similarity operations', async () => {
        // Mock separate calls for stakeholder and company namespaces
        zerodbService.listVectors
          .mockResolvedValueOnce([
            { vector_metadata: { stakeholder_id: 'SH001', role: 'Founder' } },
            { vector_metadata: { stakeholder_id: 'SH002', role: 'Investor' } }
          ])
          .mockResolvedValueOnce([
            { vector_metadata: { company_id: 'COMP001', company_type: 'startup' } }
          ]);

        const result = await similarityService.getSimilarityAnalytics();

        expect(result).toBeDefined();
        expect(result.total_indexed).toBe(3);
        expect(result).toHaveProperty('stakeholder_count');
        expect(result).toHaveProperty('company_count');
        expect(result.stakeholder_count).toBe(2);
        expect(result.company_count).toBe(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle vector service errors gracefully', async () => {
      vectorService.generateEmbedding.mockRejectedValue(new Error('Embedding service unavailable'));

      const stakeholder = {
        stakeholderId: 'SH001',
        name: 'John Doe',
        role: 'Founder',
        projectId: 'PROJ001'
      };

      await expect(similarityService.generateStakeholderEmbedding(stakeholder))
        .rejects.toThrow('Embedding service unavailable');
    });

    it('should handle ZeroDB errors gracefully', async () => {
      zerodbService.upsertVector.mockRejectedValue(new Error('ZeroDB connection failed'));

      const stakeholder = {
        stakeholderId: 'SH001',
        name: 'John Doe',
        role: 'Founder',
        projectId: 'PROJ001'
      };

      await expect(similarityService.indexStakeholder(stakeholder))
        .rejects.toThrow('ZeroDB connection failed');
    });

    it('should handle search errors gracefully', async () => {
      zerodbService.searchVectors.mockRejectedValue(new Error('Search failed'));

      const stakeholder = {
        stakeholderId: 'SH001',
        name: 'John Doe',
        role: 'Founder',
        projectId: 'PROJ001'
      };

      await expect(similarityService.findSimilarStakeholders(stakeholder, 5))
        .rejects.toThrow('Search failed');
    });
  });
});
