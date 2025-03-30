/**
 * RBAC Integration Tests
 * [Feature] OCAE-302: Implement role-based access control
 * [Bug] OCAE-206: Fix Permission & Role-Based Access Control Tests
 */

const express = require('express');
const { hasRole, hasPermission, rolePermissions } = require('../../middleware/rbacMiddleware');

describe('RBAC Integration', () => {
  let mockReq, mockRes, mockNext;
  
  beforeEach(() => {
    mockReq = {
      user: {
        userId: 'test123',
        role: 'admin',
        permissions: ['read:users', 'write:companies']
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('hasRole middleware integration', () => {
    it('should integrate properly with Express routes', () => {
      // Create a mock express router
      const router = express.Router();
      const mockEndpoint = jest.fn((req, res) => res.json({ success: true }));
      
      // Apply RBAC middleware
      router.get('/admin-only', hasRole(['admin']), mockEndpoint);
      
      // Get the middleware chain
      const middlewareChain = router.stack[0].route.stack;
      
      // Verify middleware chain length
      expect(middlewareChain.length).toBe(2); // hasRole + endpoint
      
      // Execute the middleware
      middlewareChain[0].handle(mockReq, mockRes, mockNext);
      
      // It should call next()
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject requests for unauthorized roles', () => {
      // Create mock objects
      const unauthorizedReq = {
        user: {
          userId: 'test456',
          role: 'user',
          permissions: ['read:users']
        }
      };
      
      // Create a mock express router
      const router = express.Router();
      const mockEndpoint = jest.fn((req, res) => res.json({ success: true }));
      
      // Apply RBAC middleware
      router.get('/admin-only', hasRole(['admin']), mockEndpoint);
      
      // Get the middleware
      const middleware = router.stack[0].route.stack[0].handle;
      
      // Execute the middleware
      middleware(unauthorizedReq, mockRes, mockNext);
      
      // It should return 403
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Access denied')
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('hasPermission middleware integration', () => {
    it('should integrate properly with Express routes using explicit permissions', () => {
      // Create a mock express router
      const router = express.Router();
      const mockEndpoint = jest.fn((req, res) => res.json({ success: true }));
      
      // Apply RBAC middleware
      router.get('/write-companies', hasPermission('write:companies'), mockEndpoint);
      
      // Get the middleware chain
      const middlewareChain = router.stack[0].route.stack;
      
      // Verify middleware chain length
      expect(middlewareChain.length).toBe(2); // hasPermission + endpoint
      
      // Execute the middleware
      middlewareChain[0].handle(mockReq, mockRes, mockNext);
      
      // It should call next()
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should integrate properly with Express routes using role-based permissions', () => {
      // Create a mock express router with user that has admin role but no explicit permissions
      const adminRoleReq = {
        user: {
          userId: 'test789',
          role: 'admin',
          permissions: [] // No explicit permissions
        }
      };
      
      const router = express.Router();
      const mockEndpoint = jest.fn((req, res) => res.json({ success: true }));
      
      // Apply RBAC middleware that requires a permission that admin role has
      router.get('/delete-companies', hasPermission('delete:companies'), mockEndpoint);
      
      // Get the middleware chain
      const middlewareChain = router.stack[0].route.stack;
      
      // Execute the middleware
      middlewareChain[0].handle(adminRoleReq, mockRes, mockNext);
      
      // It should call next() because admin role has delete:companies permission
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject requests without required permission', () => {
      // Create mock objects
      const unauthorizedReq = {
        user: {
          userId: 'test456',
          role: 'user',
          permissions: ['read:users']
        }
      };
      
      // Create a mock express router
      const router = express.Router();
      const mockEndpoint = jest.fn((req, res) => res.json({ success: true }));
      
      // Apply RBAC middleware
      router.get('/write-companies', hasPermission('write:companies'), mockEndpoint);
      
      // Get the middleware
      const middleware = router.stack[0].route.stack[0].handle;
      
      // Execute the middleware
      middleware(unauthorizedReq, mockRes, mockNext);
      
      // It should return 403
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Access denied')
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Company routes RBAC integration', () => {
    it('should correctly apply RBAC to company routes', () => {
      // Import the company routes
      const companyRoutes = require('../../routes/companyRoutes');
      
      // Check that GET / route has the right middleware
      const getRoute = companyRoutes.stack.find(r => 
        r.route && r.route.path === '/' && r.route.methods.get);
      
      expect(getRoute).toBeDefined();
      expect(getRoute.route.stack.length).toBeGreaterThanOrEqual(2); // Auth + RBAC middleware
      
      // Check that POST / route has the right middleware
      const postRoute = companyRoutes.stack.find(r => 
        r.route && r.route.path === '/' && r.route.methods.post);
      
      expect(postRoute).toBeDefined();
      expect(postRoute.route.stack.length).toBeGreaterThanOrEqual(2); // Auth + RBAC middleware
      
      // Check that DELETE /:id route has the right middleware
      const deleteRoute = companyRoutes.stack.find(r => 
        r.route && r.route.path === '/:id' && r.route.methods.delete);
      
      expect(deleteRoute).toBeDefined();
      expect(deleteRoute.route.stack.length).toBeGreaterThanOrEqual(2); // Auth + RBAC middleware
    });
  });
});
