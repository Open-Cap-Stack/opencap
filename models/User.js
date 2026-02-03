/**
 * User Model
 * Feature: OCDI-102: Create User data model
 * Updated: OCAE-302: Implement role-based access control
 * Migrated: ZeroDB Migration - Issue #175
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const userSchema = {
    userId: { type: 'string', required: true, unique: true },
    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    displayName: { type: 'string' },
    email: { type: 'string', required: true, unique: true },
    password: { type: 'string', required: true },
    role: {
        type: 'string',
        required: true,
        enum: ['admin', 'founder', 'investor', 'manager', 'user', 'client']
    },
    permissions: { type: 'array', default: [] },
    status: {
        type: 'string',
        default: 'pending',
        enum: ['active', 'pending', 'inactive', 'suspended']
    },
    companyId: { type: 'string', default: null },
    profile: {
        type: 'object',
        default: {
            bio: '',
            avatar: null,
            phoneNumber: null,
            address: {
                street: null,
                city: null,
                state: null,
                zipCode: null,
                country: null
            }
        }
    },
    lastLogin: { type: 'date', default: null },
    passwordResetToken: { type: 'string', default: null },
    passwordResetExpires: { type: 'date', default: null },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Role-based permissions mapping
const rolePermissions = {
    admin: [
        'read:users', 'write:users', 'delete:users',
        'read:companies', 'write:companies', 'delete:companies',
        'read:reports', 'write:reports', 'delete:reports',
        'read:spv', 'write:spv', 'delete:spv',
        'read:assets', 'write:assets', 'delete:assets',
        'read:compliance', 'write:compliance', 'delete:compliance',
        'admin:all'
    ],
    founder: [
        'read:users', 'write:users',
        'read:companies', 'write:companies',
        'read:reports', 'write:reports',
        'read:spv', 'write:spv',
        'read:assets', 'write:assets',
        'read:compliance', 'write:compliance',
        'read:equity', 'write:equity'
    ],
    investor: [
        'read:users',
        'read:companies',
        'read:reports',
        'read:spv',
        'read:assets',
        'read:compliance',
        'read:equity'
    ],
    manager: [
        'read:users', 'write:users',
        'read:companies', 'write:companies',
        'read:reports', 'write:reports',
        'read:spv', 'write:spv',
        'read:assets', 'write:assets',
        'read:compliance', 'write:compliance'
    ],
    user: [
        'read:users',
        'read:companies',
        'read:reports',
        'read:spv',
        'read:assets',
        'read:compliance',
        'write:compliance'
    ],
    client: [
        'read:users',
        'read:reports',
        'read:spv',
        'read:assets'
    ]
};

// Create the base model
const baseModel = createModel('users', userSchema);

// Extended User model with business logic
const User = {
    ...baseModel,
    tableName: 'users',
    schema: userSchema,

    /**
     * Create a new user with defaults
     * @param {Object} data - User data
     * @returns {Object} Created user
     */
    async create(data) {
        // Generate userId if not provided
        if (!data.userId) {
            data.userId = `user_${uuidv4()}`;
        }

        // Set displayName if not provided
        if (!data.displayName && data.firstName && data.lastName) {
            data.displayName = `${data.firstName} ${data.lastName}`;
        }

        // Set default permissions based on role
        if (!data.permissions && data.role) {
            data.permissions = rolePermissions[data.role] || [];
        }

        // Set default status
        if (!data.status) {
            data.status = 'pending';
        }

        // Set default profile
        if (!data.profile) {
            data.profile = {
                bio: '',
                avatar: null,
                phoneNumber: null,
                address: {
                    street: null,
                    city: null,
                    state: null,
                    zipCode: null,
                    country: null
                }
            };
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Object|null} User or null
     */
    async findByEmail(email) {
        return baseModel.findOne.call(baseModel, { email });
    },

    /**
     * Find user by userId
     * @param {string} userId - User ID
     * @returns {Object|null} User or null
     */
    async findByUserId(userId) {
        return baseModel.findOne.call(baseModel, { userId });
    },

    /**
     * Find users by company
     * @param {string} companyId - Company ID
     * @returns {Array} Users in company
     */
    async findByCompany(companyId) {
        return baseModel.find.call(baseModel, { companyId });
    },

    /**
     * Update last login time
     * @param {string} userId - User ID
     * @returns {Object} Update result
     */
    async updateLastLogin(userId) {
        return baseModel.updateOne.call(baseModel,
            { userId },
            { $set: { lastLogin: new Date().toISOString() } }
        );
    },

    /**
     * Transform user object for JSON output (hide sensitive fields)
     * @param {Object} user - User object
     * @returns {Object} Sanitized user object
     */
    toJSON(user) {
        if (!user) return null;
        const sanitized = { ...user };
        delete sanitized.password;
        delete sanitized.passwordResetToken;
        delete sanitized.passwordResetExpires;
        return sanitized;
    },

    /**
     * Check if user has permission
     * @param {Object} user - User object
     * @param {string} permission - Permission to check
     * @returns {boolean} True if has permission
     */
    hasPermission(user, permission) {
        if (!user || !user.permissions) return false;
        if (user.permissions.includes('admin:all')) return true;
        return user.permissions.includes(permission);
    },

    /**
     * Get permissions for role
     * @param {string} role - Role name
     * @returns {Array} Permissions array
     */
    getPermissionsForRole(role) {
        return rolePermissions[role] || [];
    },

    // Expose base model methods
    find: baseModel.find.bind(baseModel),
    findOne: baseModel.findOne.bind(baseModel),
    findById: baseModel.findById.bind(baseModel),
    updateOne: baseModel.updateOne.bind(baseModel),
    updateMany: baseModel.updateMany.bind(baseModel),
    findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
    findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
    deleteOne: baseModel.deleteOne.bind(baseModel),
    deleteMany: baseModel.deleteMany.bind(baseModel),
    findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
    findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
    countDocuments: baseModel.countDocuments.bind(baseModel),
    exists: baseModel.exists.bind(baseModel),
    distinct: baseModel.distinct.bind(baseModel),
    aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = User;
