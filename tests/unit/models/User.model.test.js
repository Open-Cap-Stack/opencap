/**
 * User Model Unit Tests
 * Tests the real User model code paths by mocking ZeroDB service.
 *
 * Note: jest.mock is hoisted before any require(). We require() zerodbService
 * after the mock is set up so we can control return values per-test.
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

// Settings is required lazily inside User.create — mock before User is required
jest.mock('../../../models/Settings', () => ({
    createUserSettings: jest.fn().mockResolvedValue(true)
}), { virtual: true });

const zerodbService = require('../../../services/zerodbService');
const User = require('../../../models/User');

describe('User Model', () => {
    const makeInsertResponse = (overrides = {}) => ({
        data: [{
            row_id: 'row-1',
            row_data: {
                _id: 'user-id-1',
                userId: 'user_abc',
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane@example.com',
                role: 'admin',
                status: 'pending',
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
            expect(User.schema).toBeDefined();
            expect(typeof User.schema).toBe('object');
        });

        it('has userId field as required string', () => {
            expect(User.schema.userId.type).toBe('string');
            expect(User.schema.userId.required).toBe(true);
        });

        it('has firstName field as required string', () => {
            expect(User.schema.firstName.type).toBe('string');
            expect(User.schema.firstName.required).toBe(true);
        });

        it('has lastName field as required string', () => {
            expect(User.schema.lastName.type).toBe('string');
            expect(User.schema.lastName.required).toBe(true);
        });

        it('has email field as required string', () => {
            expect(User.schema.email.type).toBe('string');
            expect(User.schema.email.required).toBe(true);
        });

        it('has password field as required string', () => {
            expect(User.schema.password.type).toBe('string');
            expect(User.schema.password.required).toBe(true);
        });

        it('has displayName as optional string', () => {
            expect(User.schema.displayName.type).toBe('string');
            expect(User.schema.displayName.required).toBeUndefined();
        });

        it('has permissions as array with empty default', () => {
            expect(User.schema.permissions.type).toBe('array');
            expect(User.schema.permissions.default).toEqual([]);
        });

        it('has companyId with null default', () => {
            expect(User.schema.companyId.default).toBeNull();
        });

        it('has lastLogin with null default', () => {
            expect(User.schema.lastLogin.default).toBeNull();
        });

        it('has passwordResetToken with null default', () => {
            expect(User.schema.passwordResetToken.default).toBeNull();
        });

        it('has deletedAt with null default', () => {
            expect(User.schema.deletedAt.default).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // Role enum
    // -------------------------------------------------------------------------
    describe('role enum', () => {
        const expectedRoles = ['admin', 'founder', 'investor', 'manager', 'user', 'client', 'accountant'];

        it('has role field with enum array', () => {
            expect(Array.isArray(User.schema.role.enum)).toBe(true);
        });

        it('has exactly 7 role values (includes accountant)', () => {
            expect(User.schema.role.enum.length).toBe(7);
        });

        expectedRoles.forEach(role => {
            it(`includes "${role}" in role enum`, () => {
                expect(User.schema.role.enum).toContain(role);
            });
        });

        it('does not include unknown roles', () => {
            expect(User.schema.role.enum).not.toContain('superadmin');
            expect(User.schema.role.enum).not.toContain('guest');
        });

        it('marks role as required', () => {
            expect(User.schema.role.required).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // Status enum and default
    // -------------------------------------------------------------------------
    describe('status enum', () => {
        const expectedStatuses = ['active', 'pending', 'inactive', 'suspended'];

        it('has status field with enum array', () => {
            expect(Array.isArray(User.schema.status.enum)).toBe(true);
        });

        expectedStatuses.forEach(status => {
            it(`includes "${status}" in status enum`, () => {
                expect(User.schema.status.enum).toContain(status);
            });
        });

        it('defaults status to "pending"', () => {
            expect(User.schema.status.default).toBe('pending');
        });
    });

    // -------------------------------------------------------------------------
    // Model identity
    // -------------------------------------------------------------------------
    describe('model identity', () => {
        it('has tableName "users"', () => {
            expect(User.tableName).toBe('users');
        });

        it('exposes CRUD methods', () => {
            ['create', 'find', 'findOne', 'findById', 'updateOne', 'deleteOne'].forEach(method => {
                expect(typeof User[method]).toBe('function');
            });
        });
    });

    // -------------------------------------------------------------------------
    // create() — business logic (inspect data sent to insertRow)
    // -------------------------------------------------------------------------
    describe('create()', () => {
        it('generates userId when not provided', async () => {
            await User.create({
                firstName: 'Jane', lastName: 'Doe',
                email: 'jane@example.com', password: 'plain123', role: 'user'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.userId).toMatch(/^user_/);
        });

        it('preserves provided userId', async () => {
            await User.create({
                userId: 'user_custom_123',
                firstName: 'Jane', lastName: 'Doe',
                email: 'jane@example.com', password: 'plain123', role: 'user'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.userId).toBe('user_custom_123');
        });

        it('builds displayName from firstName + lastName when missing', async () => {
            await User.create({
                firstName: 'Jane', lastName: 'Doe',
                email: 'jane@example.com', password: 'plain123', role: 'user'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.displayName).toBe('Jane Doe');
        });

        it('preserves provided displayName', async () => {
            await User.create({
                firstName: 'Jane', lastName: 'Doe', displayName: 'JD',
                email: 'jane@example.com', password: 'plain123', role: 'user'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.displayName).toBe('JD');
        });

        it('sets status to pending when not provided', async () => {
            await User.create({
                firstName: 'Jane', lastName: 'Doe',
                email: 'jane@example.com', password: 'plain123', role: 'investor'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.status).toBe('pending');
        });

        it('hashes plaintext password (not already hashed)', async () => {
            await User.create({
                firstName: 'Jane', lastName: 'Doe',
                email: 'jane@example.com', password: 'plaintext123', role: 'user'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.password).toMatch(/^\$2/);
        });

        it('does not re-hash an already-hashed password', async () => {
            const alreadyHashed = '$2b$10$examplehashvalue12345678901234567890123456789';
            await User.create({
                firstName: 'Jane', lastName: 'Doe',
                email: 'jane@example.com', password: alreadyHashed, role: 'user'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.password).toBe(alreadyHashed);
        });

        it('assigns admin:all permission for admin role', async () => {
            await User.create({
                firstName: 'Admin', lastName: 'User',
                email: 'admin@example.com', password: 'plain123', role: 'admin'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.permissions).toContain('admin:all');
            expect(inserted.permissions).toContain('delete:users');
        });

        it('assigns read-only equity permission for investor role', async () => {
            await User.create({
                firstName: 'Inv', lastName: 'Est',
                email: 'inv@example.com', password: 'plain123', role: 'investor'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.permissions).toContain('read:equity');
            expect(inserted.permissions).not.toContain('write:equity');
        });

        it('assigns sign:valuations permission for accountant role', async () => {
            await User.create({
                firstName: 'Acc', lastName: 'Ount',
                email: 'acc@example.com', password: 'plain123', role: 'accountant'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.permissions).toContain('sign:valuations');
            expect(inserted.permissions).toContain('write:valuations');
        });

        it('sets default profile structure when not provided', async () => {
            await User.create({
                firstName: 'Jane', lastName: 'Doe',
                email: 'jane@example.com', password: 'plain123', role: 'user'
            });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.profile).toBeDefined();
            expect(inserted.profile.bio).toBe('');
            expect(inserted.profile.avatar).toBeNull();
            expect(inserted.profile.address).toBeDefined();
            expect(inserted.profile.address.street).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // findByEmail()
    // -------------------------------------------------------------------------
    describe('findByEmail()', () => {
        it('calls queryTable and returns the user when found', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { email: 'jane@example.com', userId: 'u1' } }]
            });
            const result = await User.findByEmail('jane@example.com');
            expect(zerodbService.queryTable).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('returns null when user not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            const result = await User.findByEmail('nobody@example.com');
            expect(result).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // findByUserId()
    // -------------------------------------------------------------------------
    describe('findByUserId()', () => {
        it('returns user when found', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { userId: 'user_abc' } }]
            });
            const result = await User.findByUserId('user_abc');
            expect(result).toBeDefined();
            expect(zerodbService.queryTable).toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    // findByCompany()
    // -------------------------------------------------------------------------
    describe('findByCompany()', () => {
        it('queries with companyId filter', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await User.findByCompany('company-123');
            expect(zerodbService.queryTable).toHaveBeenCalledWith(
                'users',
                expect.objectContaining({ filter: { companyId: 'company-123' } })
            );
        });
    });

    // -------------------------------------------------------------------------
    // toJSON()
    // -------------------------------------------------------------------------
    describe('toJSON()', () => {
        it('removes password', () => {
            const result = User.toJSON({ userId: 'u1', email: 'a@b.com', password: 'secret', role: 'user' });
            expect(result.password).toBeUndefined();
            expect(result.email).toBe('a@b.com');
        });

        it('removes passwordResetToken and passwordResetExpires', () => {
            const result = User.toJSON({
                userId: 'u1', email: 'a@b.com', password: 'secret',
                passwordResetToken: 'tok123', passwordResetExpires: new Date()
            });
            expect(result.passwordResetToken).toBeUndefined();
            expect(result.passwordResetExpires).toBeUndefined();
        });

        it('returns null when user is null', () => {
            expect(User.toJSON(null)).toBeNull();
        });

        it('does not mutate the original user object', () => {
            const user = { userId: 'u1', password: 'secret', email: 'a@b.com' };
            User.toJSON(user);
            expect(user.password).toBe('secret');
        });
    });

    // -------------------------------------------------------------------------
    // comparePassword()
    // -------------------------------------------------------------------------
    describe('comparePassword()', () => {
        it('returns false when plaintext is null', async () => {
            expect(await User.comparePassword(null, '$2b$10$hash')).toBe(false);
        });

        it('returns false when hashedPassword is null', async () => {
            expect(await User.comparePassword('plain', null)).toBe(false);
        });

        it('returns true for matching password', async () => {
            const hashed = await User.hashPassword('correctpassword');
            expect(await User.comparePassword('correctpassword', hashed)).toBe(true);
        });

        it('returns false for wrong password', async () => {
            const hashed = await User.hashPassword('correctpassword');
            expect(await User.comparePassword('wrongpassword', hashed)).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // hashPassword()
    // -------------------------------------------------------------------------
    describe('hashPassword()', () => {
        it('produces a bcrypt hash starting with $2', async () => {
            const hash = await User.hashPassword('mypassword');
            expect(hash).toMatch(/^\$2/);
        });

        it('produces different hashes for the same input due to salt', async () => {
            const hash1 = await User.hashPassword('samepassword');
            const hash2 = await User.hashPassword('samepassword');
            expect(hash1).not.toBe(hash2);
        });
    });

    // -------------------------------------------------------------------------
    // hasPermission()
    // -------------------------------------------------------------------------
    describe('hasPermission()', () => {
        it('returns false for null user', () => {
            expect(User.hasPermission(null, 'read:users')).toBe(false);
        });

        it('returns false when user has no permissions array', () => {
            expect(User.hasPermission({ role: 'user' }, 'read:users')).toBe(false);
        });

        it('returns true for admin:all regardless of specific permission', () => {
            expect(User.hasPermission({ permissions: ['admin:all'] }, 'delete:everything')).toBe(true);
        });

        it('returns true when permission is in the list', () => {
            expect(User.hasPermission({ permissions: ['read:users', 'write:companies'] }, 'read:users')).toBe(true);
        });

        it('returns false when permission is not in the list', () => {
            expect(User.hasPermission({ permissions: ['read:users'] }, 'delete:users')).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // getPermissionsForRole()
    // -------------------------------------------------------------------------
    describe('getPermissionsForRole()', () => {
        it('returns permissions including admin:all for admin role', () => {
            const perms = User.getPermissionsForRole('admin');
            expect(Array.isArray(perms)).toBe(true);
            expect(perms).toContain('admin:all');
        });

        it('returns sign:valuations for accountant role', () => {
            const perms = User.getPermissionsForRole('accountant');
            expect(perms).toContain('sign:valuations');
            expect(perms).toContain('read:compliance');
        });

        it('returns limited permissions for client role', () => {
            const perms = User.getPermissionsForRole('client');
            expect(perms).toContain('read:reports');
            expect(perms).not.toContain('write:reports');
        });

        it('returns empty array for unknown role', () => {
            expect(User.getPermissionsForRole('unknown_role')).toEqual([]);
        });
    });

    // -------------------------------------------------------------------------
    // updateLastLogin()
    // -------------------------------------------------------------------------
    describe('updateLastLogin()', () => {
        it('performs an update operation for the given userId', async () => {
            // Doc without row_id and without __v so version-check path is skipped
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_data: { userId: 'user_abc' } }]
            });
            zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
            const result = await User.updateLastLogin('user_abc');
            expect(result).toBeDefined();
        });
    });
});
