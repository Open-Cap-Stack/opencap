/**
 * RBAC Middleware Tests
 * [Feature] OCAE-302: Implement role-based access control
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { checkPermission, hasRole, hasPermission } = require('../../middleware/rbacMiddleware');

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
    it('should call next() if user has the required permission', () => {
      // Arrange
      req.user.permissions = ['read:users', 'write:users'];
      const middleware = hasPermission('read:users');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should return 403 if user does not have the required permission', () => {
      // Arrange
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
    it('should return true if user has the required permission', () => {
      // Arrange
      const user = { permissions: ['read:users', 'write:users'] };
      
      // Act
      const result = checkPermission(user, 'read:users');
      
      // Assert
      expect(result).to.be.true;
    });

    it('should return false if user does not have the required permission', () => {
      // Arrange
      const user = { permissions: ['read:users'] };
      
      // Act
      const result = checkPermission(user, 'write:users');
      
      // Assert
      expect(result).to.be.false;
    });

    it('should handle arrays of permissions (OR logic)', () => {
      // Arrange
      const user = { permissions: ['read:users'] };
      
      // Act
      const result = checkPermission(user, ['write:companies', 'read:users']);
      
      // Assert
      expect(result).to.be.true;
    });

    it('should handle empty user permissions', () => {
      // Arrange
      const user = { permissions: [] };
      
      // Act
      const result = checkPermission(user, 'read:users');
      
      // Assert
      expect(result).to.be.false;
    });

    it('should handle missing user permissions array', () => {
      // Arrange
      const user = {};
      
      // Act
      const result = checkPermission(user, 'read:users');
      
      // Assert
      expect(result).to.be.false;
    });
  });
});
