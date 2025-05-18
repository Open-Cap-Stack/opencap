/**
 * Auth Controller Mocks
 * 
 * [Feature] OCAE-202: Implement user registration endpoint
 * [Bug] OCDI-302: Fix User Authentication Test Failures
 */

// Mock for email verification function
module.exports = {
  sendVerificationEmailToUser: jest.fn().mockResolvedValue({ success: true }),
};
