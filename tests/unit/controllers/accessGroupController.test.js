/**
 * Access Group Controller Test Suite
 *
 * Tests for the ZeroDB-based access group controller
 * Issue #274: Implement Access Groups and Policy Management endpoints
 *
 * Test Coverage:
 * - CRUD operations (create, read, update, delete)
 * - Default groups retrieval
 * - Validation
 * - Error handling
 */

const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

// Import controller after mocking
const accessGroupController = require('../../../controllers/accessGroupController');

describe('Access Group Controller (ZeroDB)', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request and response
    mockReq = {
      body: {},
      params: {},
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        companyId: 'company-123'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset ZeroDB service mock
    zerodbService.insertRow = jest.fn();
    zerodbService.queryRows = jest.fn();
    zerodbService.queryTable = jest.fn();
    zerodbService.updateRows = jest.fn();
    zerodbService.deleteRows = jest.fn();
  });

  describe('Given the getAllAccessGroups function', () => {
    describe('When groups exist in the database', () => {
      it('Then it should return all access groups', async () => {
        const mockGroups = [
          {
            row_id: 'grp-001',
            row_data: {
              groupId: 'GRP-TEAM1',
              name: 'Engineering Team',
              description: 'Engineering department access group',
              memberCount: 15,
              companyId: 'company-123',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z'
            }
          },
          {
            row_id: 'grp-002',
            row_data: {
              groupId: 'GRP-TEAM2',
              name: 'Finance Team',
              description: 'Finance department access group',
              memberCount: 8,
              companyId: 'company-123',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z'
            }
          }
        ];

        zerodbService.queryTable.mockResolvedValue({ data: mockGroups });

        await accessGroupController.getAllAccessGroups(mockReq, mockRes);

        expect(zerodbService.queryTable).toHaveBeenCalledWith(
          'access_groups',
          expect.objectContaining({
            filter: { companyId: 'company-123' },
            limit: 1000
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: 'Engineering Team' }),
            expect.objectContaining({ name: 'Finance Team' })
          ])
        );
      });
    });

    describe('When no groups exist in the database', () => {
      it('Then it should return default system groups', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [] });

        await accessGroupController.getAllAccessGroups(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const responseData = mockRes.json.mock.calls[0][0];
        expect(responseData.length).toBeGreaterThan(0);
        expect(responseData).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ name: 'Administrators', isSystem: true }),
            expect.objectContaining({ name: 'Investors', isSystem: true }),
            expect.objectContaining({ name: 'Employees', isSystem: true })
          ])
        );
      });
    });

    describe('When database query fails', () => {
      it('Then it should return default groups as fallback', async () => {
        zerodbService.queryTable.mockRejectedValue(new Error('Database error'));

        await accessGroupController.getAllAccessGroups(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const responseData = mockRes.json.mock.calls[0][0];
        expect(responseData.length).toBeGreaterThan(0);
        expect(responseData[0]).toHaveProperty('isSystem', true);
      });
    });
  });

  describe('Given the getAccessGroupById function', () => {
    describe('When group exists', () => {
      it('Then it should return the group', async () => {
        mockReq.params = { id: 'GRP-TEAM1' };

        const mockGroup = {
          row_id: 'grp-001',
          row_data: {
            groupId: 'GRP-TEAM1',
            name: 'Engineering Team',
            description: 'Engineering department',
            memberCount: 15,
            companyId: 'company-123'
          }
        };

        zerodbService.queryTable.mockResolvedValue({ data: [mockGroup] });

        await accessGroupController.getAccessGroupById(mockReq, mockRes);

        expect(zerodbService.queryTable).toHaveBeenCalledWith(
          'access_groups',
          expect.objectContaining({
            filter: { groupId: 'GRP-TEAM1' },
            limit: 1
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Engineering Team' })
        );
      });
    });

    describe('When group is a default system group', () => {
      it('Then it should return the default group', async () => {
        mockReq.params = { id: 'GRP-ADMINS' };

        zerodbService.queryTable.mockResolvedValue({ data: [] });

        await accessGroupController.getAccessGroupById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'GRP-ADMINS',
            name: 'Administrators',
            isSystem: true
          })
        );
      });
    });

    describe('When group does not exist', () => {
      it('Then it should return 404', async () => {
        mockReq.params = { id: 'NON-EXISTENT' };

        zerodbService.queryTable.mockResolvedValue({ data: [] });

        await accessGroupController.getAccessGroupById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access group not found'
        });
      });
    });
  });

  describe('Given the createAccessGroup function', () => {
    describe('When creating a new group with valid data', () => {
      it('Then it should create and return the group', async () => {
        mockReq.body = {
          name: 'New Team',
          description: 'A new access group'
        };

        const mockCreatedGroup = {
          row_id: 'grp-new',
          row_data: {
            groupId: 'GRP-NEW123',
            name: 'New Team',
            description: 'A new access group',
            memberCount: 0,
            createdBy: 'user-123',
            companyId: 'company-123'
          }
        };

        zerodbService.insertRow.mockResolvedValue({
          data: [mockCreatedGroup]
        });

        await accessGroupController.createAccessGroup(mockReq, mockRes);

        expect(zerodbService.insertRow).toHaveBeenCalledWith(
          'access_groups',
          expect.objectContaining({
            name: 'New Team',
            description: 'A new access group',
            memberCount: 0,
            createdBy: 'user-123',
            companyId: 'company-123'
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Team',
            memberCount: 0
          })
        );
      });
    });

    describe('When name is missing', () => {
      it('Then it should return 400 error', async () => {
        mockReq.body = { description: 'No name provided' };

        await accessGroupController.createAccessGroup(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Group name is required'
        });
        expect(zerodbService.insertRow).not.toHaveBeenCalled();
      });
    });

    describe('When name is empty string', () => {
      it('Then it should return 400 error', async () => {
        mockReq.body = { name: '   ' };

        await accessGroupController.createAccessGroup(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Group name is required'
        });
      });
    });
  });

  describe('Given the updateAccessGroup function', () => {
    describe('When updating an existing group', () => {
      it('Then it should update and return the group', async () => {
        mockReq.params = { id: 'GRP-TEAM1' };
        mockReq.body = {
          name: 'Updated Team Name',
          description: 'Updated description'
        };

        zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
        zerodbService.queryTable.mockResolvedValue({
          data: [{
            row_id: 'grp-001',
            row_data: {
              groupId: 'GRP-TEAM1',
              name: 'Updated Team Name',
              description: 'Updated description',
              memberCount: 15
            }
          }]
        });

        await accessGroupController.updateAccessGroup(mockReq, mockRes);

        expect(zerodbService.updateRows).toHaveBeenCalledWith(
          'access_groups',
          expect.objectContaining({
            filter: { groupId: 'GRP-TEAM1' },
            update: expect.objectContaining({
              name: 'Updated Team Name',
              description: 'Updated description'
            })
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Updated Team Name' })
        );
      });
    });

    describe('When group does not exist', () => {
      it('Then it should return 404', async () => {
        mockReq.params = { id: 'NON-EXISTENT' };
        mockReq.body = { name: 'Updated' };

        zerodbService.updateRows.mockResolvedValue({ modified_count: 0 });

        await accessGroupController.updateAccessGroup(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access group not found'
        });
      });
    });
  });

  describe('Given the deleteAccessGroup function', () => {
    describe('When deleting an existing group', () => {
      it('Then it should delete the group and return success', async () => {
        mockReq.params = { id: 'GRP-TEAM1' };

        zerodbService.deleteRows.mockResolvedValue({ deleted_count: 1 });

        await accessGroupController.deleteAccessGroup(mockReq, mockRes);

        expect(zerodbService.deleteRows).toHaveBeenCalledWith(
          'access_groups',
          expect.objectContaining({
            filter: { groupId: 'GRP-TEAM1' }
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Access group deleted successfully'
        });
      });
    });

    describe('When group does not exist', () => {
      it('Then it should return 404', async () => {
        mockReq.params = { id: 'NON-EXISTENT' };

        zerodbService.deleteRows.mockResolvedValue({ deleted_count: 0 });

        await accessGroupController.deleteAccessGroup(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access group not found'
        });
      });
    });
  });

  describe('Default Access Groups', () => {
    it('Should include all expected default groups', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await accessGroupController.getAllAccessGroups(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      const groupNames = responseData.map(g => g.name);

      expect(groupNames).toContain('Administrators');
      expect(groupNames).toContain('Investors');
      expect(groupNames).toContain('Employees');
      expect(groupNames).toContain('Advisors');
      expect(groupNames).toContain('Legal Team');
      expect(groupNames).toContain('Finance Team');
      expect(groupNames).toContain('Board Members');
      expect(groupNames).toContain('Data Room Guests');
    });

    it('Should mark all default groups as system groups', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await accessGroupController.getAllAccessGroups(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      responseData.forEach(group => {
        expect(group.isSystem).toBe(true);
      });
    });
  });
});
