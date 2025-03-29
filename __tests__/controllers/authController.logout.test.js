/**
 * Auth Controller Logout Tests
 * [Bug] OCDI-302: Fix User Authentication Test Failures
 * 
 * Tests to verify that the auth controller's logout functionality
 * correctly blacklists tokens and handles error cases.
 */

const { logout } = require('../../controllers/authController');
const { blacklistToken } = require('../../middleware/authMiddleware');

// Mock dependencies
jest.mock('../../middleware/authMiddleware', () => ({
  blacklistToken: jest.fn()
}));

describe('Auth Controller (OCDI-302)', () => {
  // Mock Express request and response objects
  let req;
  let res;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Express req/res
    req = {
      token: 'test-token'
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Default blacklistToken behavior
    blacklistToken.mockResolvedValue(true);
  });

  describe('Logout Function', () => {
    it('should successfully logout a user by blacklisting their token', async () => {
      // Act
      await logout(req, res);
      
      // Assert
      expect(blacklistToken).toHaveBeenCalledWith('test-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Logout successful'
      }));
    });
    
    it('should handle missing token', async () => {
      // Setup - remove token
      req.token = undefined;
      
      // Act
      await logout(req, res);
      
      // Assert
      expect(blacklistToken).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'No token provided'
      }));
    });
    
    it('should handle token blacklisting failure', async () => {
      // Setup - blacklisting fails
      blacklistToken.mockResolvedValueOnce(false);
      
      // Act
      await logout(req, res);
      
      // Assert
      expect(blacklistToken).toHaveBeenCalledWith('test-token');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Failed to invalidate token'
      }));
    });
    
    it('should handle unexpected errors during logout', async () => {
      // Setup - blacklisting throws error
      blacklistToken.mockRejectedValueOnce(new Error('Unexpected error'));
      
      // Act
      await logout(req, res);
      
      // Assert
      expect(blacklistToken).toHaveBeenCalledWith('test-token');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Internal server error'
      }));
    });
  });
});
