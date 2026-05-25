/**
 * Agent Token Capability Gates Test Suite
 * [Feature] Gap 5: Add capability gates for agent tokens
 *
 * Verifies that agent tokens cannot bypass RBAC by:
 * - Enforcing capability-based access for agent JWTs
 * - Blocking agents from user-sensitive endpoints via requireUserNotAgent
 * - Leaving regular user JWTs unaffected
 */

const {
  hasAgentCapability,
  requireUserNotAgent,
  agentCapabilities,
} = require('../../../middleware/rbacMiddleware');

describe('Agent Token Capability Gates (Gap 5)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  // -------------------------------------------------------------------------
  // agentCapabilities map
  // -------------------------------------------------------------------------
  describe('agentCapabilities map', () => {
    it('should export the agentCapabilities map', () => {
      expect(agentCapabilities).toBeDefined();
      expect(typeof agentCapabilities).toBe('object');
    });

    it('should define read:cap_table scope with expected allowed scopes', () => {
      expect(agentCapabilities['read:cap_table']).toEqual(
        expect.arrayContaining(['read:equity', 'read:companies', 'read:users'])
      );
    });

    it('should define read:documents scope', () => {
      expect(agentCapabilities['read:documents']).toContain('read:documents');
    });

    it('should define read:reports scope', () => {
      expect(agentCapabilities['read:reports']).toContain('read:reports');
    });

    it('should define write:documents scope', () => {
      expect(agentCapabilities['write:documents']).toEqual(
        expect.arrayContaining(['read:documents', 'write:documents'])
      );
    });

    it('should define admin:all scope', () => {
      expect(agentCapabilities['admin:all']).toContain('admin:all');
    });
  });

  // -------------------------------------------------------------------------
  // hasAgentCapability middleware
  // -------------------------------------------------------------------------
  describe('hasAgentCapability', () => {
    describe('when req.user is an agent', () => {
      it('should call next() when agent has the required capability', () => {
        req.user = {
          type: 'agent',
          role: 'agent',
          capabilities: ['read:cap_table'],
        };
        const middleware = hasAgentCapability('read:cap_table');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should return 403 when agent is missing the required capability', () => {
        req.user = {
          type: 'agent',
          role: 'agent',
          capabilities: ['read:documents'],
        };
        const middleware = hasAgentCapability('write:documents');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Agent token lacks required capability: write:documents',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 403 when agent has empty capabilities array', () => {
        req.user = {
          type: 'agent',
          role: 'agent',
          capabilities: [],
        };
        const middleware = hasAgentCapability('read:reports');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 403 when agent capabilities is undefined (defaults to empty)', () => {
        req.user = {
          type: 'agent',
          role: 'agent',
          // no capabilities property
        };
        const middleware = hasAgentCapability('read:cap_table');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow agent with admin:all capability to pass any check', () => {
        req.user = {
          type: 'agent',
          role: 'agent',
          capabilities: ['admin:all'],
        };
        const middleware = hasAgentCapability('admin:all');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should return 401 when req.user is null', () => {
        req.user = null;
        const middleware = hasAgentCapability('read:cap_table');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('when req.user is a regular (non-agent) user', () => {
      it('should call next() for admin user (falls through to normal role logic)', () => {
        req.user = {
          role: 'admin',
          permissions: [],
          // no type field — not an agent
        };
        const middleware = hasAgentCapability('read:cap_table');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should call next() for employee user (falls through)', () => {
        req.user = {
          role: 'employee',
          permissions: ['read:companies'],
        };
        const middleware = hasAgentCapability('read:documents');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should call next() for founder user (falls through)', () => {
        req.user = {
          role: 'founder',
          permissions: [],
        };
        const middleware = hasAgentCapability('write:documents');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should not apply capability check to users with type !== "agent"', () => {
        req.user = {
          type: 'human',
          role: 'investor',
          permissions: [],
        };
        const middleware = hasAgentCapability('read:cap_table');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // requireUserNotAgent middleware
  // -------------------------------------------------------------------------
  describe('requireUserNotAgent', () => {
    it('should block agent tokens with 403', () => {
      req.user = {
        type: 'agent',
        role: 'agent',
        capabilities: ['admin:all'],
      };
      requireUserNotAgent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Agent tokens cannot access this endpoint',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block agent tokens even with isAgent flag (alternate shape)', () => {
      req.user = {
        type: 'agent',
        isAgent: true,
        role: 'agent',
        capabilities: [],
      };
      requireUserNotAgent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() for regular human users', () => {
      req.user = {
        role: 'admin',
        permissions: [],
      };
      requireUserNotAgent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() for users with no type property', () => {
      req.user = {
        userId: 'user-123',
        role: 'founder',
        permissions: [],
      };
      requireUserNotAgent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() when req.user is null (let downstream auth handle it)', () => {
      req.user = null;
      requireUserNotAgent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() for users with type set to any value other than "agent"', () => {
      req.user = {
        type: 'human',
        role: 'investor',
        permissions: [],
      };
      requireUserNotAgent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
