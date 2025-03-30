/**
 * RBAC Middleware Tests
 * [Feature] OCAE-302: Implement role-based access control
 * [Bug] OCAE-206: Fix Permission & Role-Based Access Control Tests
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { checkPermission, hasRole, hasPermission, getUserPermissions, rolePermissions } = require('../../middleware/rbacMiddleware');

describe('RBAC Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        userId: '123',
        role: 'user',
        permissions: []
      }
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    next = sinon.spy();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Role Permissions Mapping', () => {
    it('should define permissions for all roles', () => {
      // Arrange & Act - the rolePermissions object is imported
      
      // Assert
      expect(rolePermissions).to.be.an('object');
      expect(rolePermissions.admin).to.be.an('array');
      expect(rolePermissions.manager).to.be.an('array');
      expect(rolePermissions.user).to.be.an('array');
      expect(rolePermissions.client).to.be.an('array');
      
      // Verify admin has all permissions
      expect(rolePermissions.admin).to.include('read:companies');
      expect(rolePermissions.admin).to.include('write:companies');
      expect(rolePermissions.admin).to.include('delete:companies');
      
      // Verify manager has appropriate permissions
      expect(rolePermissions.manager).to.include('read:companies');
      expect(rolePermissions.manager).to.include('write:companies');
      expect(rolePermissions.manager).to.not.include('delete:companies');
      
      // Verify user has limited permissions
      expect(rolePermissions.user).to.include('read:companies');
      expect(rolePermissions.user).to.not.include('write:companies');
      expect(rolePermissions.user).to.not.include('delete:companies');
    });
  });

  describe('getUserPermissions function', () => {
    it('should return combined permissions from user permissions and role', () => {
      // Arrange
      const user = {
        role: 'manager',
        permissions: ['custom:permission']
      };
      
      // Act
      const permissions = getUserPermissions(user);
      
      // Assert
      expect(permissions).to.include('custom:permission');
      expect(permissions).to.include('read:companies');
      expect(permissions).to.include('write:companies');
      expect(permissions).to.include('read:users');
    });
    
    it('should handle users with no explicit permissions', () => {
      // Arrange
      const user = {
        role: 'user',
        permissions: []
      };
      
      // Act
      const permissions = getUserPermissions(user);
      
      // Assert
      expect(permissions).to.include('read:companies');
      expect(permissions.length).to.equal(rolePermissions.user.length);
    });
    
    it('should handle users with no role', () => {
      // Arrange
      const user = {
        permissions: ['custom:permission']
      };
      
      // Act
      const permissions = getUserPermissions(user);
      
      // Assert
      expect(permissions).to.include('custom:permission');
      expect(permissions.length).to.equal(1);
    });
    
    it('should handle users with unknown roles', () => {
      // Arrange
      const user = {
        role: 'unknown-role',
        permissions: ['custom:permission']
      };
      
      // Act
      const permissions = getUserPermissions(user);
      
      // Assert
      expect(permissions).to.include('custom:permission');
      expect(permissions.length).to.equal(1);
    });
    
    it('should handle null or undefined users', () => {
      // Act & Assert
      expect(getUserPermissions(null)).to.be.an('array').that.is.empty;
      expect(getUserPermissions(undefined)).to.be.an('array').that.is.empty;
    });
    
    it('should handle missing permissions array', () => {
      // Arrange
      const user = {
        role: 'user'
      };
      
      // Act
      const permissions = getUserPermissions(user);
      
      // Assert
      expect(permissions).to.include('read:companies');
      expect(permissions.length).to.equal(rolePermissions.user.length);
    });
  });

  describe('hasRole middleware', () => {
    it('should call next() if user has the required role', () => {
      // Arrange
      const middleware = hasRole(['user', 'admin']);
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should return 403 if user does not have the required role', () => {
      // Arrange
      const middleware = hasRole(['admin', 'manager']);
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith({ message: 'Access denied: Insufficient role permissions' })).to.be.true;
    });

    it('should return 401 if no user object in request', () => {
      // Arrange
      const middleware = hasRole(['user']);
      delete req.user;
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ message: 'Authentication required' })).to.be.true;
    });
  });

  describe('hasPermission middleware', () => {
    it('should call next() if user has the required permission explicitly assigned', () => {
      // Arrange
      req.user.permissions = ['read:users', 'write:users'];
      const middleware = hasPermission('read:users');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });
    
    it('should call next() if user has the required permission through their role', () => {
      // Arrange
      req.user.role = 'admin';
      req.user.permissions = []; // No explicit permissions
      const middleware = hasPermission('delete:companies');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should return 403 if user does not have the required permission', () => {
      // Arrange
      req.user.role = 'user';
      req.user.permissions = ['read:users'];
      const middleware = hasPermission('write:companies');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith({ message: 'Access denied: Insufficient permissions' })).to.be.true;
    });
    
    it('should handle multiple permissions with OR logic', () => {
      // Arrange
      req.user.permissions = ['read:users'];
      const middleware = hasPermission(['write:companies', 'read:users']);
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should return 401 if no user object in request', () => {
      // Arrange
      const middleware = hasPermission('read:users');
      delete req.user;
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ message: 'Authentication required' })).to.be.true;
    });
  });

  describe('checkPermission function', () => {
    it('should return true if user has the required permission explicitly', () => {
      // Arrange
      const user = { permissions: ['read:users', 'write:users'] };
      
      // Act
      const result = checkPermission(user, 'read:users');
      
      // Assert
      expect(result).to.be.true;
    });
    
    it('should return true if user has the required permission through their role', () => {
      // Arrange
      const user = { 
        role: 'admin', 
        permissions: [] 
      };
      
      // Act
      const result = checkPermission(user, 'delete:companies');
      
      // Assert
      expect(result).to.be.true;
    });

    it('should return false if user does not have the required permission', () => {
      // Arrange
      const user = { 
        role: 'user',
        permissions: ['read:users'] 
      };
      
      // Act
      const result = checkPermission(user, 'write:users');
      
      // Assert
      expect(result).to.be.false;
    });

    it('should handle arrays of permissions (OR logic)', () => {
      // Arrange
      const user = { 
        role: 'user',
        permissions: ['read:users'] 
      };
      
      // Act
      const result = checkPermission(user, ['write:companies', 'read:users']);
      
      // Assert
      expect(result).to.be.true;
    });

    it('should handle empty user permissions but valid role', () => {
      // Arrange
      const user = { 
        role: 'user',
        permissions: [] 
      };
      
      // Act
      const result = checkPermission(user, 'read:companies');
      
      // Assert
      expect(result).to.be.true;
    });

    it('should handle missing user permissions array but valid role', () => {
      // Arrange
      const user = { role: 'admin' };
      
      // Act
      const result = checkPermission(user, 'delete:companies');
      
      // Assert
      expect(result).to.be.true;
    });
    
    it('should handle null or undefined user', () => {
      // Act & Assert
      expect(checkPermission(null, 'read:users')).to.be.false;
      expect(checkPermission(undefined, 'read:users')).to.be.false;
    });
  });
});
