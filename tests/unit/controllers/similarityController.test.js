/**
 * Similarity Controller Test Suite
 *
 * [Feature] Issue #25: Implement stakeholder/company similarity search
 * Tests for similarity controller API endpoints
 */

const similarityController = require('../../../controllers/similarityController');
const similarityService = require('../../../services/similarityService');

// Mock the similarity service
jest.mock('../../../services/similarityService');

describe('Similarity Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('findSimilarStakeholders', () => {
    it('should return similar stakeholders successfully', async () => {
      const stakeholder = {
        stakeholderId: 'SH001',
        name: 'John Doe',
        role: 'Founder',
        projectId: 'PROJ001'
      };

      mockReq.body = { stakeholder, limit: 5 };

      similarityService.findSimilarStakeholders.mockResolvedValue({
        source_stakeholder_id: 'SH001',
        similar_stakeholders: [
          { vector_metadata: { stakeholder_id: 'SH002' }, similarity_score: 0.9 }
        ],
        total_count: 1
      });

      await similarityController.findSimilarStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        source_stakeholder_id: 'SH001'
      }));
    });

    it('should return 400 when stakeholder data is missing', async () => {
      mockReq.body = {};

      await similarityController.findSimilarStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Stakeholder data is required'
      }));
    });

    it('should return 400 when stakeholder ID is missing', async () => {
      mockReq.body = { stakeholder: { name: 'John Doe' } };

      await similarityController.findSimilarStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Stakeholder ID is required'
      }));
    });

    it('should return 500 on service error', async () => {
      mockReq.body = {
        stakeholder: { stakeholderId: 'SH001', name: 'John' }
      };

      similarityService.findSimilarStakeholders.mockRejectedValue(
        new Error('Service error')
      );

      await similarityController.findSimilarStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Error finding similar stakeholders'
      }));
    });
  });

  describe('findSimilarStakeholdersById', () => {
    it('should return similar stakeholders by ID successfully', async () => {
      mockReq.params = { id: 'SH001' };
      mockReq.query = { limit: '5' };

      similarityService.findSimilarStakeholdersById.mockResolvedValue({
        source_stakeholder_id: 'SH001',
        similar_stakeholders: [],
        total_count: 0
      });

      await similarityController.findSimilarStakeholdersById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(similarityService.findSimilarStakeholdersById).toHaveBeenCalledWith('SH001', 5);
    });

    it('should return 400 when ID is missing', async () => {
      mockReq.params = {};

      await similarityController.findSimilarStakeholdersById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when stakeholder not found', async () => {
      mockReq.params = { id: 'NONEXISTENT' };

      similarityService.findSimilarStakeholdersById.mockRejectedValue(
        new Error('Stakeholder not found')
      );

      await similarityController.findSimilarStakeholdersById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('searchStakeholdersByRole', () => {
    it('should search stakeholders by role successfully', async () => {
      mockReq.query = {
        query: 'technology founder',
        limit: '10',
        role: 'Founder'
      };

      similarityService.searchStakeholdersByRole.mockResolvedValue({
        query: 'technology founder',
        results: [],
        total_count: 0
      });

      await similarityController.searchStakeholdersByRole(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(similarityService.searchStakeholdersByRole).toHaveBeenCalledWith(
        'technology founder',
        10,
        { role: 'Founder' }
      );
    });

    it('should return 400 when query is missing', async () => {
      mockReq.query = {};

      await similarityController.searchStakeholdersByRole(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Search query is required'
      }));
    });
  });

  describe('indexStakeholder', () => {
    it('should index stakeholder successfully', async () => {
      mockReq.body = {
        stakeholderId: 'SH001',
        name: 'John Doe',
        role: 'Founder'
      };

      similarityService.indexStakeholder.mockResolvedValue({
        success: true,
        stakeholderId: 'SH001'
      });

      await similarityController.indexStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when stakeholder data is invalid', async () => {
      mockReq.body = {};

      await similarityController.indexStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('findSimilarCompanies', () => {
    it('should return similar companies successfully', async () => {
      const company = {
        companyId: 'COMP001',
        CompanyName: 'TechCorp',
        CompanyType: 'startup'
      };

      mockReq.body = { company, limit: 5 };

      similarityService.findSimilarCompanies.mockResolvedValue({
        source_company_id: 'COMP001',
        similar_companies: [],
        total_count: 0
      });

      await similarityController.findSimilarCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when company data is missing', async () => {
      mockReq.body = {};

      await similarityController.findSimilarCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Company data is required'
      }));
    });

    it('should return 400 when company ID is missing', async () => {
      mockReq.body = { company: { CompanyName: 'Test' } };

      await similarityController.findSimilarCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Company ID is required'
      }));
    });
  });

  describe('findSimilarCompaniesById', () => {
    it('should return similar companies by ID successfully', async () => {
      mockReq.params = { id: 'COMP001' };
      mockReq.query = { limit: '5' };

      similarityService.findSimilarCompaniesById.mockResolvedValue({
        source_company_id: 'COMP001',
        similar_companies: [],
        total_count: 0
      });

      await similarityController.findSimilarCompaniesById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(similarityService.findSimilarCompaniesById).toHaveBeenCalledWith('COMP001', 5);
    });

    it('should return 404 when company not found', async () => {
      mockReq.params = { id: 'NONEXISTENT' };

      similarityService.findSimilarCompaniesById.mockRejectedValue(
        new Error('Company not found')
      );

      await similarityController.findSimilarCompaniesById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('searchCompaniesByType', () => {
    it('should search companies by type successfully', async () => {
      mockReq.query = {
        query: 'technology startup',
        limit: '10',
        companyType: 'startup'
      };

      similarityService.searchCompaniesByType.mockResolvedValue({
        query: 'technology startup',
        results: [],
        total_count: 0
      });

      await similarityController.searchCompaniesByType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(similarityService.searchCompaniesByType).toHaveBeenCalledWith(
        'technology startup',
        10,
        { companyType: 'startup' }
      );
    });

    it('should return 400 when query is missing', async () => {
      mockReq.query = {};

      await similarityController.searchCompaniesByType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('indexCompany', () => {
    it('should index company successfully', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        CompanyName: 'TechCorp',
        CompanyType: 'startup'
      };

      similarityService.indexCompany.mockResolvedValue({
        success: true,
        companyId: 'COMP001'
      });

      await similarityController.indexCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when company data is invalid', async () => {
      mockReq.body = {};

      await similarityController.indexCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('indexAllStakeholders', () => {
    it('should index all stakeholders successfully', async () => {
      similarityService.indexAllStakeholders.mockResolvedValue({
        success: true,
        indexed_count: 10,
        failed_count: 0
      });

      await similarityController.indexAllStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on service error', async () => {
      similarityService.indexAllStakeholders.mockRejectedValue(
        new Error('Database error')
      );

      await similarityController.indexAllStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('indexAllCompanies', () => {
    it('should index all companies successfully', async () => {
      similarityService.indexAllCompanies.mockResolvedValue({
        success: true,
        indexed_count: 5,
        failed_count: 0
      });

      await similarityController.indexAllCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('findNetworkConnections', () => {
    it('should find network connections successfully', async () => {
      mockReq.body = {
        stakeholder: {
          stakeholderId: 'SH001',
          name: 'John Doe',
          role: 'Founder'
        },
        limit: 10
      };

      similarityService.findNetworkConnections.mockResolvedValue({
        source_stakeholder_id: 'SH001',
        recommendations: [],
        total_count: 0
      });

      await similarityController.findNetworkConnections(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when stakeholder data is missing', async () => {
      mockReq.body = {};

      await similarityController.findNetworkConnections(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('findCompaniesForStakeholder', () => {
    it('should find companies for stakeholder successfully', async () => {
      mockReq.body = {
        stakeholder: {
          stakeholderId: 'SH001',
          name: 'Jane Smith',
          role: 'Investor'
        },
        limit: 10
      };

      similarityService.findCompaniesForStakeholder.mockResolvedValue({
        source_stakeholder_id: 'SH001',
        matched_companies: [],
        total_count: 0
      });

      await similarityController.findCompaniesForStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when stakeholder data is missing', async () => {
      mockReq.body = {};

      await similarityController.findCompaniesForStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics successfully', async () => {
      similarityService.getSimilarityAnalytics.mockResolvedValue({
        total_indexed: 100,
        stakeholder_count: 60,
        company_count: 40
      });

      await similarityController.getAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        total_indexed: 100
      }));
    });

    it('should return 500 on service error', async () => {
      similarityService.getSimilarityAnalytics.mockRejectedValue(
        new Error('Analytics error')
      );

      await similarityController.getAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
