/**
 * Invite Management Controller ZeroDB Migration Tests
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
  createInvite,
  getAllInvites,
  getInviteById,
  updateInvite,
  deleteInvite,
} = require('../../../controllers/inviteManagementController');

describe('Invite Management Controller - ZeroDB Migration', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      user: { userId: 'user_123', companyId: 'company_123', role: 'user' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
  });

  describe('createInvite', () => {
    it('should create an invite successfully', async () => {
      const inviteData = {
        email: 'test@example.com',
        role: 'Stakeholder',
        invitedBy: 'admin@company.com',
        status: 'pending',
      };
      req.body = inviteData;

      const mockCreatedInvite = {
        _id: 'invite123',
        ...inviteData,
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedInvite);

      await createInvite(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('Invite', inviteData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCreatedInvite);
    });

    it('should return 500 on database error', async () => {
      req.body = { email: 'test@example.com', role: 'Stakeholder' };
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await createInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });
  });

  describe('getAllInvites', () => {
    it('should return all invites', async () => {
      const mockInvites = [
        { _id: '1', email: 'user1@example.com', role: 'Stakeholder' },
        { _id: '2', email: 'user2@example.com', role: 'Investor' },
      ];

      databaseAdapter.find.mockResolvedValue(mockInvites);

      await getAllInvites(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Invite', { companyId: 'company_123' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockInvites);
    });

    it('should return empty array when no invites exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await getAllInvites(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await getAllInvites(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });
  });

  describe('getInviteById', () => {
    it('should return an invite by ID', async () => {
      const mockInvite = {
        _id: 'invite123',
        email: 'test@example.com',
        role: 'Stakeholder',
      };
      req.params.id = 'invite123';

      databaseAdapter.findById.mockResolvedValue(mockInvite);

      await getInviteById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('Invite', 'invite123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockInvite);
    });

    it('should return 404 when invite not found', async () => {
      req.params.id = 'nonexistent';
      databaseAdapter.findById.mockResolvedValue(null);

      await getInviteById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invite not found' });
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'invite123';
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await getInviteById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });
  });

  describe('updateInvite', () => {
    it('should update an invite successfully', async () => {
      const updateData = { status: 'accepted' };
      req.params.id = 'invite123';
      req.body = updateData;

      const mockUpdatedInvite = {
        _id: 'invite123',
        email: 'test@example.com',
        role: 'Stakeholder',
        status: 'accepted',
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedInvite);

      await updateInvite(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Invite',
        'invite123',
        updateData,
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdatedInvite);
    });

    it('should return 404 when invite not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { status: 'accepted' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await updateInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invite not found' });
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'invite123';
      req.body = { status: 'accepted' };
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await updateInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });
  });

  describe('deleteInvite', () => {
    it('should delete an invite successfully', async () => {
      req.params.id = 'invite123';
      const mockDeletedInvite = { _id: 'invite123', email: 'test@example.com' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedInvite);

      await deleteInvite(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Invite', 'invite123');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 when invite not found', async () => {
      req.params.id = 'nonexistent';
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await deleteInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invite not found' });
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'invite123';
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await deleteInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });
  });
});
