/**
 * SPV Model Unit Tests
 * Tests real SPV model code paths by mocking ZeroDB service.
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
const SPV = require('../../../models/SPV');

describe('SPV Model', () => {
    const makeInsertResponse = (overrides = {}) => ({
        data: [{
            row_id: 'row-1',
            row_data: {
                _id: 'spv-id-1',
                SPVID: 'spv_abc',
                Name: 'Test SPV',
                Purpose: 'Investment vehicle',
                Status: 'draft',
                ComplianceStatus: 'Compliant',
                ParentCompanyID: 'company_1',
                ...overrides
            }
        }]
    });

    beforeEach(() => {
        jest.clearAllMocks();
        zerodbService.insertRow.mockResolvedValue(makeInsertResponse());
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1, matchedCount: 1 });
    });

    // -------------------------------------------------------------------------
    // Schema structure
    // -------------------------------------------------------------------------
    describe('schema structure', () => {
        it('exposes schema property', () => {
            expect(SPV.schema).toBeDefined();
        });

        it('has SPVID as required string', () => {
            expect(SPV.schema.SPVID.type).toBe('string');
            expect(SPV.schema.SPVID.required).toBe(true);
        });

        it('has Name as required string', () => {
            expect(SPV.schema.Name.type).toBe('string');
            expect(SPV.schema.Name.required).toBe(true);
        });

        it('has Purpose as required string', () => {
            expect(SPV.schema.Purpose.type).toBe('string');
            expect(SPV.schema.Purpose.required).toBe(true);
        });

        it('has CreationDate as required date', () => {
            expect(SPV.schema.CreationDate.type).toBe('date');
            expect(SPV.schema.CreationDate.required).toBe(true);
        });

        it('has Status as required string with enum', () => {
            expect(SPV.schema.Status.type).toBe('string');
            expect(SPV.schema.Status.required).toBe(true);
            expect(Array.isArray(SPV.schema.Status.enum)).toBe(true);
        });

        it('has ParentCompanyID as required string', () => {
            expect(SPV.schema.ParentCompanyID.type).toBe('string');
            expect(SPV.schema.ParentCompanyID.required).toBe(true);
        });

        it('has ComplianceStatus as required string with enum', () => {
            expect(SPV.schema.ComplianceStatus.type).toBe('string');
            expect(SPV.schema.ComplianceStatus.required).toBe(true);
            expect(Array.isArray(SPV.schema.ComplianceStatus.enum)).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // VALID_STATUSES enum
    // -------------------------------------------------------------------------
    describe('VALID_STATUSES', () => {
        const expectedStatuses = ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'];

        it('exposes VALID_STATUSES array', () => {
            expect(Array.isArray(SPV.VALID_STATUSES)).toBe(true);
        });

        it('has exactly 6 valid statuses', () => {
            expect(SPV.VALID_STATUSES).toHaveLength(6);
        });

        expectedStatuses.forEach(status => {
            it(`includes "${status}" in VALID_STATUSES`, () => {
                expect(SPV.VALID_STATUSES).toContain(status);
            });
        });
    });

    // -------------------------------------------------------------------------
    // VALID_COMPLIANCE_STATUSES enum
    // -------------------------------------------------------------------------
    describe('VALID_COMPLIANCE_STATUSES', () => {
        const expectedCompliance = ['Compliant', 'NonCompliant', 'PendingReview'];

        it('exposes VALID_COMPLIANCE_STATUSES array', () => {
            expect(Array.isArray(SPV.VALID_COMPLIANCE_STATUSES)).toBe(true);
        });

        expectedCompliance.forEach(status => {
            it(`includes "${status}" in VALID_COMPLIANCE_STATUSES`, () => {
                expect(SPV.VALID_COMPLIANCE_STATUSES).toContain(status);
            });
        });
    });

    // -------------------------------------------------------------------------
    // validators
    // -------------------------------------------------------------------------
    describe('validators', () => {
        it('isValidStatus returns true for each valid status', () => {
            SPV.VALID_STATUSES.forEach(s => {
                expect(SPV.validators.isValidStatus(s)).toBe(true);
            });
        });

        it('isValidStatus returns false for invalid status', () => {
            expect(SPV.validators.isValidStatus('terminated')).toBe(false);
            expect(SPV.validators.isValidStatus('')).toBe(false);
        });

        it('isValidComplianceStatus returns true for valid values', () => {
            SPV.VALID_COMPLIANCE_STATUSES.forEach(s => {
                expect(SPV.validators.isValidComplianceStatus(s)).toBe(true);
            });
        });

        it('isValidComplianceStatus returns false for invalid value', () => {
            expect(SPV.validators.isValidComplianceStatus('unknown')).toBe(false);
        });

        it('isValidDate returns true for a valid Date object', () => {
            expect(SPV.validators.isValidDate(new Date())).toBe(true);
        });

        it('isValidDate returns false for string dates', () => {
            expect(SPV.validators.isValidDate('2025-01-01')).toBe(false);
        });

        it('isValidDate returns false for null', () => {
            expect(SPV.validators.isValidDate(null)).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // Model identity
    // -------------------------------------------------------------------------
    describe('model identity', () => {
        it('has tableName "spvs"', () => {
            expect(SPV.tableName).toBe('spvs');
        });

        it('exposes CRUD methods', () => {
            ['create', 'find', 'findOne', 'updateOne', 'deleteOne'].forEach(method => {
                expect(typeof SPV[method]).toBe('function');
            });
        });
    });

    // -------------------------------------------------------------------------
    // getValidStatuses() and getValidComplianceStatuses()
    // -------------------------------------------------------------------------
    describe('getValidStatuses()', () => {
        it('returns an array equal to VALID_STATUSES', () => {
            expect(SPV.getValidStatuses()).toEqual(SPV.VALID_STATUSES);
        });

        it('returns a copy, not the same reference', () => {
            expect(SPV.getValidStatuses()).not.toBe(SPV.VALID_STATUSES);
        });
    });

    describe('getValidComplianceStatuses()', () => {
        it('returns an array equal to VALID_COMPLIANCE_STATUSES', () => {
            expect(SPV.getValidComplianceStatuses()).toEqual(SPV.VALID_COMPLIANCE_STATUSES);
        });

        it('returns a copy, not the same reference', () => {
            expect(SPV.getValidComplianceStatuses()).not.toBe(SPV.VALID_COMPLIANCE_STATUSES);
        });
    });

    // -------------------------------------------------------------------------
    // create() — validation and defaults
    // -------------------------------------------------------------------------
    describe('create()', () => {
        const minimalData = () => ({
            Name: 'Alpha SPV',
            Purpose: 'Series A investment',
            Status: 'draft',
            ComplianceStatus: 'Compliant',
            ParentCompanyID: 'company_1'
        });

        it('generates SPVID when not provided', async () => {
            await SPV.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.SPVID).toMatch(/^spv_/);
        });

        it('preserves provided SPVID', async () => {
            await SPV.create({ ...minimalData(), SPVID: 'spv_custom_001' });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.SPVID).toBe('spv_custom_001');
        });

        it('sets CreationDate when not provided', async () => {
            await SPV.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.CreationDate).toBeDefined();
        });

        it('preserves provided CreationDate', async () => {
            const date = '2025-01-15T00:00:00.000Z';
            await SPV.create({ ...minimalData(), CreationDate: date });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.CreationDate).toBe(date);
        });

        it('throws when Name is missing', async () => {
            const data = { Purpose: 'Test', Status: 'draft', ComplianceStatus: 'Compliant', ParentCompanyID: 'c1' };
            await expect(SPV.create(data)).rejects.toThrow('Name is required');
        });

        it('throws when Purpose is missing', async () => {
            const data = { Name: 'SPV', Status: 'draft', ComplianceStatus: 'Compliant', ParentCompanyID: 'c1' };
            await expect(SPV.create(data)).rejects.toThrow('Purpose is required');
        });

        it('throws when ParentCompanyID is missing', async () => {
            const data = { Name: 'SPV', Purpose: 'test', Status: 'active', ComplianceStatus: 'Compliant' };
            await expect(SPV.create(data)).rejects.toThrow('ParentCompanyID is required');
        });

        it('throws for invalid Status', async () => {
            await expect(SPV.create({ ...minimalData(), Status: 'terminated' })).rejects.toThrow('Invalid status');
        });

        it('throws for invalid ComplianceStatus', async () => {
            await expect(SPV.create({ ...minimalData(), ComplianceStatus: 'unknown' })).rejects.toThrow('Invalid compliance status');
        });

        it('successfully creates SPV for each valid status', async () => {
            for (const status of SPV.VALID_STATUSES) {
                jest.clearAllMocks();
                zerodbService.insertRow.mockResolvedValue(makeInsertResponse({ Status: status }));
                await expect(SPV.create({ ...minimalData(), Status: status })).resolves.toBeDefined();
            }
        });
    });

    // -------------------------------------------------------------------------
    // findBySPVID()
    // -------------------------------------------------------------------------
    describe('findBySPVID()', () => {
        it('returns the SPV when found', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { SPVID: 'spv_abc' } }]
            });
            const result = await SPV.findBySPVID('spv_abc');
            expect(result).toBeDefined();
            expect(zerodbService.queryTable).toHaveBeenCalled();
        });

        it('returns null for nonexistent SPVID', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            const result = await SPV.findBySPVID('nonexistent');
            expect(result).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // findByParentCompany()
    // -------------------------------------------------------------------------
    describe('findByParentCompany()', () => {
        it('queries with ParentCompanyID filter', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await SPV.findByParentCompany('company_x');
            expect(zerodbService.queryTable).toHaveBeenCalledWith(
                'spvs',
                expect.objectContaining({ filter: { ParentCompanyID: 'company_x' } })
            );
        });
    });

    // -------------------------------------------------------------------------
    // findByStatus()
    // -------------------------------------------------------------------------
    describe('findByStatus()', () => {
        it('returns results for valid status', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { SPVID: 's1', Status: 'draft' } }]
            });
            const results = await SPV.findByStatus('draft');
            expect(Array.isArray(results)).toBe(true);
        });

        it('returns empty array for invalid status without querying the database', async () => {
            const results = await SPV.findByStatus('not_a_status');
            expect(results).toEqual([]);
            expect(zerodbService.queryTable).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    // findByComplianceStatus()
    // -------------------------------------------------------------------------
    describe('findByComplianceStatus()', () => {
        it('returns results for valid compliance status', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            const results = await SPV.findByComplianceStatus('Compliant');
            expect(Array.isArray(results)).toBe(true);
        });

        it('returns empty array for invalid compliance status without querying', async () => {
            const results = await SPV.findByComplianceStatus('BadStatus');
            expect(results).toEqual([]);
            expect(zerodbService.queryTable).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    // findActive()
    // -------------------------------------------------------------------------
    describe('findActive()', () => {
        it('queries with Status: active filter', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await SPV.findActive();
            expect(zerodbService.queryTable).toHaveBeenCalledWith(
                'spvs',
                expect.objectContaining({ filter: { Status: 'active' } })
            );
        });
    });

    // -------------------------------------------------------------------------
    // updateStatus()
    // -------------------------------------------------------------------------
    describe('updateStatus()', () => {
        it('throws for invalid status without calling the database', async () => {
            await expect(SPV.updateStatus('spv_abc', 'invalid')).rejects.toThrow('Invalid status');
            expect(zerodbService.queryTable).not.toHaveBeenCalled();
        });

        it('calls update path for valid status', async () => {
            // Doc without __v skips version-check code path
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_data: { SPVID: 'spv_abc' } }]
            });
            zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
            const result = await SPV.updateStatus('spv_abc', 'wired');
            expect(result).toBeDefined();
        });
    });

    // -------------------------------------------------------------------------
    // updateComplianceStatus()
    // -------------------------------------------------------------------------
    describe('updateComplianceStatus()', () => {
        it('throws for invalid compliance status', async () => {
            await expect(
                SPV.updateComplianceStatus('spv_abc', 'invalid')
            ).rejects.toThrow('Invalid compliance status');
        });

        it('calls update path for valid compliance status', async () => {
            // Doc without __v skips version-check code path
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_data: { SPVID: 'spv_abc' } }]
            });
            zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
            const result = await SPV.updateComplianceStatus('spv_abc', 'NonCompliant');
            expect(result).toBeDefined();
        });
    });
});
