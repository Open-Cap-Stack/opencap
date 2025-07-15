/**
 * Comprehensive ShareClass Controller Unit Tests
 * 
 * Tests for all ShareClass controller methods including validation, error handling, and edge cases
 */

const shareClassController = require('../../../../controllers/v1/shareClassController');
const ShareClass = require('../../../../models/ShareClass');
const mongoose = require('mongoose');

// Mock the ShareClass model
jest.mock('../../../../models/ShareClass');

// Mock mongoose completely
jest.mock('mongoose', () => ({
  Schema: jest.fn(() => ({})),
  model: jest.fn(() => ({})),
  Types: {
    ObjectId: {
      isValid: jest.fn()
    }
  }
}));

describe('ShareClass Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('createShareClass', () => {
    it('should create a new share class successfully', async () => {
      const shareClassData = {
        name: 'Series A',
        description: 'Series A Preferred Stock',
        amountRaised: 1000000,
        ownershipPercentage: 20,
        dilutedShares: 1000,
        authorizedShares: 2000,
        shareClassId: 'SC-001'
      };

      req.body = shareClassData;

      ShareClass.findOne.mockResolvedValue(null);
      const mockShareClass = { 
        ...shareClassData, 
        save: jest.fn().mockResolvedValue(shareClassData) 
      };
      ShareClass.mockImplementation(() => mockShareClass);

      await shareClassController.createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(shareClassData);
    });

    it('should return validation errors for missing required fields', async () => {
      req.body = {
        name: 'Incomplete Share Class'
        // Missing required fields
      };

      await shareClassController.createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        errors: expect.arrayContaining([
          'description is required',
          'amountRaised is required',
          'ownershipPercentage is required',
          'dilutedShares is required',
          'authorizedShares is required',
          'shareClassId is required'
        ])
      });
    });

    it('should return error for invalid ownership percentage', async () => {
      req.body = {
        name: 'Test Share Class',
        description: 'Test Description',
        amountRaised: 1000000,
        ownershipPercentage: 150, // Invalid - over 100%
        dilutedShares: 1000,
        authorizedShares: 2000,
        shareClassId: 'SC-001'
      };

      await shareClassController.createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        errors: ['Ownership percentage must be between 0 and 100']
      });
    });

    it('should return error for negative values', async () => {
      req.body = {
        name: 'Test Share Class',
        description: 'Test Description',
        amountRaised: -1000,
        ownershipPercentage: 20,
        dilutedShares: -500,
        authorizedShares: 2000,
        shareClassId: 'SC-001'
      };

      await shareClassController.createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        errors: expect.arrayContaining([
          'Amount raised cannot be negative',
          'Diluted shares cannot be negative'
        ])
      });
    });

    it('should return error when diluted shares exceed authorized shares', async () => {
      req.body = {
        name: 'Test Share Class',
        description: 'Test Description',
        amountRaised: 1000000,
        ownershipPercentage: 20,
        dilutedShares: 3000, // More than authorized
        authorizedShares: 2000,
        shareClassId: 'SC-001'
      };

      await shareClassController.createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        errors: ['Diluted shares cannot exceed authorized shares']
      });
    });

    it('should return error when shareClassId already exists', async () => {
      req.body = {
        name: 'Test Share Class',
        description: 'Test Description',
        amountRaised: 1000000,
        ownershipPercentage: 20,
        dilutedShares: 1000,
        authorizedShares: 2000,
        shareClassId: 'SC-001'
      };

      ShareClass.findOne.mockResolvedValue({ shareClassId: 'SC-001' });

      await shareClassController.createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        errors: ['Share class with ID SC-001 already exists']
      });
    });

    it('should handle database errors', async () => {
      req.body = {
        name: 'Test Share Class',
        description: 'Test Description',
        amountRaised: 1000000,
        ownershipPercentage: 20,
        dilutedShares: 1000,
        authorizedShares: 2000,
        shareClassId: 'SC-001'
      };

      ShareClass.findOne.mockResolvedValue(null);
      ShareClass.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      }));

      await shareClassController.createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Error creating share class',
        message: 'Database error'
      });
    });
  });

  describe('getAllShareClasses', () => {
    it('should get all share classes without filters', async () => {
      const mockShareClasses = [
        { name: 'Series A', shareClassId: 'SC-001' },
        { name: 'Series B', shareClassId: 'SC-002' }
      ];

      ShareClass.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockShareClasses)
      });

      await shareClassController.getAllShareClasses(req, res);

      expect(ShareClass.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockShareClasses);
    });

    it('should filter by name', async () => {
      req.query.name = 'Series A';
      
      ShareClass.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ name: 'Series A' }])
      });

      await shareClassController.getAllShareClasses(req, res);

      expect(ShareClass.find).toHaveBeenCalledWith({ name: 'Series A' });
    });

    it('should filter by ownership percentage range', async () => {
      req.query.minOwnership = '10';
      req.query.maxOwnership = '30';
      
      ShareClass.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      });

      await shareClassController.getAllShareClasses(req, res);

      expect(ShareClass.find).toHaveBeenCalledWith({ 
        ownershipPercentage: { $gte: 10, $lte: 30 }
      });
    });

    it('should filter by shareClassId', async () => {
      req.query.shareClassId = 'SC-001';
      
      ShareClass.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      });

      await shareClassController.getAllShareClasses(req, res);

      expect(ShareClass.find).toHaveBeenCalledWith({ shareClassId: 'SC-001' });
    });

    it('should handle database errors', async () => {
      ShareClass.find.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await shareClassController.getAllShareClasses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Error fetching share classes',
        message: 'Database error'
      });
    });
  });

  describe('searchShareClasses', () => {
    it('should search with text index', async () => {
      req.query.q = 'Series A';
      
      const mockResults = [{ name: 'Series A', score: 1.0 }];
      ShareClass.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockResults)
        })
      });

      await shareClassController.searchShareClasses(req, res);

      expect(ShareClass.find).toHaveBeenCalledWith(
        { $text: { $search: 'Series A' } },
        { score: { $meta: "textScore" } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResults);
    });

    it('should fallback to regex search when text search returns no results', async () => {
      req.query.q = 'Series A';
      
      // First call returns empty (text search)
      ShareClass.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([])
        })
      });

      // Second call returns results (regex search)
      const regexResults = [{ name: 'Series A Preferred' }];
      ShareClass.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(regexResults)
      });

      await shareClassController.searchShareClasses(req, res);

      expect(ShareClass.find).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(regexResults);
    });

    it('should return error when search query is missing', async () => {
      req.query = {}; // No query parameter

      await shareClassController.searchShareClasses(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Search query is required'
      });
    });

    it('should handle search errors', async () => {
      req.query.q = 'Series A';
      
      ShareClass.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Search error'))
        })
      });

      await shareClassController.searchShareClasses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Error searching share classes',
        message: 'Search error'
      });
    });
  });

  describe('getShareClassById', () => {
    it('should get share class by valid ID', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      
      const mockShareClass = { _id: req.params.id, name: 'Series A' };
      ShareClass.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockShareClass)
      });

      await shareClassController.getShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockShareClass);
    });

    it('should return error for invalid ID format', async () => {
      req.params.id = 'invalid-id';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await shareClassController.getShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid share class ID format' });
    });

    it('should return 404 when share class not found', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      
      ShareClass.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await shareClassController.getShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Share class not found' });
    });

    it('should handle database errors', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      
      ShareClass.findById.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await shareClassController.getShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Error fetching share class',
        message: 'Database error'
      });
    });
  });

  describe('updateShareClass', () => {
    it('should update share class successfully', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = { name: 'Updated Series A' };
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      ShareClass.findOne.mockResolvedValue(null); // No conflict
      ShareClass.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            name: 'Original Series A',
            description: 'Description',
            amountRaised: 1000000,
            ownershipPercentage: 20,
            dilutedShares: 1000,
            authorizedShares: 2000,
            shareClassId: 'SC-001'
          })
        })
      });

      const updatedShareClass = { ...req.body, _id: req.params.id };
      ShareClass.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedShareClass)
      });

      await shareClassController.updateShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedShareClass);
    });

    it('should return error for invalid ID format', async () => {
      req.params.id = 'invalid-id';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await shareClassController.updateShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid share class ID format' });
    });

    it('should return error when updating to existing shareClassId', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = { shareClassId: 'SC-002' };
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      ShareClass.findOne.mockResolvedValue({ shareClassId: 'SC-002' }); // Conflict

      await shareClassController.updateShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        errors: ['Share class with ID SC-002 already exists']
      });
    });

    it('should return 404 when share class not found for update', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = { name: 'Updated Name' };
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      ShareClass.findOne.mockResolvedValue(null);
      ShareClass.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            name: 'Original',
            description: 'Description',
            amountRaised: 1000000,
            ownershipPercentage: 20,
            dilutedShares: 1000,
            authorizedShares: 2000,
            shareClassId: 'SC-001'
          })
        })
      });

      ShareClass.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await shareClassController.updateShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Share class not found' });
    });
  });

  describe('deleteShareClass', () => {
    it('should delete share class successfully', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      const deletedShareClass = { _id: req.params.id, name: 'Deleted Series A' };
      ShareClass.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedShareClass)
      });

      await shareClassController.deleteShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Share class deleted',
        deletedShareClass
      });
    });

    it('should return error for invalid ID format', async () => {
      req.params.id = 'invalid-id';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await shareClassController.deleteShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid share class ID format' });
    });

    it('should return 404 when share class not found for deletion', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      ShareClass.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await shareClassController.deleteShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Share class not found' });
    });
  });

  describe('bulkCreateShareClasses', () => {
    it('should bulk create share classes successfully', async () => {
      req.body = [
        {
          name: 'Series A',
          description: 'Series A Preferred',
          amountRaised: 1000000,
          ownershipPercentage: 20,
          dilutedShares: 1000,
          authorizedShares: 2000,
          shareClassId: 'SC-001'
        },
        {
          name: 'Series B',
          description: 'Series B Preferred',
          amountRaised: 2000000,
          ownershipPercentage: 15,
          dilutedShares: 1500,
          authorizedShares: 3000,
          shareClassId: 'SC-002'
        }
      ];

      ShareClass.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]) // No existing IDs
        })
      });

      ShareClass.insertMany.mockResolvedValue(req.body);

      await shareClassController.bulkCreateShareClasses(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(req.body);
    });

    it('should return error for non-array request body', async () => {
      req.body = { name: 'Not an array' };

      await shareClassController.bulkCreateShareClasses(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Request body must be an array of share classes'
      });
    });

    it('should return error for duplicate shareClassIds in request', async () => {
      req.body = [
        {
          name: 'Series A',
          description: 'Series A Preferred',
          amountRaised: 1000000,
          ownershipPercentage: 20,
          dilutedShares: 1000,
          authorizedShares: 2000,
          shareClassId: 'SC-001'
        },
        {
          name: 'Series B',
          description: 'Series B Preferred',
          amountRaised: 2000000,
          ownershipPercentage: 15,
          dilutedShares: 1500,
          authorizedShares: 3000,
          shareClassId: 'SC-001' // Duplicate ID
        }
      ];

      await shareClassController.bulkCreateShareClasses(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Duplicate shareClassIds in request'
      });
    });

    it('should return error for existing shareClassIds in database', async () => {
      req.body = [
        {
          name: 'Series A',
          description: 'Series A Preferred',
          amountRaised: 1000000,
          ownershipPercentage: 20,
          dilutedShares: 1000,
          authorizedShares: 2000,
          shareClassId: 'SC-001'
        }
      ];

      ShareClass.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([{ shareClassId: 'SC-001' }])
        })
      });

      await shareClassController.bulkCreateShareClasses(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Share classes with the following IDs already exist: SC-001'
      });
    });
  });

  describe('getShareClassAnalytics', () => {
    it('should return analytics successfully', async () => {
      const mockAnalyticsData = [
        {
          totalShareClasses: 5,
          totalAmountRaised: 10000000,
          totalDilutedShares: 5000,
          totalAuthorizedShares: 10000,
          avgOwnershipPercentage: 20,
          minOwnershipPercentage: 5,
          maxOwnershipPercentage: 35
        }
      ];

      const mockDistributionData = [
        { _id: '0-10%', count: 2, totalShares: 1000 },
        { _id: '11-25%', count: 2, totalShares: 2000 },
        { _id: '26-50%', count: 1, totalShares: 2000 }
      ];

      ShareClass.aggregate
        .mockResolvedValueOnce(mockAnalyticsData)
        .mockResolvedValueOnce(mockDistributionData);

      await shareClassController.getShareClassAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        totalShareClasses: 5,
        totalAmountRaised: 10000000,
        ownershipDistribution: expect.arrayContaining([
          { range: '0-10%', count: 2, totalShares: 1000 }
        ])
      }));
    });

    it('should handle empty analytics data', async () => {
      ShareClass.aggregate
        .mockResolvedValueOnce([]) // Empty analytics
        .mockResolvedValueOnce([]); // Empty distribution

      await shareClassController.getShareClassAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        totalShareClasses: 0,
        totalAmountRaised: 0,
        averageOwnershipPercentage: 0,
        ownershipDistribution: []
      }));
    });

    it('should handle analytics errors', async () => {
      ShareClass.aggregate.mockRejectedValue(new Error('Aggregation error'));

      await shareClassController.getShareClassAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Error generating analytics',
        message: 'Aggregation error'
      });
    });
  });
});