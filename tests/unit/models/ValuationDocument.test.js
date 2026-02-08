/**
 * ValuationDocument Model Tests
 * Issue #326: Add ValuationDocument model for 409A report artifact tracking
 *
 * Tests for document artifact tracking, versioning, and access control.
 */

const ValuationDocument = require('../../../models/ValuationDocument');

// Mock the ZeroDB base model
jest.mock('../../../models/base/ZeroDBModel', () => ({
    createModel: jest.fn(() => {
        const mockData = [];

        return {
            create: jest.fn(async (data) => {
                const doc = { _id: `id_${Date.now()}_${Math.random()}`, ...data };
                mockData.push(doc);
                return doc;
            }),
            find: jest.fn(async (query = {}) => {
                return mockData.filter(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                });
            }),
            findOne: jest.fn(async (query = {}) => {
                return mockData.find(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                }) || null;
            }),
            findById: jest.fn(async (id) => {
                return mockData.find(doc => doc._id === id) || null;
            }),
            findOneAndUpdate: jest.fn(async (query, update) => {
                const doc = mockData.find(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (doc) {
                    Object.assign(doc, update);
                    return doc;
                }
                return null;
            }),
            updateOne: jest.fn(async (query, update) => {
                const doc = mockData.find(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (doc) {
                    if (update.$set) {
                        Object.assign(doc, update.$set);
                    } else {
                        Object.assign(doc, update);
                    }
                    return { modifiedCount: 1 };
                }
                return { modifiedCount: 0 };
            }),
            updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
            findByIdAndUpdate: jest.fn(async (id, update) => {
                const doc = mockData.find(d => d._id === id);
                if (doc) {
                    Object.assign(doc, update);
                    return doc;
                }
                return null;
            }),
            deleteOne: jest.fn(async (query) => {
                const index = mockData.findIndex(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (index >= 0) {
                    mockData.splice(index, 1);
                    return { deletedCount: 1 };
                }
                return { deletedCount: 0 };
            }),
            deleteMany: jest.fn(async () => ({ deletedCount: 0 })),
            findOneAndDelete: jest.fn(async (query) => {
                const index = mockData.findIndex(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (index >= 0) {
                    const [doc] = mockData.splice(index, 1);
                    return doc;
                }
                return null;
            }),
            findByIdAndDelete: jest.fn(async (id) => {
                const index = mockData.findIndex(d => d._id === id);
                if (index >= 0) {
                    const [doc] = mockData.splice(index, 1);
                    return doc;
                }
                return null;
            }),
            countDocuments: jest.fn(async (query = {}) => {
                return mockData.filter(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                }).length;
            }),
            exists: jest.fn(async (query) => {
                return mockData.some(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                });
            }),
            distinct: jest.fn(async () => []),
            aggregate: jest.fn(async () => []),
            _mockData: mockData,
            _clearMockData: () => mockData.length = 0
        };
    })
}));

// Helper for unique test data
let testCounter = 0;
const getUniqueData = (base = {}) => ({
    companyId: `company_${++testCounter}`,
    valuationId: `valuation_${testCounter}`,
    title: `Document ${testCounter}`,
    documentType: 'final_report',
    fileName: `report_${testCounter}.pdf`,
    ...base
});

describe('ValuationDocument Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Schema and Enums', () => {
        it('should export DOCUMENT_TYPES enum', () => {
            expect(ValuationDocument.DOCUMENT_TYPES).toEqual([
                'engagement_letter',
                'draft_report',
                'final_report',
                'management_representation',
                'board_presentation',
                'supporting_analysis',
                'comparable_company_data',
                'financial_projection',
                'option_pricing_model',
                'amendment',
                'other'
            ]);
        });

        it('should export DOCUMENT_STATUS enum', () => {
            expect(ValuationDocument.DOCUMENT_STATUS).toEqual([
                'draft',
                'under_review',
                'approved',
                'superseded',
                'archived'
            ]);
        });

        it('should export ACCESS_ACTIONS enum', () => {
            expect(ValuationDocument.ACCESS_ACTIONS).toEqual(['view', 'download']);
        });

        it('should export PERMISSIONS enum', () => {
            expect(ValuationDocument.PERMISSIONS).toEqual(['view', 'download']);
        });

        it('should have correct schema structure', () => {
            const schema = ValuationDocument.schema;
            expect(schema.documentId).toBeDefined();
            expect(schema.valuationId).toBeDefined();
            expect(schema.documentType).toBeDefined();
            expect(schema.version).toBeDefined();
            expect(schema.accessHistory).toBeDefined();
            expect(schema.retentionPeriodYears).toBeDefined();
        });
    });

    describe('create', () => {
        it('should create document with required fields', async () => {
            const data = getUniqueData();
            const doc = await ValuationDocument.create(data);

            expect(doc).toBeDefined();
            expect(doc.title).toBe(data.title);
            expect(doc.valuationId).toBe(data.valuationId);
            expect(doc.documentType).toBe('final_report');
        });

        it('should generate documentId if not provided', async () => {
            const data = getUniqueData();
            const doc = await ValuationDocument.create(data);

            expect(doc.documentId).toBeDefined();
            expect(doc.documentId).toMatch(/^valdoc_/);
        });

        it('should use provided documentId', async () => {
            const data = getUniqueData({ documentId: 'custom_doc_123' });
            const doc = await ValuationDocument.create(data);

            expect(doc.documentId).toBe('custom_doc_123');
        });

        it('should set default values', async () => {
            const data = getUniqueData();
            const doc = await ValuationDocument.create(data);

            expect(doc.version).toBe(1);
            expect(doc.isLatestVersion).toBe(true);
            expect(doc.confidential).toBe(true);
            expect(doc.status).toBe('draft');
            expect(doc.retentionPeriodYears).toBe(6);
            expect(doc.accessHistory).toEqual([]);
            expect(doc.sharedWith).toEqual([]);
        });

        it('should calculate retention expiration date', async () => {
            const data = getUniqueData();
            const doc = await ValuationDocument.create(data);

            expect(doc.retentionExpiresAt).toBeDefined();
            const expiresYear = new Date(doc.retentionExpiresAt).getFullYear();
            const currentYear = new Date().getFullYear();
            expect(expiresYear).toBe(currentYear + 6);
        });

        it('should throw error if companyId is missing', async () => {
            const data = {
                valuationId: 'val_1',
                title: 'Test',
                documentType: 'final_report',
                fileName: 'test.pdf'
            };

            await expect(ValuationDocument.create(data))
                .rejects.toThrow('Company ID is required');
        });

        it('should throw error if valuationId is missing', async () => {
            const data = {
                companyId: 'comp_1',
                title: 'Test',
                documentType: 'final_report',
                fileName: 'test.pdf'
            };

            await expect(ValuationDocument.create(data))
                .rejects.toThrow('Valuation ID is required');
        });

        it('should throw error if documentType is missing', async () => {
            const data = {
                companyId: 'comp_1',
                valuationId: 'val_1',
                title: 'Test',
                fileName: 'test.pdf'
            };

            await expect(ValuationDocument.create(data))
                .rejects.toThrow('Document type is required');
        });

        it('should throw error if title is missing', async () => {
            const data = {
                companyId: 'comp_1',
                valuationId: 'val_1',
                documentType: 'final_report',
                fileName: 'test.pdf'
            };

            await expect(ValuationDocument.create(data))
                .rejects.toThrow('Title is required');
        });

        it('should throw error if fileName is missing', async () => {
            const data = {
                companyId: 'comp_1',
                valuationId: 'val_1',
                documentType: 'final_report',
                title: 'Test'
            };

            await expect(ValuationDocument.create(data))
                .rejects.toThrow('File name is required');
        });

        it('should throw error for invalid document type', async () => {
            const data = getUniqueData({ documentType: 'invalid_type' });

            await expect(ValuationDocument.create(data))
                .rejects.toThrow(/Invalid document type/);
        });

        it('should throw error for invalid status', async () => {
            const data = getUniqueData({ status: 'invalid_status' });

            await expect(ValuationDocument.create(data))
                .rejects.toThrow(/Invalid status/);
        });

        it('should accept all valid document types', async () => {
            for (const type of ValuationDocument.DOCUMENT_TYPES) {
                const data = getUniqueData({ documentType: type });
                const doc = await ValuationDocument.create(data);
                expect(doc.documentType).toBe(type);
            }
        });
    });

    describe('findByDocumentId', () => {
        it('should find document by documentId', async () => {
            const data = getUniqueData({ documentId: 'find_test_1' });
            await ValuationDocument.create(data);

            const found = await ValuationDocument.findByDocumentId('find_test_1');
            expect(found).toBeDefined();
            expect(found.documentId).toBe('find_test_1');
        });

        it('should return null for non-existent document', async () => {
            const found = await ValuationDocument.findByDocumentId('non_existent');
            expect(found).toBeNull();
        });
    });

    describe('findByValuation', () => {
        it('should find all documents for a valuation', async () => {
            const valuationId = `valuation_find_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({ valuationId }));
            await ValuationDocument.create(getUniqueData({ valuationId }));
            await ValuationDocument.create(getUniqueData({ valuationId: 'other_val' }));

            const docs = await ValuationDocument.findByValuation(valuationId);
            expect(docs.length).toBe(2);
            expect(docs.every(d => d.valuationId === valuationId)).toBe(true);
        });
    });

    describe('findLatestByValuation', () => {
        it('should find only latest version documents', async () => {
            const valuationId = `valuation_latest_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({ valuationId, isLatestVersion: true }));
            await ValuationDocument.create(getUniqueData({ valuationId, isLatestVersion: false }));

            const docs = await ValuationDocument.findLatestByValuation(valuationId);
            expect(docs.length).toBe(1);
            expect(docs[0].isLatestVersion).toBe(true);
        });
    });

    describe('findByCompany', () => {
        it('should find all documents for a company', async () => {
            const companyId = `company_find_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({ companyId }));
            await ValuationDocument.create(getUniqueData({ companyId }));

            const docs = await ValuationDocument.findByCompany(companyId);
            expect(docs.length).toBe(2);
        });
    });

    describe('findByType', () => {
        it('should find documents by type', async () => {
            const valuationId = `valuation_type_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({ valuationId, documentType: 'final_report' }));
            await ValuationDocument.create(getUniqueData({ valuationId, documentType: 'draft_report' }));

            const docs = await ValuationDocument.findByType(valuationId, 'final_report');
            expect(docs.length).toBe(1);
            expect(docs[0].documentType).toBe('final_report');
        });
    });

    describe('findByStatus', () => {
        it('should find documents by status', async () => {
            const companyId = `company_status_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({ companyId, status: 'approved' }));
            await ValuationDocument.create(getUniqueData({ companyId, status: 'draft' }));

            const docs = await ValuationDocument.findByStatus(companyId, 'approved');
            expect(docs.length).toBe(1);
            expect(docs[0].status).toBe('approved');
        });
    });

    describe('getDocumentPackage', () => {
        it('should return document package summary', async () => {
            const valuationId = `valuation_package_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({
                valuationId,
                documentType: 'engagement_letter',
                isLatestVersion: true
            }));
            await ValuationDocument.create(getUniqueData({
                valuationId,
                documentType: 'final_report',
                isLatestVersion: true
            }));

            const pkg = await ValuationDocument.getDocumentPackage(valuationId);

            expect(pkg.valuationId).toBe(valuationId);
            expect(pkg.totalDocuments).toBe(2);
            expect(pkg.isComplete).toBe(true);
            expect(pkg.missingRequired).toEqual([]);
        });

        it('should identify missing required documents', async () => {
            const valuationId = `valuation_incomplete_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({
                valuationId,
                documentType: 'draft_report',
                isLatestVersion: true
            }));

            const pkg = await ValuationDocument.getDocumentPackage(valuationId);

            expect(pkg.isComplete).toBe(false);
            expect(pkg.missingRequired).toContain('engagement_letter');
            expect(pkg.missingRequired).toContain('final_report');
        });
    });

    describe('createVersion', () => {
        it('should create a new version of a document', async () => {
            const data = getUniqueData({ documentId: 'version_test_1' });
            await ValuationDocument.create(data);

            const newVersion = await ValuationDocument.createVersion('version_test_1', {
                title: 'Updated Report',
                fileName: 'report_v2.pdf'
            });

            expect(newVersion.version).toBe(2);
            expect(newVersion.previousVersionId).toBe('version_test_1');
            expect(newVersion.isLatestVersion).toBe(true);
        });

        it('should mark old version as not latest', async () => {
            const data = getUniqueData({ documentId: 'version_mark_test' });
            await ValuationDocument.create(data);

            await ValuationDocument.createVersion('version_mark_test', {
                title: 'V2',
                fileName: 'v2.pdf'
            });

            const oldDoc = await ValuationDocument.findByDocumentId('version_mark_test');
            expect(oldDoc.isLatestVersion).toBe(false);
        });

        it('should throw error for non-existent document', async () => {
            await expect(ValuationDocument.createVersion('non_existent', {}))
                .rejects.toThrow('Document not found');
        });
    });

    describe('getVersionHistory', () => {
        it('should return version history', async () => {
            const data = getUniqueData({ documentId: 'history_test_1' });
            await ValuationDocument.create(data);

            const v2 = await ValuationDocument.createVersion('history_test_1', {
                title: 'V2',
                fileName: 'v2.pdf'
            });

            // Get history starting from the latest version
            const history = await ValuationDocument.getVersionHistory(v2.documentId);
            expect(history.length).toBe(2);
            expect(history[0].version).toBe(2);
            expect(history[1].version).toBe(1);
        });

        it('should throw error for non-existent document', async () => {
            await expect(ValuationDocument.getVersionHistory('non_existent'))
                .rejects.toThrow('Document not found');
        });
    });

    describe('logAccess', () => {
        it('should log document access', async () => {
            const data = getUniqueData({ documentId: 'access_log_test' });
            await ValuationDocument.create(data);

            const updated = await ValuationDocument.logAccess('access_log_test', 'user_123', 'view');

            expect(updated.accessHistory.length).toBe(1);
            expect(updated.accessHistory[0].userId).toBe('user_123');
            expect(updated.accessHistory[0].action).toBe('view');
        });

        it('should throw error for non-existent document', async () => {
            await expect(ValuationDocument.logAccess('non_existent', 'user_1'))
                .rejects.toThrow('Document not found');
        });

        it('should throw error for invalid action', async () => {
            const data = getUniqueData({ documentId: 'invalid_action_test' });
            await ValuationDocument.create(data);

            await expect(ValuationDocument.logAccess('invalid_action_test', 'user_1', 'invalid'))
                .rejects.toThrow(/Invalid action/);
        });
    });

    describe('shareWithUser', () => {
        it('should share document with user', async () => {
            const data = getUniqueData({ documentId: 'share_test' });
            await ValuationDocument.create(data);

            const updated = await ValuationDocument.shareWithUser('share_test', 'user_456', 'download', 'admin');

            expect(updated.sharedWith.length).toBe(1);
            expect(updated.sharedWith[0].userId).toBe('user_456');
            expect(updated.sharedWith[0].permission).toBe('download');
            expect(updated.sharedWith[0].sharedBy).toBe('admin');
        });

        it('should update existing share', async () => {
            const data = getUniqueData({
                documentId: 'share_update_test',
                sharedWith: [{ userId: 'user_789', permission: 'view' }]
            });
            await ValuationDocument.create(data);

            const updated = await ValuationDocument.shareWithUser('share_update_test', 'user_789', 'download');

            expect(updated.sharedWith.length).toBe(1);
            expect(updated.sharedWith[0].permission).toBe('download');
        });

        it('should throw error for non-existent document', async () => {
            await expect(ValuationDocument.shareWithUser('non_existent', 'user_1'))
                .rejects.toThrow('Document not found');
        });

        it('should throw error for invalid permission', async () => {
            const data = getUniqueData({ documentId: 'invalid_perm_test' });
            await ValuationDocument.create(data);

            await expect(ValuationDocument.shareWithUser('invalid_perm_test', 'user_1', 'invalid'))
                .rejects.toThrow(/Invalid permission/);
        });
    });

    describe('revokeAccess', () => {
        it('should revoke user access', async () => {
            const data = getUniqueData({
                documentId: 'revoke_test',
                sharedWith: [{ userId: 'user_to_revoke', permission: 'view' }]
            });
            await ValuationDocument.create(data);

            const updated = await ValuationDocument.revokeAccess('revoke_test', 'user_to_revoke');

            expect(updated.sharedWith.length).toBe(0);
        });

        it('should throw error for non-existent document', async () => {
            await expect(ValuationDocument.revokeAccess('non_existent', 'user_1'))
                .rejects.toThrow('Document not found');
        });
    });

    describe('checkAccess', () => {
        it('should return true for document uploader', async () => {
            const data = getUniqueData({ documentId: 'check_uploader', uploadedBy: 'user_owner' });
            await ValuationDocument.create(data);

            const hasAccess = await ValuationDocument.checkAccess('check_uploader', 'user_owner');
            expect(hasAccess).toBe(true);
        });

        it('should return true for shared user with view permission', async () => {
            const data = getUniqueData({
                documentId: 'check_shared',
                sharedWith: [{ userId: 'user_shared', permission: 'view' }]
            });
            await ValuationDocument.create(data);

            const hasAccess = await ValuationDocument.checkAccess('check_shared', 'user_shared', 'view');
            expect(hasAccess).toBe(true);
        });

        it('should return false for non-shared user', async () => {
            const data = getUniqueData({ documentId: 'check_no_access' });
            await ValuationDocument.create(data);

            const hasAccess = await ValuationDocument.checkAccess('check_no_access', 'random_user');
            expect(hasAccess).toBe(false);
        });

        it('should return false for non-existent document', async () => {
            const hasAccess = await ValuationDocument.checkAccess('non_existent', 'user_1');
            expect(hasAccess).toBe(false);
        });
    });

    describe('updateStatus', () => {
        it('should update document status', async () => {
            const data = getUniqueData({ documentId: 'status_test' });
            await ValuationDocument.create(data);

            const updated = await ValuationDocument.updateStatus('status_test', 'approved', {
                approvedBy: 'admin_user'
            });

            expect(updated.status).toBe('approved');
            expect(updated.approvedBy).toBe('admin_user');
            expect(updated.approvedAt).toBeDefined();
        });

        it('should set reviewedBy for under_review status', async () => {
            const data = getUniqueData({ documentId: 'review_status_test' });
            await ValuationDocument.create(data);

            const updated = await ValuationDocument.updateStatus('review_status_test', 'under_review', {
                reviewedBy: 'reviewer_user'
            });

            expect(updated.reviewedBy).toBe('reviewer_user');
            expect(updated.reviewedAt).toBeDefined();
        });

        it('should throw error for non-existent document', async () => {
            await expect(ValuationDocument.updateStatus('non_existent', 'approved'))
                .rejects.toThrow('Document not found');
        });

        it('should throw error for invalid status', async () => {
            const data = getUniqueData({ documentId: 'invalid_status_update_test' });
            await ValuationDocument.create(data);

            await expect(ValuationDocument.updateStatus('invalid_status_update_test', 'invalid'))
                .rejects.toThrow(/Invalid status/);
        });
    });

    describe('archive', () => {
        it('should archive a document', async () => {
            const data = getUniqueData({ documentId: 'archive_test' });
            await ValuationDocument.create(data);

            const archived = await ValuationDocument.archive('archive_test');

            expect(archived.status).toBe('archived');
        });
    });

    describe('getAccessHistory', () => {
        it('should return sorted access history', async () => {
            const data = getUniqueData({
                documentId: 'access_history_test',
                accessHistory: [
                    { userId: 'user1', accessDate: new Date('2024-01-01'), action: 'view' },
                    { userId: 'user2', accessDate: new Date('2024-01-02'), action: 'download' }
                ]
            });
            await ValuationDocument.create(data);

            const history = await ValuationDocument.getAccessHistory('access_history_test');

            expect(history.length).toBe(2);
            expect(history[0].userId).toBe('user2'); // Most recent first
        });

        it('should throw error for non-existent document', async () => {
            await expect(ValuationDocument.getAccessHistory('non_existent'))
                .rejects.toThrow('Document not found');
        });
    });

    describe('findExpiringSoon', () => {
        it('should find documents expiring within threshold', async () => {
            const companyId = `company_expiring_${Date.now()}`;
            const expiringDate = new Date();
            expiringDate.setDate(expiringDate.getDate() + 30);

            await ValuationDocument.create(getUniqueData({
                companyId,
                retentionExpiresAt: expiringDate,
                status: 'approved'
            }));

            const expiring = await ValuationDocument.findExpiringSoon(companyId, 365);
            expect(expiring.length).toBe(1);
        });

        it('should exclude archived documents', async () => {
            const companyId = `company_archived_expiring_${Date.now()}`;
            const expiringDate = new Date();
            expiringDate.setDate(expiringDate.getDate() + 30);

            await ValuationDocument.create(getUniqueData({
                companyId,
                retentionExpiresAt: expiringDate,
                status: 'archived'
            }));

            const expiring = await ValuationDocument.findExpiringSoon(companyId, 365);
            expect(expiring.length).toBe(0);
        });
    });

    describe('search', () => {
        it('should search by title', async () => {
            const companyId = `company_search_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({
                companyId,
                title: '2024 Annual Valuation Report'
            }));
            await ValuationDocument.create(getUniqueData({
                companyId,
                title: 'Engagement Letter'
            }));

            const results = await ValuationDocument.search(companyId, 'valuation');
            expect(results.length).toBe(1);
            expect(results[0].title).toContain('Valuation');
        });

        it('should search by fileName', async () => {
            const companyId = `company_search_file_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({
                companyId,
                fileName: 'valuation_2024.pdf'
            }));

            const results = await ValuationDocument.search(companyId, 'valuation_2024');
            expect(results.length).toBe(1);
        });

        it('should be case insensitive', async () => {
            const companyId = `company_search_case_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({
                companyId,
                title: 'UPPERCASE TITLE'
            }));

            const results = await ValuationDocument.search(companyId, 'uppercase');
            expect(results.length).toBe(1);
        });
    });

    describe('getStatistics', () => {
        it('should return document statistics', async () => {
            const valuationId = `valuation_stats_${Date.now()}`;
            await ValuationDocument.create(getUniqueData({
                valuationId,
                documentType: 'final_report',
                status: 'approved',
                fileSize: 1024 * 1024,
                isLatestVersion: true
            }));
            await ValuationDocument.create(getUniqueData({
                valuationId,
                documentType: 'draft_report',
                status: 'draft',
                fileSize: 512 * 1024,
                isLatestVersion: true
            }));

            const stats = await ValuationDocument.getStatistics(valuationId);

            expect(stats.valuationId).toBe(valuationId);
            expect(stats.totalDocuments).toBe(2);
            expect(stats.byType.final_report).toBe(1);
            expect(stats.byType.draft_report).toBe(1);
            expect(stats.byStatus.approved).toBe(1);
            expect(stats.byStatus.draft).toBe(1);
            expect(stats.totalSizeBytes).toBe(1.5 * 1024 * 1024);
        });
    });
});
