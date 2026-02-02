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

      expect(databaseAdapter.create).toHaveBeenCalledWith('ShareClass', shareClassData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ shareClass: mockCreatedShareClass });
    });

    it('should return 400 if name is missing', async () => {
      req.body = { description: 'Test description' };

      await createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    it('should return 400 if description is missing', async () => {
      req.body = { name: 'Common Stock' };

      await createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    it('should return 500 on database error', async () => {
      req.body = { name: 'Common Stock', description: 'Test' };
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await createShareClass(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error creating share class' });
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

      expect(databaseAdapter.find).toHaveBeenCalledWith('ShareClass', {});
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Error fetching share classes' });
    });
  });

  describe('getShareClassById', () => {
    it('should return a share class by ID', async () => {
      const mockShareClass = {
        _id: 'shareclass123',
        name: 'Common Stock',
        description: 'Common stock class',
      };
      req.params.id = 'shareclass123';

      databaseAdapter.findById.mockResolvedValue(mockShareClass);

      await getShareClassById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('ShareClass', 'shareclass123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ shareClass: mockShareClass });
    });

    it('should return 404 when share class not found', async () => {
      req.params.id = 'nonexistent';
      databaseAdapter.findById.mockResolvedValue(null);

      await getShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Share class not found' });
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'shareclass123';
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await getShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error fetching share class' });
    });
  });

  describe('updateShareClassById', () => {
    it('should update a share class successfully', async () => {
      const updateData = { name: 'Updated Common Stock' };
      req.params.id = 'shareclass123';
      req.body = updateData;

      const mockUpdatedShareClass = {
        _id: 'shareclass123',
        name: 'Updated Common Stock',
        description: 'Common stock class',
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedShareClass);

      await updateShareClassById(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ShareClass',
        'shareclass123',
        updateData,
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ shareClass: mockUpdatedShareClass });
    });

    it('should return 404 when share class not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { name: 'Updated' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await updateShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Share class not found' });
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'shareclass123';
      req.body = { name: 'Updated' };
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await updateShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error updating share class' });
    });
  });

  describe('deleteShareClassById', () => {
    it('should delete a share class successfully', async () => {
      req.params.id = 'shareclass123';
      const mockDeletedShareClass = { _id: 'shareclass123', name: 'Common' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedShareClass);

      await deleteShareClassById(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('ShareClass', 'shareclass123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Share class deleted' });
    });

    it('should return 404 when share class not found', async () => {
      req.params.id = 'nonexistent';
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await deleteShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Share class not found' });
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'shareclass123';
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await deleteShareClassById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error deleting share class' });
    });
  });
});
