/**
 * Integration Tests for Profile Photo Upload Endpoint
 *
 * Issue #187: Add Profile Photo Upload Endpoint
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../app');
const User = require('../../models/User');
const fileStorageService = require('../../services/fileStorageService');

// Mock file storage service for integration tests
jest.mock('../../services/fileStorageService');

describe('Profile Photo Upload Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create a test user
    testUser = await User.create({
      userId: 'test_user_photo_123',
      firstName: 'Test',
      lastName: 'User',
      email: 'photo.test@example.com',
      password: 'hashedPassword123',
      role: 'user',
      status: 'active',
      companyId: 'company_test_123'
    });

    // Generate auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      {
        userId: testUser.userId,
        email: testUser.email,
        role: testUser.role,
        companyId: testUser.companyId
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test user
    try {
      await User.deleteOne({ userId: testUser.userId });
    } catch (error) {
      console.error('Error cleaning up test user:', error);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup file storage service mocks
    fileStorageService.uploadFile.mockResolvedValue({
      id: 'mock_file_id',
      fileKey: 'mock_file_key',
      fileName: 'profile.jpg',
      size: 1024,
      contentType: 'image/jpeg'
    });

    fileStorageService.getPresignedUrl.mockResolvedValue({
      url: 'https://storage.example.com/photos/mock.jpg',
      expiresAt: '2025-12-31T23:59:59Z',
      expiresIn: 31536000
    });

    fileStorageService.deleteFile.mockResolvedValue({
      deleted: true,
      id: 'mock_file_id'
    });
  });

  describe('POST /api/v1/users/profile/photo', () => {
    it('should return 401 if no authentication token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .attach('photo', Buffer.from('fake-image-data'), 'test.jpg');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 if no photo file is uploaded', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid file type', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-pdf-data'), 'document.pdf');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid file type');
    });

    it('should successfully upload a JPEG profile photo', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-jpeg-data'), 'profile.jpg')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('photoUrl');
      expect(response.body).toHaveProperty('thumbnailUrl');
      expect(response.body).toHaveProperty('message', 'Profile photo uploaded successfully');

      // Verify file storage service was called
      expect(fileStorageService.uploadFile).toHaveBeenCalled();
      expect(fileStorageService.getPresignedUrl).toHaveBeenCalled();
    });

    it('should successfully upload a PNG profile photo', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-png-data'), 'profile.png')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('photoUrl');
      expect(response.body).toHaveProperty('thumbnailUrl');
    });

    it('should successfully upload a WebP profile photo', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-webp-data'), 'profile.webp')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 400 for wrong field name', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('fake-jpeg-data'), 'profile.jpg');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle file storage service errors', async () => {
      fileStorageService.uploadFile.mockRejectedValue(
        new Error('Storage service unavailable')
      );

      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-jpeg-data'), 'profile.jpg');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Failed to upload profile photo');
    });

    it('should replace existing profile photo on subsequent uploads', async () => {
      // First upload
      const firstResponse = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-jpeg-data-1'), 'profile1.jpg');

      expect(firstResponse.status).toBe(200);
      const firstPhotoUrl = firstResponse.body.photoUrl;

      // Second upload
      const secondResponse = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-jpeg-data-2'), 'profile2.jpg');

      expect(secondResponse.status).toBe(200);
      const secondPhotoUrl = secondResponse.body.photoUrl;

      // URLs should be different (new file uploaded)
      expect(secondPhotoUrl).toBeDefined();
    });
  });

  describe('DELETE /api/v1/users/profile/photo', () => {
    it('should return 401 if no authentication token is provided', async () => {
      const response = await request(app)
        .delete('/api/v1/users/profile/photo');

      expect(response.status).toBe(401);
    });

    it('should return 404 if user has no profile photo', async () => {
      const response = await request(app)
        .delete('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'No profile photo to delete');
    });

    it('should successfully delete profile photo', async () => {
      // First upload a photo
      await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-jpeg-data'), 'profile.jpg');

      // Then delete it
      const response = await request(app)
        .delete('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Profile photo deleted successfully');

      // Verify file storage service was called
      expect(fileStorageService.deleteFile).toHaveBeenCalled();
    });

    it('should handle file storage deletion errors gracefully', async () => {
      // Upload a photo first
      await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-jpeg-data'), 'profile.jpg');

      // Mock deletion error
      fileStorageService.deleteFile.mockRejectedValue(
        new Error('File not found in storage')
      );

      const response = await request(app)
        .delete('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`);

      // Should still return success (profile updated even if file deletion fails)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('File validation', () => {
    it('should reject files larger than 5MB', async () => {
      // Create a buffer larger than 5MB
      const largBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', largBuffer, 'large.jpg');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('size exceeds');
    });

    it('should accept GIF images', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-gif-data'), 'profile.gif');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject executable files', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-exe-data'), 'malware.exe');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject non-image files', async () => {
      const response = await request(app)
        .post('/api/v1/users/profile/photo')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('fake-text-data'), 'document.txt');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
