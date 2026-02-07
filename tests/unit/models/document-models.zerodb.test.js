/**
 * Document Models ZeroDB Tests
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Tests for DocumentAccessModel, DocumentEmbeddingModel, documentModel, and SignatureRequest
 * after migration from Mongoose to ZeroDB.
 */

// Mock the zerodbService before requiring models
jest.mock('../../../services/zerodbService', () => {
    const mockData = {
        document_access: [],
        document_embeddings: [],
        documents: [],
        signature_requests: []
    };

    return {
        projectId: 'test-project',
        initialize: jest.fn().mockResolvedValue(true),
        insertRow: jest.fn().mockImplementation((tableName, doc) => {
            mockData[tableName] = mockData[tableName] || [];
            mockData[tableName].push(doc);
            return Promise.resolve({ data: [doc] });
        }),
        insertRows: jest.fn().mockImplementation((tableName, docs) => {
            mockData[tableName] = mockData[tableName] || [];
            mockData[tableName].push(...docs);
            return Promise.resolve({ data: docs });
        }),
        queryTable: jest.fn().mockImplementation((tableName, options = {}) => {
            const table = mockData[tableName] || [];
            let results = [...table];

            // Apply filter
            if (options.filter && Object.keys(options.filter).length > 0) {
                results = results.filter(doc => {
                    return Object.entries(options.filter).every(([key, value]) => {
                        if (value && typeof value === 'object' && value.$in) {
                            return value.$in.includes(doc[key]);
                        }
                        return doc[key] === value;
                    });
                });
            }

            // Apply pagination
            const skip = options.skip || 0;
            const limit = options.limit || 100;
            results = results.slice(skip, skip + limit);

            return Promise.resolve({ data: results, total: table.length });
        }),
        updateRows: jest.fn().mockImplementation((tableName, options) => {
            const table = mockData[tableName] || [];
            let modifiedCount = 0;

            table.forEach((doc, index) => {
                const matches = Object.entries(options.filter).every(([key, value]) => doc[key] === value);
                if (matches) {
                    const updateData = options.update.$set || options.update;
                    mockData[tableName][index] = { ...doc, ...updateData };
                    modifiedCount++;
                }
            });

            return Promise.resolve({ modifiedCount, matchedCount: modifiedCount });
        }),
        deleteRows: jest.fn().mockImplementation((tableName, options) => {
            const table = mockData[tableName] || [];
            const initialLength = table.length;

            mockData[tableName] = table.filter(doc => {
                return !Object.entries(options.filter).every(([key, value]) => doc[key] === value);
            });

            return Promise.resolve({ deletedCount: initialLength - mockData[tableName].length });
        }),
        // Expose mockData for test assertions
        _mockData: mockData,
        _clearMockData: () => {
            mockData.document_access = [];
            mockData.document_embeddings = [];
            mockData.documents = [];
            mockData.signature_requests = [];
        }
    };
});

const DocumentAccessModel = require('../../../models/DocumentAccessModel');
const DocumentEmbeddingModel = require('../../../models/DocumentEmbeddingModel');
const DocumentModel = require('../../../models/documentModel');
const SignatureRequestModel = require('../../../models/SignatureRequest');
const zerodbService = require('../../../services/zerodbService');

describe('Document Models ZeroDB Migration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        zerodbService._clearMockData();
    });

    describe('DocumentAccessModel', () => {
        const validAccessData = {
            accessId: 'access_test123',
            AccessLevel: 'Read',
            RelatedDocument: 'doc_123',
            User: 'user_456'
        };

        describe('create', () => {
            it('should create a valid document access record', async () => {
                const result = await DocumentAccessModel.create(validAccessData);

                expect(result).toBeDefined();
                expect(result._id).toBeDefined();
                expect(result.accessId).toBe(validAccessData.accessId);
                expect(result.AccessLevel).toBe('Read');
                expect(zerodbService.insertRow).toHaveBeenCalledWith(
                    'document_access',
                    expect.objectContaining(validAccessData)
                );
            });

            it('should reject invalid access level', async () => {
                await expect(DocumentAccessModel.create({
                    ...validAccessData,
                    AccessLevel: 'InvalidLevel'
                })).rejects.toThrow('AccessLevel must be one of: Read, Write, Admin');
            });

            it('should require accessId', async () => {
                await expect(DocumentAccessModel.create({
                    ...validAccessData,
                    accessId: undefined
                })).rejects.toThrow('accessId is required');
            });

            it('should require RelatedDocument', async () => {
                await expect(DocumentAccessModel.create({
                    ...validAccessData,
                    RelatedDocument: undefined
                })).rejects.toThrow('RelatedDocument is required');
            });

            it('should require User', async () => {
                await expect(DocumentAccessModel.create({
                    ...validAccessData,
                    User: undefined
                })).rejects.toThrow('User is required');
            });
        });

        describe('isValidAccessLevel', () => {
            it('should return true for valid access levels', () => {
                expect(DocumentAccessModel.isValidAccessLevel('Read')).toBe(true);
                expect(DocumentAccessModel.isValidAccessLevel('Write')).toBe(true);
                expect(DocumentAccessModel.isValidAccessLevel('Admin')).toBe(true);
            });

            it('should return false for invalid access levels', () => {
                expect(DocumentAccessModel.isValidAccessLevel('invalid')).toBe(false);
                expect(DocumentAccessModel.isValidAccessLevel('')).toBe(false);
            });
        });

        describe('findByDocument', () => {
            it('should find access records by document ID', async () => {
                await DocumentAccessModel.findByDocument('doc_123');

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'document_access',
                    expect.objectContaining({
                        filter: { RelatedDocument: 'doc_123' }
                    })
                );
            });
        });

        describe('findByUser', () => {
            it('should find access records by user ID', async () => {
                await DocumentAccessModel.findByUser('user_456');

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'document_access',
                    expect.objectContaining({
                        filter: { User: 'user_456' }
                    })
                );
            });
        });

        describe('hasAccess', () => {
            beforeEach(async () => {
                // Seed test data
                zerodbService._mockData.document_access.push({
                    _id: 'test_1',
                    accessId: 'access_1',
                    User: 'user_1',
                    RelatedDocument: 'doc_1',
                    AccessLevel: 'Admin'
                });
            });

            it('should return true when admin has any access', async () => {
                const hasReadAccess = await DocumentAccessModel.hasAccess('user_1', 'doc_1', 'Read');
                expect(hasReadAccess).toBe(true);
            });

            it('should return false when no access record exists', async () => {
                const hasAccess = await DocumentAccessModel.hasAccess('user_unknown', 'doc_1', 'Read');
                expect(hasAccess).toBe(false);
            });
        });
    });

    describe('DocumentEmbeddingModel', () => {
        const validEmbeddingData = {
            embeddingId: 'emb_test123',
            documentId: 'doc_123',
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            EmbeddingType: 'Type1'
        };

        describe('create', () => {
            it('should create a valid document embedding', async () => {
                const result = await DocumentEmbeddingModel.create(validEmbeddingData);

                expect(result).toBeDefined();
                expect(result._id).toBeDefined();
                expect(result.embeddingId).toBe(validEmbeddingData.embeddingId);
                expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
            });

            it('should reject empty embedding array', async () => {
                await expect(DocumentEmbeddingModel.create({
                    ...validEmbeddingData,
                    embedding: []
                })).rejects.toThrow('Embedding cannot be an empty array');
            });

            it('should reject non-numeric embedding values', async () => {
                await expect(DocumentEmbeddingModel.create({
                    ...validEmbeddingData,
                    embedding: ['a', 'b', 'c']
                })).rejects.toThrow('Embedding cannot be an empty array');
            });

            it('should reject invalid embedding type', async () => {
                await expect(DocumentEmbeddingModel.create({
                    ...validEmbeddingData,
                    EmbeddingType: 'InvalidType'
                })).rejects.toThrow('EmbeddingType must be one of: Type1, Type2, Type3');
            });
        });

        describe('isValidEmbedding', () => {
            it('should return true for valid embedding array', () => {
                expect(DocumentEmbeddingModel.isValidEmbedding([0.1, 0.2, 0.3])).toBe(true);
                expect(DocumentEmbeddingModel.isValidEmbedding([1, 2, 3])).toBe(true);
            });

            it('should return false for invalid embeddings', () => {
                expect(DocumentEmbeddingModel.isValidEmbedding([])).toBe(false);
                expect(DocumentEmbeddingModel.isValidEmbedding(['a', 'b'])).toBe(false);
                expect(DocumentEmbeddingModel.isValidEmbedding(null)).toBe(false);
            });
        });

        describe('cosineSimilarity', () => {
            it('should calculate cosine similarity correctly', () => {
                const vecA = [1, 0, 0];
                const vecB = [1, 0, 0];
                expect(DocumentEmbeddingModel.cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
            });

            it('should return 0 for orthogonal vectors', () => {
                const vecA = [1, 0];
                const vecB = [0, 1];
                expect(DocumentEmbeddingModel.cosineSimilarity(vecA, vecB)).toBeCloseTo(0);
            });

            it('should throw error for different dimension vectors', () => {
                const vecA = [1, 0, 0];
                const vecB = [1, 0];
                expect(() => DocumentEmbeddingModel.cosineSimilarity(vecA, vecB))
                    .toThrow('Vectors must have the same dimension');
            });
        });

        describe('findSimilar', () => {
            beforeEach(() => {
                zerodbService._mockData.document_embeddings = [
                    { _id: '1', embeddingId: 'e1', documentId: 'd1', embedding: [1, 0, 0], EmbeddingType: 'Type1' },
                    { _id: '2', embeddingId: 'e2', documentId: 'd2', embedding: [0.9, 0.1, 0], EmbeddingType: 'Type1' },
                    { _id: '3', embeddingId: 'e3', documentId: 'd3', embedding: [0, 1, 0], EmbeddingType: 'Type1' }
                ];
            });

            it('should find similar documents above threshold', async () => {
                const results = await DocumentEmbeddingModel.findSimilar([1, 0, 0], 'Type1', 10, 0.8);

                expect(results.length).toBeGreaterThanOrEqual(1);
                expect(results[0].similarity).toBeGreaterThanOrEqual(0.8);
            });
        });
    });

    describe('DocumentModel', () => {
        const validDocumentData = {
            documentId: 'doc_test123',
            name: 'Test Document',
            uploadedBy: 'user_123',
            path: '/documents/test.pdf',
            title: 'Test Title',
            content: 'Test content',
            DocumentType: 'Legal',
            FileType: 'PDF'
        };

        describe('create', () => {
            it('should create a valid document', async () => {
                const result = await DocumentModel.create(validDocumentData);

                expect(result).toBeDefined();
                expect(result._id).toBeDefined();
                expect(result.documentId).toBe(validDocumentData.documentId);
                expect(result.DocumentType).toBe('Legal');
            });

            it('should reject invalid document type', async () => {
                await expect(DocumentModel.create({
                    ...validDocumentData,
                    DocumentType: 'Invalid'
                })).rejects.toThrow('DocumentType must be one of: Legal, Financial, Other');
            });

            it('should reject invalid file type', async () => {
                await expect(DocumentModel.create({
                    ...validDocumentData,
                    FileType: 'JPG'
                })).rejects.toThrow('FileType must be one of: PDF, DOCX, TXT');
            });

            it('should require all mandatory fields', async () => {
                await expect(DocumentModel.create({ documentId: 'test' }))
                    .rejects.toThrow('name is required');
            });
        });

        describe('findByType', () => {
            it('should find documents by type', async () => {
                await DocumentModel.findByType('Legal');

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'documents',
                    expect.objectContaining({
                        filter: { DocumentType: 'Legal' }
                    })
                );
            });
        });

        describe('searchByTitle', () => {
            beforeEach(() => {
                zerodbService._mockData.documents = [
                    { _id: '1', documentId: 'd1', title: 'Important Contract' },
                    { _id: '2', documentId: 'd2', title: 'Budget Report' },
                    { _id: '3', documentId: 'd3', title: 'Contract Amendment' }
                ];
            });

            it('should find documents by title substring', async () => {
                const results = await DocumentModel.searchByTitle('Contract');

                expect(results).toHaveLength(2);
                expect(results.every(d => d.title.includes('Contract'))).toBe(true);
            });
        });

        describe('paginate', () => {
            it('should return paginated results', async () => {
                const result = await DocumentModel.paginate(1, 10, {});

                expect(result).toHaveProperty('documents');
                expect(result).toHaveProperty('pagination');
                expect(result.pagination).toHaveProperty('page', 1);
                expect(result.pagination).toHaveProperty('limit', 10);
            });
        });
    });

    describe('SignatureRequestModel', () => {
        const validSignatureRequest = {
            documentType: 'safe',
            companyId: 'company_123',
            title: 'Test Signature Request',
            signers: [
                { name: 'John Doe', email: 'john@test.com', role: 'investor' }
            ],
            createdBy: 'user_123'
        };

        describe('create', () => {
            it('should create a valid signature request', async () => {
                const result = await SignatureRequestModel.create(validSignatureRequest);

                expect(result).toBeDefined();
                expect(result._id).toBeDefined();
                expect(result.requestId).toMatch(/^sig_/);
                expect(result.status).toBe('draft');
                expect(result.auditTrail).toHaveLength(1);
                expect(result.auditTrail[0].event).toBe('created');
            });

            it('should apply default settings', async () => {
                const result = await SignatureRequestModel.create(validSignatureRequest);

                expect(result.settings).toBeDefined();
                expect(result.settings.reminderEnabled).toBe(true);
                expect(result.settings.expirationDays).toBe(30);
            });

            it('should reject invalid document type', async () => {
                await expect(SignatureRequestModel.create({
                    ...validSignatureRequest,
                    documentType: 'invalid'
                })).rejects.toThrow('documentType must be one of');
            });

            it('should reject invalid signer role', async () => {
                await expect(SignatureRequestModel.create({
                    ...validSignatureRequest,
                    signers: [{ name: 'Test', email: 'test@test.com', role: 'invalid_role' }]
                })).rejects.toThrow('Signer role must be one of');
            });

            it('should require signer name', async () => {
                await expect(SignatureRequestModel.create({
                    ...validSignatureRequest,
                    signers: [{ email: 'test@test.com', role: 'investor' }]
                })).rejects.toThrow('Signer name is required');
            });

            it('should require signer email', async () => {
                await expect(SignatureRequestModel.create({
                    ...validSignatureRequest,
                    signers: [{ name: 'Test', role: 'investor' }]
                })).rejects.toThrow('Signer email is required');
            });
        });

        describe('applyDefaults', () => {
            it('should generate requestId if not provided', () => {
                const data = SignatureRequestModel.applyDefaults({});
                expect(data.requestId).toMatch(/^sig_/);
            });

            it('should set default status to draft', () => {
                const data = SignatureRequestModel.applyDefaults({});
                expect(data.status).toBe('draft');
            });

            it('should set default signing order to parallel', () => {
                const data = SignatureRequestModel.applyDefaults({});
                expect(data.signingOrder).toBe('parallel');
            });
        });

        describe('isComplete', () => {
            it('should return true when all signers have signed', () => {
                const request = {
                    signers: [
                        { status: 'signed' },
                        { status: 'signed' }
                    ]
                };
                expect(SignatureRequestModel.isComplete(request)).toBe(true);
            });

            it('should return false when not all signers have signed', () => {
                const request = {
                    signers: [
                        { status: 'signed' },
                        { status: 'pending' }
                    ]
                };
                expect(SignatureRequestModel.isComplete(request)).toBe(false);
            });
        });

        describe('getPendingSigners', () => {
            it('should return only pending signers', () => {
                const request = {
                    signers: [
                        { email: 's1@test.com', status: 'signed' },
                        { email: 's2@test.com', status: 'pending' },
                        { email: 's3@test.com', status: 'viewed' }
                    ]
                };
                const pending = SignatureRequestModel.getPendingSigners(request);

                expect(pending).toHaveLength(2);
                expect(pending.map(s => s.email)).toContain('s2@test.com');
                expect(pending.map(s => s.email)).toContain('s3@test.com');
            });
        });

        describe('getProgress', () => {
            it('should calculate progress percentage correctly', () => {
                const request = {
                    signers: [
                        { status: 'signed' },
                        { status: 'pending' }
                    ]
                };
                expect(SignatureRequestModel.getProgress(request)).toBe(50);
            });

            it('should return 0 for empty signers', () => {
                const request = { signers: [] };
                expect(SignatureRequestModel.getProgress(request)).toBe(0);
            });

            it('should return 100 when all signed', () => {
                const request = {
                    signers: [
                        { status: 'signed' },
                        { status: 'signed' }
                    ]
                };
                expect(SignatureRequestModel.getProgress(request)).toBe(100);
            });
        });

        describe('addAuditEvent', () => {
            it('should add audit event to request', () => {
                const request = { auditTrail: [] };
                SignatureRequestModel.addAuditEvent(request, 'sent', { userId: 'user_1' });

                expect(request.auditTrail).toHaveLength(1);
                expect(request.auditTrail[0].event).toBe('sent');
                expect(request.auditTrail[0].userId).toBe('user_1');
            });

            it('should reject invalid audit event', () => {
                const request = { auditTrail: [] };
                expect(() => SignatureRequestModel.addAuditEvent(request, 'invalid_event'))
                    .toThrow('Invalid audit event');
            });
        });

        describe('send', () => {
            beforeEach(() => {
                zerodbService._mockData.signature_requests = [{
                    _id: 'test_1',
                    requestId: 'sig_test123',
                    status: 'draft',
                    signers: [{ email: 'test@test.com', status: 'pending' }],
                    settings: { expirationDays: 30 },
                    auditTrail: []
                }];
            });

            it('should send a draft request', async () => {
                const result = await SignatureRequestModel.send('sig_test123', 'user_1');

                expect(zerodbService.updateRows).toHaveBeenCalled();
            });

            it('should reject sending non-draft request', async () => {
                zerodbService._mockData.signature_requests[0].status = 'sent';

                await expect(SignatureRequestModel.send('sig_test123', 'user_1'))
                    .rejects.toThrow('Can only send requests in draft status');
            });
        });

        describe('recordSignature', () => {
            beforeEach(() => {
                zerodbService._mockData.signature_requests = [{
                    _id: 'test_1',
                    requestId: 'sig_test123',
                    status: 'sent',
                    signers: [
                        { email: 'test@test.com', status: 'sent' }
                    ],
                    auditTrail: []
                }];
            });

            it('should record signature', async () => {
                await SignatureRequestModel.recordSignature(
                    'sig_test123',
                    'test@test.com',
                    { signature: 'data' },
                    '127.0.0.1',
                    'Mozilla'
                );

                expect(zerodbService.updateRows).toHaveBeenCalled();
            });

            it('should reject if already signed', async () => {
                zerodbService._mockData.signature_requests[0].signers[0].status = 'signed';

                await expect(SignatureRequestModel.recordSignature(
                    'sig_test123',
                    'test@test.com',
                    { signature: 'data' },
                    '127.0.0.1',
                    'Mozilla'
                )).rejects.toThrow('Document already signed by this signer');
            });

            it('should reject unknown signer', async () => {
                await expect(SignatureRequestModel.recordSignature(
                    'sig_test123',
                    'unknown@test.com',
                    { signature: 'data' },
                    '127.0.0.1',
                    'Mozilla'
                )).rejects.toThrow('Signer not found');
            });
        });

        describe('cancel', () => {
            beforeEach(() => {
                zerodbService._mockData.signature_requests = [{
                    _id: 'test_1',
                    requestId: 'sig_test123',
                    status: 'sent',
                    auditTrail: []
                }];
            });

            it('should cancel a pending request', async () => {
                await SignatureRequestModel.cancel('sig_test123', 'user_1', 'No longer needed');

                expect(zerodbService.updateRows).toHaveBeenCalled();
            });

            it('should reject cancelling completed request', async () => {
                zerodbService._mockData.signature_requests[0].status = 'completed';

                await expect(SignatureRequestModel.cancel('sig_test123', 'user_1', 'reason'))
                    .rejects.toThrow('Cannot cancel request in completed status');
            });
        });

        describe('findByCompany', () => {
            it('should find requests by company ID', async () => {
                await SignatureRequestModel.findByCompany('company_123');

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'signature_requests',
                    expect.objectContaining({
                        filter: { companyId: 'company_123' }
                    })
                );
            });

            it('should filter by status when provided', async () => {
                await SignatureRequestModel.findByCompany('company_123', 'sent');

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'signature_requests',
                    expect.objectContaining({
                        filter: { companyId: 'company_123', status: 'sent' }
                    })
                );
            });
        });

        describe('findExpired', () => {
            beforeEach(() => {
                const pastDate = new Date(Date.now() - 86400000).toISOString();
                const futureDate = new Date(Date.now() + 86400000).toISOString();

                zerodbService._mockData.signature_requests = [
                    { _id: '1', requestId: 'r1', status: 'sent', expiresAt: pastDate },
                    { _id: '2', requestId: 'r2', status: 'sent', expiresAt: futureDate }
                ];
            });

            it('should find expired requests', async () => {
                const expired = await SignatureRequestModel.findExpired();

                expect(expired).toHaveLength(1);
                expect(expired[0].requestId).toBe('r1');
            });
        });
    });

    describe('Schema Compatibility', () => {
        it('DocumentAccessModel should have schema property', () => {
            expect(DocumentAccessModel.schema).toBeDefined();
            expect(DocumentAccessModel.schema.accessId).toBeDefined();
            expect(DocumentAccessModel.schema.AccessLevel).toBeDefined();
        });

        it('DocumentEmbeddingModel should have schema property', () => {
            expect(DocumentEmbeddingModel.schema).toBeDefined();
            expect(DocumentEmbeddingModel.schema.embeddingId).toBeDefined();
            expect(DocumentEmbeddingModel.schema.embedding).toBeDefined();
        });

        it('DocumentModel should have schema property', () => {
            expect(DocumentModel.schema).toBeDefined();
            expect(DocumentModel.schema.documentId).toBeDefined();
            expect(DocumentModel.schema.DocumentType).toBeDefined();
        });

        it('SignatureRequestModel should have schema property', () => {
            expect(SignatureRequestModel.schema).toBeDefined();
            expect(SignatureRequestModel.schema.requestId).toBeDefined();
            expect(SignatureRequestModel.schema.signers).toBeDefined();
        });
    });

    describe('Base Model Methods', () => {
        describe('find', () => {
            it('should call queryTable with filter', async () => {
                await DocumentModel.find({ DocumentType: 'Legal' });

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'documents',
                    expect.objectContaining({
                        filter: { DocumentType: 'Legal' }
                    })
                );
            });
        });

        describe('updateOne', () => {
            it('should call updateRows with filter and update data', async () => {
                // Insert a document first so findOne can locate it
                zerodbService._mockData.documents.push({ _id: 'doc-1', documentId: 'test', title: 'Old Title' });

                await DocumentModel.updateOne(
                    { documentId: 'test' },
                    { $set: { title: 'Updated Title' } }
                );

                // updateOne calls findOne first, then uses updateRows fallback path
                expect(zerodbService.queryTable).toHaveBeenCalled();
                expect(zerodbService.updateRows).toHaveBeenCalledWith(
                    'documents',
                    expect.objectContaining({
                        filter: { documentId: 'test' }
                    })
                );
            });
        });

        describe('deleteMany', () => {
            it('should call deleteRows with filter', async () => {
                // Insert a document first so findOne/deleteOne can locate it
                zerodbService._mockData.documents.push({ _id: 'doc-2', DocumentType: 'Other', title: 'To Delete' });

                await DocumentModel.deleteMany({ DocumentType: 'Other' });

                // deleteMany calls deleteOne which calls findOne first, then deleteRows
                expect(zerodbService.queryTable).toHaveBeenCalled();
                expect(zerodbService.deleteRows).toHaveBeenCalledWith(
                    'documents',
                    { filter: { DocumentType: 'Other' } }
                );
            });
        });
    });
});
