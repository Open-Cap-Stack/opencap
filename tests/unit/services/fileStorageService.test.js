/**
 * File Storage Service Tests
 *
 * Tests for the ZeroDB file storage integration
 * providing document and file management functionality
 *
 * Issue #30: Implement file storage integration
 */

const fileStorageService = require('../../../services/fileStorageService');
const zerodbService = require('../../../services/zerodbService');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Mock external services
jest.mock('../../../services/zerodbService');
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn()
  }))
}));
const axios = require('axios');


describe('FileStorageService', () => {
  let tempDir;
  let testFilePath;
  let testPdfPath;
  let testLargeFilePath;

  beforeAll(async () => {
    // Create temp directory for test files
    tempDir = path.join(os.tmpdir(), 'opencap-file-storage-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    // Create test files
    testFilePath = path.join(tempDir, 'test-document.txt');
    await fs.writeFile(testFilePath, 'This is test content for file storage.');

    testPdfPath = path.join(tempDir, 'test-document.pdf');
    await fs.writeFile(testPdfPath, '%PDF-1.4 fake pdf content');

    // Create a larger test file (100KB)
    testLargeFilePath = path.join(tempDir, 'large-document.txt');
    const largeContent = 'x'.repeat(100 * 1024);
    await fs.writeFile(testLargeFilePath, largeContent);
  });

  afterAll(async () => {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset projectId for each test
    zerodbService.projectId = 'test-project-id';
  });

  describe('File Upload', () => {
    describe('uploadFile', () => {
      it('should upload a file to ZeroDB', async () => {
        const fileBuffer = Buffer.from('Test file content');
        const fileName = 'test-document.txt';
        const options = {
          companyId: 'test-company-id-123',
          uploadedBy: 'test-company-id-123',
          category: 'financial_report'
        };

        zerodbService.client = {
          post: jest.fn().mockResolvedValue({
            data: {
              file_id: 'file-123',
              file_key: 'opencap/files/file-123.txt',
              file_name: fileName,
              size_bytes: fileBuffer.length,
              content_type: 'text/plain',
              created_at: new Date().toISOString()
            }
          })
        };

        const result = await fileStorageService.uploadFile(fileBuffer, fileName, options);

        expect(result).toBeDefined();
        expect(result.id).toBe('file-123');
        expect(result.fileName).toBe(fileName);
        expect(result.size).toBe(fileBuffer.length);
      });

      it('should upload a file from path', async () => {
        const options = {
          companyId: 'test-company-id-123',
          uploadedBy: 'test-company-id-123'
        };

        zerodbService.client = {
          post: jest.fn().mockResolvedValue({
            data: {
              file_id: 'file-456',
              file_key: 'opencap/files/file-456.txt',
              file_name: 'test-document.txt',
              size_bytes: 38,
              content_type: 'text/plain',
              created_at: new Date().toISOString()
            }
          })
        };

        const result = await fileStorageService.uploadFileFromPath(testFilePath, options);

        expect(result).toBeDefined();
        expect(result.id).toBe('file-456');
        expect(result.fileName).toBe('test-document.txt');
      });

      it('should detect content type from file extension', async () => {
        const fileBuffer = Buffer.from('Fake PDF content');
        const fileName = 'document.pdf';

        zerodbService.client = {
          post: jest.fn().mockResolvedValue({
            data: {
              file_id: 'file-789',
              content_type: 'application/pdf'
            }
          })
        };

        const result = await fileStorageService.uploadFile(fileBuffer, fileName, {});

        expect(result.contentType).toBe('application/pdf');
      });

      it('should add custom metadata to file', async () => {
        const fileBuffer = Buffer.from('Test content');
        const fileName = 'report.txt';
        const options = {
          metadata: {
            documentType: 'Q4 Report',
            year: 2024,
            confidential: true
          }
        };

        let capturedPayload;
        zerodbService.client = {
          post: jest.fn().mockImplementation((url, data) => {
            capturedPayload = data;
            return Promise.resolve({
              data: {
                file_id: 'file-meta-123',
                file_metadata: data.file_metadata || data.get?.('file_metadata')
              }
            });
          })
        };

        await fileStorageService.uploadFile(fileBuffer, fileName, options);

        expect(capturedPayload).toBeDefined();
      });

      it('should handle upload errors gracefully', async () => {
        const fileBuffer = Buffer.from('Test content');
        const fileName = 'test.txt';

        zerodbService.client = {
          post: jest.fn().mockRejectedValue(new Error('Upload failed: Network error'))
        };

        await expect(
          fileStorageService.uploadFile(fileBuffer, fileName, {})
        ).rejects.toThrow('Failed to upload file');
      });

      it('should validate file size limits', async () => {
        const oversizedBuffer = Buffer.alloc(500 * 1024 * 1024); // 500MB
        const fileName = 'huge-file.txt';

        await expect(
          fileStorageService.uploadFile(oversizedBuffer, fileName, {})
        ).rejects.toThrow('File size exceeds maximum allowed');
      });

      it('should reject invalid file types when restricted', async () => {
        const fileBuffer = Buffer.from('executable content');
        const fileName = 'virus.exe';

        await expect(
          fileStorageService.uploadFile(fileBuffer, fileName, {
            allowedTypes: ['pdf', 'txt', 'docx']
          })
        ).rejects.toThrow('File type not allowed');
      });
    });

    describe('uploadMultipleFiles', () => {
      it('should upload multiple files in batch', async () => {
        const files = [
          { buffer: Buffer.from('Content 1'), name: 'file1.txt' },
          { buffer: Buffer.from('Content 2'), name: 'file2.txt' },
          { buffer: Buffer.from('Content 3'), name: 'file3.txt' }
        ];

        zerodbService.client = {
          post: jest.fn().mockResolvedValue({
            data: { file_id: 'file-batch', file_name: 'test' }
          })
        };

        const result = await fileStorageService.uploadMultipleFiles(files, {});

        expect(result).toBeDefined();
        expect(result.successful).toBe(3);
        expect(result.failed).toBe(0);
        expect(result.files).toHaveLength(3);
      });

      it('should handle partial failures in batch upload', async () => {
        const files = [
          { buffer: Buffer.from('Content 1'), name: 'file1.txt' },
          { buffer: Buffer.from('Content 2'), name: 'file2.txt' }
        ];

        let callCount = 0;
        zerodbService.client = {
          post: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 2) {
              return Promise.reject(new Error('Upload failed'));
            }
            return Promise.resolve({ data: { id: `file-${callCount}` } });
          })
        };

        const result = await fileStorageService.uploadMultipleFiles(files, {});

        expect(result.successful).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.errors).toHaveLength(1);
      });
    });
  });

  describe('File Download', () => {
    describe('downloadFile', () => {
      it('should download a file from ZeroDB', async () => {
        const fileId = 'file-123';
        const expectedContent = Buffer.from('Downloaded file content');

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              download_url: 'https://storage.zerodb.io/download/file-123',
              file_name: 'test.txt',
              content_type: 'text/plain',
              size_bytes: expectedContent.length
            }
          })
        };

        axios.get.mockResolvedValue({
          data: expectedContent,
          headers: {
            'content-type': 'text/plain',
            'content-length': expectedContent.length
          }
        });

        const result = await fileStorageService.downloadFile(fileId);

        expect(result).toBeDefined();
        expect(result.data).toEqual(expectedContent);
        expect(result.contentType).toBe('text/plain');
      });

      it('should download file with metadata', async () => {
        const fileId = 'file-456';

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              download_url: 'https://storage.zerodb.io/download/file-456',
              file_name: 'report.pdf',
              content_type: 'application/pdf',
              size_bytes: 7
            }
          })
        };

        axios.get.mockResolvedValue({
          data: Buffer.from('content'),
          headers: {
            'content-type': 'application/pdf'
          }
        });

        const result = await fileStorageService.downloadFile(fileId, { includeMetadata: true });

        expect(result.metadata).toBeDefined();
      });

      it('should handle file not found error', async () => {
        const fileId = 'non-existent-file';

        zerodbService.client = {
          get: jest.fn().mockRejectedValue({
            response: { status: 404, data: { message: 'File not found' } }
          })
        };

        await expect(
          fileStorageService.downloadFile(fileId)
        ).rejects.toThrow('File not found');
      });

      it('should stream large files', async () => {
        const fileId = 'large-file-123';
        const mockStream = { pipe: jest.fn(), on: jest.fn() };

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              download_url: 'https://storage.zerodb.io/download/large-file-123',
              file_name: 'large.bin',
              content_type: 'application/octet-stream',
              size_bytes: 10 * 1024 * 1024
            }
          })
        };

        axios.get.mockResolvedValue({
          data: mockStream,
          headers: { 'content-type': 'application/octet-stream' }
        });

        const result = await fileStorageService.downloadFile(fileId, { stream: true });

        expect(result.stream).toBeDefined();
      });
    });

    describe('downloadFileToPath', () => {
      it('should download file directly to filesystem', async () => {
        const fileId = 'file-789';
        const outputPath = path.join(tempDir, 'downloaded-file.txt');
        const expectedContent = 'Downloaded content';

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              download_url: 'https://storage.zerodb.io/download/file-789',
              file_name: 'downloaded-file.txt',
              content_type: 'text/plain',
              size_bytes: expectedContent.length
            }
          })
        };

        axios.get.mockResolvedValue({
          data: Buffer.from(expectedContent),
          headers: { 'content-type': 'text/plain' }
        });

        const result = await fileStorageService.downloadFileToPath(fileId, outputPath);

        expect(result.path).toBe(outputPath);
        expect(result.success).toBe(true);

        // Verify file was written
        const fileContent = await fs.readFile(outputPath, 'utf-8');
        expect(fileContent).toBe(expectedContent);
      });
    });
  });

  describe('Presigned URL Generation', () => {
    describe('getPresignedUrl', () => {
      it('should generate presigned URL for file download', async () => {
        const fileId = 'file-123';

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              url: 'https://storage.zerodb.io/presigned/abc123?token=xyz',
              expires_at: new Date(Date.now() + 3600000).toISOString()
            }
          })
        };

        const result = await fileStorageService.getPresignedUrl(fileId);

        expect(result).toBeDefined();
        expect(result.url).toContain('presigned');
        expect(result.expiresAt).toBeDefined();
      });

      it('should generate presigned URL with custom expiration', async () => {
        const fileId = 'file-456';
        const expiresIn = 7200; // 2 hours

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              url: 'https://storage.zerodb.io/presigned/def456',
              expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
            }
          })
        };

        const result = await fileStorageService.getPresignedUrl(fileId, { expiresIn });

        expect(result).toBeDefined();
        expect(result.expiresIn).toBeGreaterThanOrEqual(expiresIn - 10);
      });

      it('should generate presigned URL for upload', async () => {
        const fileName = 'new-file.pdf';

        zerodbService.client = {
          post: jest.fn().mockResolvedValue({
            data: {
              upload_url: 'https://storage.zerodb.io/upload/presigned/xyz',
              file_key: 'opencap/files/new-file.pdf',
              expires_at: new Date(Date.now() + 900000).toISOString()
            }
          })
        };

        const result = await fileStorageService.getPresignedUploadUrl(fileName, {
          contentType: 'application/pdf',
          maxSize: 10 * 1024 * 1024
        });

        expect(result).toBeDefined();
        expect(result.uploadUrl).toContain('upload');
        expect(result.fileKey).toBeDefined();
      });

      it('should handle presigned URL errors', async () => {
        const fileId = 'invalid-file';

        zerodbService.client = {
          get: jest.fn().mockRejectedValue({
            response: { status: 403, data: { message: 'Access denied' } }
          })
        };

        await expect(
          fileStorageService.getPresignedUrl(fileId)
        ).rejects.toThrow('Failed to generate presigned URL');
      });
    });
  });

  describe('File Metadata Management', () => {
    describe('getFileMetadata', () => {
      it('should retrieve file metadata', async () => {
        const fileId = 'file-123';

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              id: fileId,
              file_name: 'report.pdf',
              content_type: 'application/pdf',
              size_bytes: 1024,
              file_metadata: {
                documentType: 'Financial Report',
                year: 2024
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          })
        };

        const result = await fileStorageService.getFileMetadata(fileId);

        expect(result).toBeDefined();
        expect(result.id).toBe(fileId);
        expect(result.fileName).toBe('report.pdf');
        expect(result.metadata.documentType).toBe('Financial Report');
      });
    });

    describe('updateFileMetadata', () => {
      it('should update file metadata', async () => {
        const fileId = 'file-123';
        const newMetadata = {
          documentType: 'Compliance Document',
          confidential: true,
          tags: ['compliance', '2024']
        };

        zerodbService.client = {
          patch: jest.fn().mockResolvedValue({
            data: {
              id: fileId,
              file_metadata: newMetadata,
              updated_at: new Date().toISOString()
            }
          })
        };

        const result = await fileStorageService.updateFileMetadata(fileId, newMetadata);

        expect(result).toBeDefined();
        expect(result.metadata.documentType).toBe('Compliance Document');
        expect(result.metadata.confidential).toBe(true);
      });

      it('should merge metadata with existing values', async () => {
        const fileId = 'file-456';
        const existingMetadata = { year: 2024, category: 'financial' };
        const newMetadata = { status: 'approved' };

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: { file_metadata: existingMetadata }
          }),
          patch: jest.fn().mockResolvedValue({
            data: {
              id: fileId,
              file_metadata: { ...existingMetadata, ...newMetadata }
            }
          })
        };

        const result = await fileStorageService.updateFileMetadata(fileId, newMetadata, {
          merge: true
        });

        expect(result.metadata.year).toBe(2024);
        expect(result.metadata.status).toBe('approved');
      });
    });

    describe('searchFilesByMetadata', () => {
      it('should search files by metadata criteria', async () => {
        const searchCriteria = {
          documentType: 'Financial Report',
          year: 2024
        };

        zerodbService.listFiles = jest.fn().mockResolvedValue([
          { id: 'file-1', file_metadata: { documentType: 'Financial Report', year: 2024 } },
          { id: 'file-2', file_metadata: { documentType: 'Financial Report', year: 2024 } }
        ]);

        const result = await fileStorageService.searchFilesByMetadata(searchCriteria);

        expect(result).toBeDefined();
        expect(result.files).toHaveLength(2);
      });
    });
  });

  describe('File Versioning', () => {
    describe('createVersion', () => {
      it('should create a new version of existing file', async () => {
        const originalFileId = 'file-original';
        const newContent = Buffer.from('Updated content v2');

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              id: originalFileId,
              file_name: 'document.txt',
              version: 1,
              file_metadata: { category: 'report' }
            }
          }),
          post: jest.fn().mockResolvedValue({
            data: {
              id: 'file-v2',
              file_name: 'document.txt',
              version: 2,
              parent_version: originalFileId
            }
          })
        };

        const result = await fileStorageService.createVersion(originalFileId, newContent);

        expect(result).toBeDefined();
        expect(result.version).toBe(2);
        expect(result.parentVersion).toBe(originalFileId);
      });

      it('should preserve metadata in new version', async () => {
        const originalFileId = 'file-original';
        const originalMetadata = { category: 'financial', year: 2024 };

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              id: originalFileId,
              file_metadata: originalMetadata,
              version: 1
            }
          }),
          post: jest.fn().mockResolvedValue({
            data: {
              id: 'file-v2',
              version: 2,
              file_metadata: { ...originalMetadata, previousVersion: originalFileId }
            }
          })
        };

        const result = await fileStorageService.createVersion(
          originalFileId,
          Buffer.from('New content'),
          { preserveMetadata: true }
        );

        expect(result.metadata.category).toBe('financial');
        expect(result.metadata.previousVersion).toBe(originalFileId);
      });
    });

    describe('getVersionHistory', () => {
      it('should retrieve version history of a file', async () => {
        const fileId = 'file-latest';

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              versions: [
                { id: 'file-v1', version: 1, created_at: '2024-01-01T00:00:00Z' },
                { id: 'file-v2', version: 2, created_at: '2024-02-01T00:00:00Z' },
                { id: 'file-latest', version: 3, created_at: '2024-03-01T00:00:00Z' }
              ]
            }
          })
        };

        const result = await fileStorageService.getVersionHistory(fileId);

        expect(result).toBeDefined();
        expect(result.versions).toHaveLength(3);
        expect(result.versions[0].version).toBe(1);
        expect(result.currentVersion).toBe(3);
      });
    });

    describe('restoreVersion', () => {
      it('should restore a previous version of file', async () => {
        const fileId = 'file-latest';
        const versionToRestore = 1;

        zerodbService.client = {
          post: jest.fn().mockResolvedValue({
            data: {
              id: 'file-restored',
              version: 4,
              restored_from: versionToRestore,
              file_name: 'document.txt'
            }
          })
        };

        const result = await fileStorageService.restoreVersion(fileId, versionToRestore);

        expect(result).toBeDefined();
        expect(result.restoredFrom).toBe(versionToRestore);
        expect(result.version).toBe(4);
      });
    });
  });

  describe('File Deletion', () => {
    describe('deleteFile', () => {
      it('should delete a file from ZeroDB', async () => {
        const fileId = 'file-to-delete';

        zerodbService.client = {
          delete: jest.fn().mockResolvedValue({
            data: { deleted: true, id: fileId }
          })
        };

        const result = await fileStorageService.deleteFile(fileId);

        expect(result).toBeDefined();
        expect(result.deleted).toBe(true);
        expect(result.id).toBe(fileId);
      });

      it('should support soft delete option', async () => {
        const fileId = 'file-soft-delete';

        zerodbService.client = {
          patch: jest.fn().mockResolvedValue({
            data: {
              id: fileId,
              status: 'deleted',
              deleted_at: new Date().toISOString()
            }
          })
        };

        const result = await fileStorageService.deleteFile(fileId, { soft: true });

        expect(result.status).toBe('deleted');
        expect(result.deletedAt).toBeDefined();
      });
    });

    describe('deleteMultipleFiles', () => {
      it('should delete multiple files in batch', async () => {
        const fileIds = ['file-1', 'file-2', 'file-3'];

        zerodbService.client = {
          delete: jest.fn().mockResolvedValue({ data: { deleted: true } })
        };

        const result = await fileStorageService.deleteMultipleFiles(fileIds);

        expect(result.successful).toBe(3);
        expect(result.failed).toBe(0);
      });
    });
  });

  describe('Storage Usage Monitoring', () => {
    describe('getStorageUsage', () => {
      it('should retrieve storage usage statistics', async () => {
        const companyId = 'company-123';

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              total_bytes: 1073741824, // 1GB
              file_count: 150,
              by_content_type: {
                'application/pdf': { bytes: 536870912, count: 50 },
                'text/plain': { bytes: 268435456, count: 100 }
              }
            }
          })
        };

        const result = await fileStorageService.getStorageUsage(companyId);

        expect(result).toBeDefined();
        expect(result.totalBytes).toBe(1073741824);
        expect(result.fileCount).toBe(150);
        expect(result.byContentType).toBeDefined();
      });

      it('should calculate storage quota remaining', async () => {
        const companyId = 'company-456';
        const quotaLimit = 5 * 1024 * 1024 * 1024; // 5GB

        zerodbService.client = {
          get: jest.fn().mockResolvedValue({
            data: {
              total_bytes: 2 * 1024 * 1024 * 1024, // 2GB used
              quota_limit: quotaLimit
            }
          })
        };

        const result = await fileStorageService.getStorageUsage(companyId);

        expect(result.quotaRemaining).toBe(3 * 1024 * 1024 * 1024);
        expect(result.quotaUsedPercent).toBe(40);
      });
    });

    describe('listFiles', () => {
      it('should list files with pagination', async () => {
        zerodbService.listFiles = jest.fn().mockResolvedValue([
          { id: 'file-1', file_name: 'doc1.pdf' },
          { id: 'file-2', file_name: 'doc2.pdf' }
        ]);

        const result = await fileStorageService.listFiles({
          skip: 0,
          limit: 10
        });

        expect(result).toBeDefined();
        expect(result.files).toHaveLength(2);
        expect(zerodbService.listFiles).toHaveBeenCalledWith(0, 10);
      });

      it('should filter files by content type', async () => {
        zerodbService.listFiles = jest.fn().mockResolvedValue([
          { id: 'file-1', file_name: 'doc1.pdf', content_type: 'application/pdf' },
          { id: 'file-2', file_name: 'doc2.txt', content_type: 'text/plain' }
        ]);

        const result = await fileStorageService.listFiles({
          contentType: 'application/pdf'
        });

        expect(result.files.every(f => f.contentType === 'application/pdf')).toBe(true);
      });
    });
  });

  describe('File Validation', () => {
    describe('validateFile', () => {
      it('should validate file against allowed types', () => {
        const file = { name: 'document.pdf', size: 1024 };
        const rules = { allowedTypes: ['pdf', 'docx', 'txt'] };

        const result = fileStorageService.validateFile(file, rules);

        expect(result.valid).toBe(true);
      });

      it('should reject files exceeding size limit', () => {
        const file = { name: 'large.pdf', size: 100 * 1024 * 1024 };
        const rules = { maxSize: 50 * 1024 * 1024 };

        const result = fileStorageService.validateFile(file, rules);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('size');
      });

      it('should validate file name for malicious patterns', () => {
        const file = { name: '../../../etc/passwd', size: 100 };

        const result = fileStorageService.validateFile(file, {});

        expect(result.valid).toBe(false);
        expect(result.error).toContain('invalid');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout errors', async () => {
      zerodbService.client = {
        post: jest.fn().mockRejectedValue({ code: 'ECONNABORTED', message: 'Timeout' })
      };

      await expect(
        fileStorageService.uploadFile(Buffer.from('test'), 'test.txt', {})
      ).rejects.toThrow('Upload timeout');
    });

    it('should handle ZeroDB service unavailable', async () => {
      zerodbService.client = {
        get: jest.fn().mockRejectedValue({
          response: { status: 503, data: { message: 'Service unavailable' } }
        })
      };

      await expect(
        fileStorageService.downloadFile('file-123')
      ).rejects.toThrow('Service temporarily unavailable');
    });

    it('should handle authentication errors', async () => {
      zerodbService.client = {
        get: jest.fn().mockRejectedValue({
          response: { status: 401, data: { message: 'Unauthorized' } }
        })
      };

      await expect(
        fileStorageService.downloadFile('file-123')
      ).rejects.toThrow('Authentication required');
    });
  });
});
