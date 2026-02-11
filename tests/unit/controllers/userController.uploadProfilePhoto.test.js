/**
 * Unit Tests for uploadProfilePhoto and deleteProfilePhoto Controller
 *
 * Issue #187: Add Profile Photo Upload Endpoint
 */

// Mock dependencies before requiring controller
jest.mock('../../../models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));
jest.mock('../../../services/fileStorageService');
jest.mock('sharp');

const userController = require('../../../controllers/userController');
const User = require('../../../models/User');
const fileStorageService = require('../../../services/fileStorageService');
const sharp = require('sharp');

describe('User Controller - Profile Photo Upload', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup request and response objects
    req = {
      user: {
        userId: 'user_12345',
        id: 'mongo_id_12345',
        companyId: 'company_123'
      },
      file: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Setup sharp mock
    const mockSharp = {
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail-data'))
    };
    sharp.mockReturnValue(mockSharp);
  });

  describe('uploadProfilePhoto', () => {
    it('should return 400 if no file is provided', async () => {
      req.file = null;

      await userController.uploadProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No photo file provided'
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      req.user = {};
      req.file = {
        buffer: Buffer.from('fake-image-data'),
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg'
      };

      await userController.uploadProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not authenticated'
      });
    });

    it('should return 404 if user is not found', async () => {
      req.file = {
        buffer: Buffer.from('fake-image-data'),
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg'
      };

      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);

      await userController.uploadProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should successfully upload profile photo with thumbnail', async () => {
      req.file = {
        buffer: Buffer.from('fake-image-data'),
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg'
      };

      const mockUser = {
        userId: 'user_12345',
        companyId: 'company_123',
        profile: {}
      };

      User.findOne.mockResolvedValue(mockUser);

      fileStorageService.uploadFile
        .mockResolvedValueOnce({
          id: 'file_original_123',
          fileKey: 'profile-user_12345-123456.jpg',
          fileName: 'profile-user_12345-123456.jpg',
          size: 1024,
          contentType: 'image/jpeg'
        })
        .mockResolvedValueOnce({
          id: 'file_thumb_123',
          fileKey: 'profile-thumb-user_12345-123456.jpg',
          fileName: 'profile-thumb-user_12345-123456.jpg',
          size: 512,
          contentType: 'image/jpeg'
        });

      fileStorageService.getPresignedUrl
        .mockResolvedValueOnce({
          url: 'https://storage.example.com/photos/original.jpg',
          expiresAt: '2025-12-31T23:59:59Z',
          expiresIn: 31536000
        })
        .mockResolvedValueOnce({
          url: 'https://storage.example.com/photos/thumb.jpg',
          expiresAt: '2025-12-31T23:59:59Z',
          expiresIn: 31536000
        });

      User.findOneAndUpdate.mockResolvedValue({
        userId: 'user_12345',
        profile: {
          avatar: 'https://storage.example.com/photos/original.jpg',
          avatarThumbnail: 'https://storage.example.com/photos/thumb.jpg'
        }
      });

      await userController.uploadProfilePhoto(req, res);

      // Verify sharp was called to create thumbnail
      expect(sharp).toHaveBeenCalledWith(req.file.buffer);
      expect(sharp().resize).toHaveBeenCalledWith(200, 200, {
        fit: 'cover',
        position: 'center'
      });
      expect(sharp().jpeg).toHaveBeenCalledWith({ quality: 90 });

      // Verify files were uploaded
      expect(fileStorageService.uploadFile).toHaveBeenCalledTimes(2);

      // Verify original photo upload
      expect(fileStorageService.uploadFile).toHaveBeenNthCalledWith(
        1,
        req.file.buffer,
        expect.stringContaining('profile-user_12345-'),
        expect.objectContaining({
          companyId: 'company_123',
          uploadedBy: 'user_12345',
          category: 'profile_photos',
          metadata: expect.objectContaining({
            userId: 'user_12345',
            fileType: 'profile_photo'
          })
        })
      );

      // Verify thumbnail upload
      expect(fileStorageService.uploadFile).toHaveBeenNthCalledWith(
        2,
        expect.any(Buffer),
        expect.stringContaining('profile-thumb-user_12345-'),
        expect.objectContaining({
          companyId: 'company_123',
          uploadedBy: 'user_12345',
          category: 'profile_photos'
        })
      );

      // Verify presigned URLs were generated
      expect(fileStorageService.getPresignedUrl).toHaveBeenCalledTimes(2);

      // Verify user profile was updated (ZeroDB: no $set wrapper)
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user_12345' },
        expect.objectContaining({
          'profile.avatar': 'https://storage.example.com/photos/original.jpg',
          'profile.avatarThumbnail': 'https://storage.example.com/photos/thumb.jpg',
          'profile.avatarFileId': 'file_original_123',
          'profile.avatarThumbnailFileId': 'file_thumb_123'
        }),
        { new: true }
      );

      // Verify successful response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        photoUrl: 'https://storage.example.com/photos/original.jpg',
        thumbnailUrl: 'https://storage.example.com/photos/thumb.jpg',
        message: 'Profile photo uploaded successfully'
      });
    });

    it('should handle file size error', async () => {
      req.file = {
        buffer: Buffer.from('fake-image-data'),
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg'
      };

      User.findOne.mockResolvedValue({
        userId: 'user_12345',
        companyId: 'company_123'
      });

      fileStorageService.uploadFile.mockRejectedValue(
        new Error('File size exceeds maximum allowed')
      );

      await userController.uploadProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'File size exceeds maximum allowed size'
      });
    });

    it('should handle invalid file type error', async () => {
      req.file = {
        buffer: Buffer.from('fake-image-data'),
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg'
      };

      User.findOne.mockResolvedValue({
        userId: 'user_12345',
        companyId: 'company_123'
      });

      fileStorageService.uploadFile.mockRejectedValue(
        new Error('File type not allowed')
      );

      await userController.uploadProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid file type. Only image files are allowed'
      });
    });

    it('should handle general upload errors', async () => {
      req.file = {
        buffer: Buffer.from('fake-image-data'),
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg'
      };

      User.findOne.mockResolvedValue({
        userId: 'user_12345',
        companyId: 'company_123'
      });

      fileStorageService.uploadFile.mockRejectedValue(
        new Error('Upload failed')
      );

      await userController.uploadProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to upload profile photo'
        })
      );
    });
  });

  describe('deleteProfilePhoto', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = {};

      await userController.deleteProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not authenticated'
      });
    });

    it('should return 404 if user is not found', async () => {
      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);

      await userController.deleteProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });

    it('should return 404 if user has no profile photo', async () => {
      const mockUser = {
        userId: 'user_12345',
        profile: {
          avatar: null,
          avatarFileId: null
        }
      };

      User.findOne.mockResolvedValue(mockUser);

      await userController.deleteProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No profile photo to delete'
      });
    });

    it('should successfully delete profile photo', async () => {
      const mockUser = {
        userId: 'user_12345',
        profile: {
          avatar: 'https://storage.example.com/photos/original.jpg',
          avatarFileId: 'file_original_123',
          avatarThumbnailFileId: 'file_thumb_123'
        }
      };

      User.findOne.mockResolvedValue(mockUser);
      fileStorageService.deleteFile.mockResolvedValue({ deleted: true });
      User.findOneAndUpdate.mockResolvedValue({
        userId: 'user_12345',
        profile: {
          avatar: null,
          avatarThumbnail: null
        }
      });

      await userController.deleteProfilePhoto(req, res);

      // Verify files were deleted
      expect(fileStorageService.deleteFile).toHaveBeenCalledTimes(2);
      expect(fileStorageService.deleteFile).toHaveBeenNthCalledWith(
        1,
        'file_original_123',
        { soft: false }
      );
      expect(fileStorageService.deleteFile).toHaveBeenNthCalledWith(
        2,
        'file_thumb_123',
        { soft: false }
      );

      // Verify user profile was updated (ZeroDB: no $set wrapper)
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user_12345' },
        expect.objectContaining({
          'profile.avatar': null,
          'profile.avatarThumbnail': null,
          'profile.avatarFileId': null,
          'profile.avatarThumbnailFileId': null
        }),
        { new: true }
      );

      // Verify successful response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile photo deleted successfully'
      });
    });

    it('should continue if file deletion fails but still update profile', async () => {
      const mockUser = {
        userId: 'user_12345',
        profile: {
          avatar: 'https://storage.example.com/photos/original.jpg',
          avatarFileId: 'file_original_123',
          avatarThumbnailFileId: 'file_thumb_123'
        }
      };

      User.findOne.mockResolvedValue(mockUser);
      fileStorageService.deleteFile.mockRejectedValue(
        new Error('File not found in storage')
      );
      User.findOneAndUpdate.mockResolvedValue({
        userId: 'user_12345',
        profile: { avatar: null }
      });

      await userController.deleteProfilePhoto(req, res);

      // Verify profile was still updated
      expect(User.findOneAndUpdate).toHaveBeenCalled();

      // Verify successful response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile photo deleted successfully'
      });
    });

    it('should handle general deletion errors', async () => {
      const mockUser = {
        userId: 'user_12345',
        profile: {
          avatarFileId: 'file_123'
        }
      };

      User.findOne.mockResolvedValue(mockUser);
      User.findOneAndUpdate.mockRejectedValue(
        new Error('Database error')
      );

      await userController.deleteProfilePhoto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to delete profile photo'
        })
      );
    });
  });
});
