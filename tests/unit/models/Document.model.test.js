/**
 * Document Model Unit Tests
 * Tests real Document model code paths by mocking ZeroDB service.
 */

jest.mock('../../../services/zerodbService', () => ({
    insertRow: jest.fn(),
    queryTable: jest.fn(),
    updateRows: jest.fn(),
    deleteRows: jest.fn(),
    deleteRowById: jest.fn(),
    initialize: jest.fn(),
    projectId: 'mock-project-id'
}));

const zerodbService = require('../../../services/zerodbService');
const Document = require('../../../models/Document');

describe('Document Model', () => {
    const makeInsertResponse = (overrides = {}) => ({
        data: [{
            row_id: 'row-1',
            row_data: {
                _id: 'doc-id-1',
                documentId: 'doc_abc',
                name: 'Test Document',
                originalFilename: 'test.pdf',
                mimeType: 'application/pdf',
                size: 1024,
                category: 'legal',
                uploadedBy: 'user_1',
                ownerCompany: 'company_1',
                status: 'draft',
                version: 1,
                ...overrides
            }
        }]
    });

    beforeEach(() => {
        jest.clearAllMocks();
        zerodbService.insertRow.mockResolvedValue(makeInsertResponse());
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
    });

    // -------------------------------------------------------------------------
    // Schema structure
    // -------------------------------------------------------------------------
    describe('schema structure', () => {
        it('exposes schema property', () => {
            expect(Document.schema).toBeDefined();
        });

        it('has name as required string', () => {
            expect(Document.schema.name.type).toBe('string');
            expect(Document.schema.name.required).toBe(true);
        });

        it('has originalFilename as required string', () => {
            expect(Document.schema.originalFilename.type).toBe('string');
            expect(Document.schema.originalFilename.required).toBe(true);
        });

        it('has mimeType as required string', () => {
            expect(Document.schema.mimeType.type).toBe('string');
            expect(Document.schema.mimeType.required).toBe(true);
        });

        it('has size as required number with min 0', () => {
            expect(Document.schema.size.type).toBe('number');
            expect(Document.schema.size.required).toBe(true);
            expect(Document.schema.size.min).toBe(0);
        });

        it('has category as required string', () => {
            expect(Document.schema.category.type).toBe('string');
            expect(Document.schema.category.required).toBe(true);
        });

        it('has uploadedBy as required string', () => {
            expect(Document.schema.uploadedBy.type).toBe('string');
            expect(Document.schema.uploadedBy.required).toBe(true);
        });

        it('has ownerCompany as required string', () => {
            expect(Document.schema.ownerCompany.type).toBe('string');
            expect(Document.schema.ownerCompany.required).toBe(true);
        });

        it('has storageLocation defaulting to "local"', () => {
            expect(Document.schema.storageLocation.default).toBe('local');
        });

        it('has version defaulting to 1', () => {
            expect(Document.schema.version.default).toBe(1);
        });

        it('has isTemplate defaulting to false', () => {
            expect(Document.schema.isTemplate.default).toBe(false);
        });

        it('has isLocked defaulting to false', () => {
            expect(Document.schema.isLocked.default).toBe(false);
        });

        it('has folderId defaulting to null', () => {
            expect(Document.schema.folderId.default).toBeNull();
        });

        it('has content defaulting to empty string', () => {
            expect(Document.schema.content.default).toBe('');
        });
    });

    // -------------------------------------------------------------------------
    // Status enum
    // -------------------------------------------------------------------------
    describe('status enum', () => {
        it('exposes documentStatuses array', () => {
            expect(Array.isArray(Document.documentStatuses)).toBe(true);
        });

        ['draft', 'active', 'archived', 'deleted'].forEach(status => {
            it(`includes "${status}" in documentStatuses`, () => {
                expect(Document.documentStatuses).toContain(status);
            });
        });

        it('status schema field references documentStatuses', () => {
            expect(Document.schema.status.enum).toEqual(Document.documentStatuses);
        });

        it('status defaults to "draft"', () => {
            expect(Document.schema.status.default).toBe('draft');
        });
    });

    // -------------------------------------------------------------------------
    // Constant arrays
    // -------------------------------------------------------------------------
    describe('constant arrays', () => {
        it('exposes relationTypes including parent-of and amends', () => {
            expect(Array.isArray(Document.relationTypes)).toBe(true);
            expect(Document.relationTypes).toContain('parent-of');
            expect(Document.relationTypes).toContain('amends');
            expect(Document.relationTypes).toContain('related-to');
        });

        it('exposes entityTypes including user, role, company', () => {
            expect(Array.isArray(Document.entityTypes)).toBe(true);
            expect(Document.entityTypes).toContain('user');
            expect(Document.entityTypes).toContain('role');
            expect(Document.entityTypes).toContain('company');
        });
    });

    // -------------------------------------------------------------------------
    // Model identity
    // -------------------------------------------------------------------------
    describe('model identity', () => {
        it('has tableName "documents"', () => {
            expect(Document.tableName).toBe('documents');
        });

        it('exposes CRUD methods', () => {
            ['create', 'find', 'findOne', 'updateOne', 'deleteOne'].forEach(method => {
                expect(typeof Document[method]).toBe('function');
            });
        });
    });

    // -------------------------------------------------------------------------
    // create() — defaults and ID generation
    // -------------------------------------------------------------------------
    describe('create()', () => {
        const minimalData = () => ({
            name: 'Incorporation Agreement',
            originalFilename: 'incorp.pdf',
            mimeType: 'application/pdf',
            size: 2048,
            category: 'legal',
            uploadedBy: 'user_1',
            ownerCompany: 'company_1'
        });

        it('generates documentId when not provided', async () => {
            await Document.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.documentId).toBeDefined();
            expect(typeof inserted.documentId).toBe('string');
        });

        it('preserves provided documentId', async () => {
            await Document.create({ ...minimalData(), documentId: 'custom-doc-123' });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.documentId).toBe('custom-doc-123');
        });

        it('sets status to "draft" when not provided', async () => {
            await Document.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.status).toBe('draft');
        });

        it('preserves provided status', async () => {
            await Document.create({ ...minimalData(), status: 'active' });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.status).toBe('active');
        });

        it('sets version to 1 when not provided', async () => {
            await Document.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.version).toBe(1);
        });

        it('initializes versionHistory to empty array', async () => {
            await Document.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.versionHistory).toEqual([]);
        });

        it('initializes accessControl with four empty arrays', async () => {
            await Document.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.accessControl.viewAccess).toEqual([]);
            expect(inserted.accessControl.editAccess).toEqual([]);
            expect(inserted.accessControl.deleteAccess).toEqual([]);
            expect(inserted.accessControl.adminAccess).toEqual([]);
        });

        it('initializes relationships to empty array', async () => {
            await Document.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.relationships).toEqual([]);
        });

        it('initializes metadata to empty object', async () => {
            await Document.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.metadata).toEqual({});
        });

        it('initializes tags to empty array', async () => {
            await Document.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.tags).toEqual([]);
        });

        it('preserves provided tags', async () => {
            await Document.create({ ...minimalData(), tags: ['contract', 'legal'] });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.tags).toEqual(['contract', 'legal']);
        });
    });

    // -------------------------------------------------------------------------
    // findByDocumentId()
    // -------------------------------------------------------------------------
    describe('findByDocumentId()', () => {
        it('returns the document when found', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { documentId: 'doc_abc' } }]
            });
            const result = await Document.findByDocumentId('doc_abc');
            expect(result).toBeDefined();
            expect(zerodbService.queryTable).toHaveBeenCalled();
        });

        it('returns null when document not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            const result = await Document.findByDocumentId('nonexistent');
            expect(result).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // findByCategory()
    // -------------------------------------------------------------------------
    describe('findByCategory()', () => {
        it('queries documents by category', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await Document.findByCategory('legal');
            expect(zerodbService.queryTable).toHaveBeenCalledWith(
                'documents',
                expect.objectContaining({ filter: { category: 'legal' } })
            );
        });
    });

    // -------------------------------------------------------------------------
    // findByTags()
    // -------------------------------------------------------------------------
    describe('findByTags()', () => {
        it('returns documents matching any of the provided tags', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [
                    { row_id: 'r1', row_data: { documentId: 'd1', tags: ['contract', 'legal'] } },
                    { row_id: 'r2', row_data: { documentId: 'd2', tags: ['invoice'] } }
                ]
            });
            const results = await Document.findByTags(['contract']);
            expect(results).toHaveLength(1);
            expect(results[0].documentId).toBe('d1');
        });

        it('returns empty array when no documents match tags', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { documentId: 'd1', tags: ['other'] } }]
            });
            const results = await Document.findByTags(['contract']);
            expect(results).toHaveLength(0);
        });
    });

    // -------------------------------------------------------------------------
    // search()
    // -------------------------------------------------------------------------
    describe('search()', () => {
        it('returns documents matching name search text', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [
                    { row_id: 'r1', row_data: { documentId: 'd1', name: 'Incorporation Agreement' } },
                    { row_id: 'r2', row_data: { documentId: 'd2', name: 'Invoice 2025' } }
                ]
            });
            const results = await Document.search('incorp');
            expect(results).toHaveLength(1);
            expect(results[0].documentId).toBe('d1');
        });

        it('search is case-insensitive', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { documentId: 'd1', name: 'Legal Agreement', category: 'legal' } }]
            });
            const results = await Document.search('LEGAL');
            expect(results).toHaveLength(1);
        });

        it('returns empty array when nothing matches', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { documentId: 'd1', name: 'Unrelated Doc' } }]
            });
            const results = await Document.search('xyznotpresent');
            expect(results).toHaveLength(0);
        });
    });

    // -------------------------------------------------------------------------
    // findByMetadata()
    // -------------------------------------------------------------------------
    describe('findByMetadata()', () => {
        it('returns documents matching all provided metadata keys', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [
                    { row_id: 'r1', row_data: { documentId: 'd1', metadata: { year: 2025, type: 'tax' } } },
                    { row_id: 'r2', row_data: { documentId: 'd2', metadata: { year: 2024 } } }
                ]
            });
            const results = await Document.findByMetadata({ year: 2025, type: 'tax' });
            expect(results).toHaveLength(1);
            expect(results[0].documentId).toBe('d1');
        });

        it('returns empty array when metadata does not match', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { documentId: 'd1', metadata: {} } }]
            });
            const results = await Document.findByMetadata({ type: 'tax' });
            expect(results).toHaveLength(0);
        });
    });

    // -------------------------------------------------------------------------
    // hasAccess()
    // -------------------------------------------------------------------------
    describe('hasAccess()', () => {
        const buildDoc = (overrides = {}) => ({
            uploadedBy: 'owner-user',
            accessControl: {
                viewAccess: [],
                editAccess: [],
                deleteAccess: [],
                adminAccess: []
            },
            ...overrides
        });

        it('returns true for the document owner', () => {
            expect(Document.hasAccess(buildDoc(), 'owner-user', 'view')).toBe(true);
        });

        it('returns true when viewAccess contains "public"', () => {
            const doc = buildDoc({
                accessControl: { viewAccess: ['public'], editAccess: [], deleteAccess: [], adminAccess: [] }
            });
            expect(Document.hasAccess(doc, 'random-user', 'view')).toBe(true);
        });

        it('returns true when viewAccess contains "authenticated"', () => {
            const doc = buildDoc({
                accessControl: { viewAccess: ['authenticated'], editAccess: [], deleteAccess: [], adminAccess: [] }
            });
            expect(Document.hasAccess(doc, 'any-user', 'view')).toBe(true);
        });

        it('returns false when user is not in any access list', () => {
            expect(Document.hasAccess(buildDoc(), 'random-user', 'view')).toBe(false);
        });

        it('returns true when user is directly in edit access list', () => {
            const doc = buildDoc({
                accessControl: {
                    viewAccess: [],
                    editAccess: [{ entityType: 'user', entityId: 'editor-user' }],
                    deleteAccess: [],
                    adminAccess: []
                }
            });
            expect(Document.hasAccess(doc, 'editor-user', 'edit')).toBe(true);
        });

        it('returns true when user belongs to a team with access', () => {
            const doc = buildDoc({
                accessControl: {
                    viewAccess: [{ entityType: 'team', entityId: 'team-alpha' }],
                    editAccess: [], deleteAccess: [], adminAccess: []
                }
            });
            expect(Document.hasAccess(doc, 'user-x', 'view', ['team-alpha'])).toBe(true);
        });

        it('returns true when user has a role with access', () => {
            const doc = buildDoc({
                accessControl: {
                    viewAccess: [{ entityType: 'role', entityId: 'manager' }],
                    editAccess: [], deleteAccess: [], adminAccess: []
                }
            });
            expect(Document.hasAccess(doc, 'user-y', 'view', [], ['manager'])).toBe(true);
        });

        it('returns true for view access when user has admin access', () => {
            const doc = buildDoc({
                accessControl: {
                    viewAccess: [],
                    editAccess: [],
                    deleteAccess: [],
                    adminAccess: [{ entityType: 'user', entityId: 'power-user' }]
                }
            });
            expect(Document.hasAccess(doc, 'power-user', 'view')).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // addVersionHistory()
    // -------------------------------------------------------------------------
    describe('addVersionHistory()', () => {
        it('increments version by 1', () => {
            const result = Document.addVersionHistory({ version: 3, versionHistory: [] }, 'user_1', 'Edit');
            expect(result.version).toBe(4);
        });

        it('adds a history entry with correct fields', () => {
            const result = Document.addVersionHistory({ version: 2, versionHistory: [] }, 'user_1', 'Content update');
            expect(result.versionHistory).toHaveLength(1);
            expect(result.versionHistory[0].version).toBe(2);
            expect(result.versionHistory[0].changedBy).toBe('user_1');
            expect(result.versionHistory[0].changeDescription).toBe('Content update');
            expect(result.versionHistory[0].changedAt).toBeDefined();
        });

        it('uses default description "Document updated" when not provided', () => {
            const result = Document.addVersionHistory({ version: 1, versionHistory: [] }, 'user_1');
            expect(result.versionHistory[0].changeDescription).toBe('Document updated');
        });

        it('preserves existing version history entries', () => {
            const existingEntry = { version: 1, changedBy: 'user_0', changedAt: 'past', changeDescription: 'Initial' };
            const result = Document.addVersionHistory({ version: 2, versionHistory: [existingEntry] }, 'user_1', 'Edit');
            expect(result.versionHistory).toHaveLength(2);
            expect(result.versionHistory[0]).toEqual(existingEntry);
        });

        it('sets changedBy on the result object', () => {
            const result = Document.addVersionHistory({ version: 1, versionHistory: [] }, 'editor-99');
            expect(result.changedBy).toBe('editor-99');
        });
    });

    // -------------------------------------------------------------------------
    // findRelatedDocuments()
    // -------------------------------------------------------------------------
    describe('findRelatedDocuments()', () => {
        it('returns empty array when document has no relationships', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { documentId: 'doc-1', relationships: [] } }]
            });
            const results = await Document.findRelatedDocuments('doc-1');
            expect(results).toEqual([]);
        });

        it('returns empty array when document is not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            const results = await Document.findRelatedDocuments('nonexistent');
            expect(results).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // addRelationship()
    // -------------------------------------------------------------------------
    describe('addRelationship()', () => {
        it('throws when document is not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await expect(
                Document.addRelationship('nonexistent', 'other-doc', 'related-to')
            ).rejects.toThrow('Document not found');
        });

        it('calls updateOne to save the new relationship', async () => {
            // Doc without __v skips the version-check code path in updateOne
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_data: { documentId: 'doc-1', relationships: [] } }]
            });
            zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
            await Document.addRelationship('doc-1', 'doc-2', 'related-to', 'Reference');
            expect(zerodbService.updateRows).toHaveBeenCalled();
        });
    });
});
