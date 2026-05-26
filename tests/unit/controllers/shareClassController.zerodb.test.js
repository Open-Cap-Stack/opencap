/**
 * ShareClass Controller ZeroDB Migration Tests
 * Issue #20 - Batch 3 Controllers
 */

const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the databaseAdapter
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

// Import controller after mocking
const {
  createShareClass,
  getAllShareClasses,
  getShareClassById,
  updateShareClassById,
  deleteShareClassById,
} = require('../../../controllers/shareClassController');

describe('ShareClass Controller - ZeroDB Migration', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      user: { userId: 'user_123', companyId: 'company_123', role: 'employee' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('createShareClass', () => {
    it('should create a share class successfully', async () => {
      const shareClassData = {
        name: 'Common Stock',
        description: 'Common stock share class',
      };
      req.body = shareClassData;

      const mockCreatedShareClass = {
        _id: 'shareclass123',
        ...shareClassData,
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedShareClass);

      await createShareClass(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('ShareClass', expect.objectContaining(shareClassData));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ shareClass: mockCreatedShareClass });
    });

    it('should return 400 if name is missing', async () => {
      req.body = { description: 'Test description' };

      await createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Name is required' })
      }));
    });

    it('should create share class when only name is provided', async () => {
      req.body = { name: 'Common Stock' };
      const mockCreated = { ...req.body, _id: 'test-id' };
      databaseAdapter.create.mockResolvedValue(mockCreated);

      await createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ shareClass: mockCreated });
    });

    it('should return 500 on database error', async () => {
      req.body = { name: 'Common Stock', description: 'Test' };
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Error creating share class' })
      }));
    });
  });

  describe('getAllShareClasses', () => {
    it('should return all share classes', async () => {
      const mockShareClasses = [
        { _id: '1', name: 'Common', description: 'Common stock' },
        { _id: '2', name: 'Preferred', description: 'Preferred stock' },
      ];

      databaseAdapter.find.mockResolvedValue(mockShareClasses);

      await getAllShareClasses(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('ShareClass', { companyId: 'company_123' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ shareClasses: mockShareClasses });
    });

    it('should return empty array when no share classes exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await getAllShareClasses(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ shareClasses: [] });
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await getAllShareClasses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Error fetching share classes' })
      }));
    });
  });

  describe('getShareClassById', () => {
    it('should return a share class by shareClassId', async () => {
      const mockShareClass = {
        _id: 'internal-uuid-123',
        shareClassId: 'shareclass123',
        name: 'Common Stock',
        description: 'Common stock class',
      };
      req.params.id = 'shareclass123';

      // Controller finds by shareClassId first, returns the record
      databaseAdapter.find.mockResolvedValue([mockShareClass]);

      await getShareClassById(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('ShareClass', { shareClassId: 'shareclass123' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ shareClass: mockShareClass });
    });

    it('should fall back to findById when shareClassId not found', async () => {
      const mockShareClass = {
        _id: 'shareclass123',
        name: 'Common Stock',
      };
      req.params.id = 'shareclass123';

      // find returns empty (no match by shareClassId), fallback to findById
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findById.mockResolvedValue(mockShareClass);

      await getShareClassById(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('ShareClass', { shareClassId: 'shareclass123' });
      expect(databaseAdapter.findById).toHaveBeenCalledWith('ShareClass', 'shareclass123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ shareClass: mockShareClass });
    });

    it('should return 404 when share class not found', async () => {
      req.params.id = 'nonexistent';
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findById.mockResolvedValue(null);

      await getShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Share class not found' })
      }));
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'shareclass123';
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await getShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Error fetching share class' })
      }));
    });
  });

  describe('updateShareClassById', () => {
    it('should update a share class successfully', async () => {
      const updateData = { name: 'Updated Common Stock' };
      req.params.id = 'shareclass123';
      req.body = updateData;

      const existingShareClass = { _id: 'internal-uuid-456', shareClassId: 'shareclass123' };
      const mockUpdatedShareClass = {
        _id: 'internal-uuid-456',
        name: 'Updated Common Stock',
        description: 'Common stock class',
      };

      // find returns the existing record so controller gets internal _id
      databaseAdapter.find.mockResolvedValue([existingShareClass]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedShareClass);

      await updateShareClassById(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('ShareClass', { shareClassId: 'shareclass123' });
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ShareClass',
        'internal-uuid-456',
        updateData,
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ shareClass: mockUpdatedShareClass });
    });

    it('should return 404 when share class not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { name: 'Updated' };
      // find returns empty, falls back to raw id
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await updateShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Share class not found' })
      }));
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'shareclass123';
      req.body = { name: 'Updated' };
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await updateShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Error updating share class' })
      }));
    });
  });

  describe('deleteShareClassById', () => {
    it('should delete a share class successfully', async () => {
      req.params.id = 'shareclass123';
      const existingShareClass = { _id: 'internal-uuid-789', shareClassId: 'shareclass123' };
      const mockDeletedShareClass = { _id: 'internal-uuid-789', name: 'Common' };

      databaseAdapter.find.mockResolvedValue([existingShareClass]);
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedShareClass);

      await deleteShareClassById(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('ShareClass', { shareClassId: 'shareclass123' });
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('ShareClass', 'internal-uuid-789');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Share class deleted' });
    });

    it('should return 404 when share class not found', async () => {
      req.params.id = 'nonexistent';
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await deleteShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Share class not found' })
      }));
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'shareclass123';
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await deleteShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Error deleting share class' })
      }));
    });
  });
});
