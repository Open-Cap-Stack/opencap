/**
 * Document Access Validation Middleware Test Suite
 *
 * BDD-style tests for document access request validation
 * Following TDD approach: Write tests first (RED phase)
 */

const { validateDocumentAccessCreation, validateDocumentAccessUpdate } = require('../../../middleware/documentAccessValidation');

describe('Document Access Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockJson;
  let mockStatus;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson
    };
    mockNext = jest.fn();

    mockReq = {
      body: {},
      params: {}
    };
  });

  describe('validateDocumentAccessCreation', () => {
    describe('when all required fields are valid', () => {
      it('should call next() and allow the request to proceed', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should accept Write as a valid AccessLevel', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Write'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should accept Admin as a valid AccessLevel', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Admin'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow optional Permissions field', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read',
          Permissions: 'view,download'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when User field is missing or invalid', () => {
      it('should return 400 error when User is missing', () => {
        mockReq.body = {
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User is required',
          field: 'User'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 400 error when User is empty string', () => {
        mockReq.body = {
          User: '',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User is required',
          field: 'User'
        });
      });

      it('should return 400 error when User is whitespace only', () => {
        mockReq.body = {
          User: '   ',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User is required',
          field: 'User'
        });
      });

      it('should return 400 error when User is not a string', () => {
        mockReq.body = {
          User: 12345,
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User must be a valid string',
          field: 'User'
        });
      });
    });

    describe('when RelatedDocument field is missing or invalid', () => {
      it('should return 400 error when RelatedDocument is missing', () => {
        mockReq.body = {
          User: 'user-123',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'RelatedDocument is required',
          field: 'RelatedDocument'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 400 error when RelatedDocument is empty string', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: '',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'RelatedDocument is required',
          field: 'RelatedDocument'
        });
      });

      it('should return 400 error when RelatedDocument is not a string', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: { id: 'doc-456' },
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'RelatedDocument must be a valid string',
          field: 'RelatedDocument'
        });
      });
    });

    describe('when AccessLevel field is missing or invalid', () => {
      it('should return 400 error when AccessLevel is missing', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: 'doc-456'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'AccessLevel is required',
          field: 'AccessLevel'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 400 error when AccessLevel is invalid value', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 'SuperAdmin'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'AccessLevel must be one of: Read, Write, Admin',
          field: 'AccessLevel'
        });
      });

      it('should return 400 error when AccessLevel is lowercase', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 'read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'AccessLevel must be one of: Read, Write, Admin',
          field: 'AccessLevel'
        });
      });

      it('should return 400 error when AccessLevel is not a string', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 123
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'AccessLevel must be a valid string',
          field: 'AccessLevel'
        });
      });
    });

    describe('input sanitization', () => {
      it('should trim whitespace from string fields', () => {
        mockReq.body = {
          User: '  user-123  ',
          RelatedDocument: '  doc-456  ',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockReq.body.User).toBe('user-123');
        expect(mockReq.body.RelatedDocument).toBe('doc-456');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject XSS attempts in User field', () => {
        mockReq.body = {
          User: '<script>alert("xss")</script>',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User contains invalid characters',
          field: 'User'
        });
      });

      it('should reject SQL injection attempts in fields', () => {
        mockReq.body = {
          User: "user-123'; DROP TABLE users; --",
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User contains invalid characters',
          field: 'User'
        });
      });

      it('should reject NoSQL injection attempts', () => {
        mockReq.body = {
          User: { $ne: null },
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User must be a valid string',
          field: 'User'
        });
      });
    });

    describe('edge cases and security', () => {
      it('should reject extremely long User IDs', () => {
        mockReq.body = {
          User: 'a'.repeat(10000),
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User exceeds maximum length of 500 characters',
          field: 'User'
        });
      });

      it('should reject null values', () => {
        mockReq.body = {
          User: null,
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User is required',
          field: 'User'
        });
      });

      it('should reject undefined values', () => {
        mockReq.body = {
          User: undefined,
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User is required',
          field: 'User'
        });
      });

      it('should reject requests with extra dangerous fields', () => {
        mockReq.body = {
          User: 'user-123',
          RelatedDocument: 'doc-456',
          AccessLevel: 'Read',
          $where: 'malicious code'
        };

        validateDocumentAccessCreation(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid field names detected'
        });
      });
    });
  });

  describe('validateDocumentAccessUpdate', () => {
    describe('when update fields are valid', () => {
      it('should allow updating only AccessLevel', () => {
        mockReq.body = {
          AccessLevel: 'Write'
        };

        validateDocumentAccessUpdate(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockStatus).not.toHaveBeenCalled();
      });

      it('should allow updating only Permissions', () => {
        mockReq.body = {
          Permissions: 'view,edit,delete'
        };

        validateDocumentAccessUpdate(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow updating both AccessLevel and Permissions', () => {
        mockReq.body = {
          AccessLevel: 'Admin',
          Permissions: 'all'
        };

        validateDocumentAccessUpdate(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when update contains invalid AccessLevel', () => {
      it('should reject invalid AccessLevel values', () => {
        mockReq.body = {
          AccessLevel: 'InvalidLevel'
        };

        validateDocumentAccessUpdate(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'AccessLevel must be one of: Read, Write, Admin',
          field: 'AccessLevel'
        });
      });
    });

    describe('when trying to update immutable fields', () => {
      it('should reject attempts to update User field', () => {
        mockReq.body = {
          User: 'different-user',
          AccessLevel: 'Write'
        };

        validateDocumentAccessUpdate(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'User field cannot be updated'
        });
      });

      it('should reject attempts to update RelatedDocument field', () => {
        mockReq.body = {
          RelatedDocument: 'different-doc',
          AccessLevel: 'Write'
        };

        validateDocumentAccessUpdate(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'RelatedDocument field cannot be updated'
        });
      });
    });

    describe('when update body is empty or invalid', () => {
      it('should reject empty update body', () => {
        mockReq.body = {};

        validateDocumentAccessUpdate(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Update body cannot be empty'
        });
      });

      it('should reject update with only invalid fields', () => {
        mockReq.body = {
          invalidField: 'value'
        };

        validateDocumentAccessUpdate(mockReq, mockRes, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'No valid fields to update'
        });
      });
    });
  });

  describe('error message clarity', () => {
    it('should provide clear error messages for missing required fields', () => {
      mockReq.body = {};

      validateDocumentAccessCreation(mockReq, mockRes, mockNext);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
          field: expect.any(String)
        })
      );
    });

    it('should include field name in error response', () => {
      mockReq.body = {
        User: 'user-123',
        RelatedDocument: 'doc-456',
        AccessLevel: 'InvalidLevel'
      };

      validateDocumentAccessCreation(mockReq, mockRes, mockNext);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'AccessLevel'
        })
      );
    });
  });
});
