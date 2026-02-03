/**
 * User Model - ZeroDB
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages user accounts with roles, permissions, and authentication.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid enum values
const VALID_USER_ROLES = ['Admin', 'Editor', 'Viewer'];
const VALID_AUTH_METHODS = ['OAuth', 'UsernamePassword'];

// Schema definition for documentation and validation
const userSchema = {
    userId: { type: 'string', required: true, unique: true },
    username: { type: 'string', required: true },
    email: { type: 'string', required: true },
    password: { type: 'string', required: false },
    UserRoles: {
        type: 'array',
        items: 'string',
        enum: VALID_USER_ROLES,
        required: true
    },
    Permissions: { type: 'string', required: true },
    AuditLogs: { type: 'array', items: 'string', default: [] },
    AuthenticationMethods: {
        type: 'string',
        enum: VALID_AUTH_METHODS,
        default: 'UsernamePassword'
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
};

// Create base model with ZeroDB
const baseModel = createModel('users', userSchema);

/**
 * Validate user data before create/update
 * @param {Object} data - User data to validate
 * @throws {Error} If validation fails
 */
function validateUser(data) {
    if (!data.userId) {
        throw new Error('userId is required');
    }
    if (!data.username) {
        throw new Error('username is required');
    }
    if (!data.email) {
        throw new Error('email is required');
    }
    if (!data.UserRoles || !Array.isArray(data.UserRoles) || data.UserRoles.length === 0) {
        throw new Error('UserRoles is required and must be a non-empty array');
    }
    if (!data.Permissions) {
        throw new Error('Permissions is required');
    }

    // Validate UserRoles enum values
    for (const role of data.UserRoles) {
        if (!VALID_USER_ROLES.includes(role)) {
            throw new Error(`Invalid UserRole: ${role}. Must be one of: ${VALID_USER_ROLES.join(', ')}`);
        }
    }

    // Validate AuthenticationMethods if provided
    if (data.AuthenticationMethods && !VALID_AUTH_METHODS.includes(data.AuthenticationMethods)) {
        throw new Error(`Invalid AuthenticationMethods: ${data.AuthenticationMethods}. Must be one of: ${VALID_AUTH_METHODS.join(', ')}`);
    }
}

/**
 * Apply default values to user data
 * @param {Object} data - User data
 * @returns {Object} User data with defaults applied
 */
function applyDefaults(data) {
    return {
        AuditLogs: [],
        AuthenticationMethods: 'UsernamePassword',
        ...data
    };
}

// Extended User model with validation and business logic
const User = {
    ...baseModel,

    // Export enum values for external use
    VALID_USER_ROLES,
    VALID_AUTH_METHODS,

    /**
     * Create a new user with validation
     * @param {Object} data - User data
     * @returns {Object} Created user
     */
    async create(data) {
        validateUser(data);
        const userData = applyDefaults(data);
        return baseModel.create(userData);
    },

    /**
     * Find user by userId
     * @param {string} userId - The userId to search for
     * @returns {Object|null} User or null
     */
    async findByUserId(userId) {
        return baseModel.findOne({ userId });
    },

    /**
     * Find user by email
     * @param {string} email - The email to search for
     * @returns {Object|null} User or null
     */
    async findByEmail(email) {
        return baseModel.findOne({ email });
    },

    /**
     * Find user by username
     * @param {string} username - The username to search for
     * @returns {Object|null} User or null
     */
    async findByUsername(username) {
        return baseModel.findOne({ username });
    },

    /**
     * Find users by role
     * @param {string} role - The role to filter by
     * @returns {Array} Users with the specified role
     */
    async findByRole(role) {
        if (!VALID_USER_ROLES.includes(role)) {
            throw new Error(`Invalid role: ${role}. Must be one of: ${VALID_USER_ROLES.join(', ')}`);
        }
        const allUsers = await baseModel.find({});
        return allUsers.filter(user =>
            user.UserRoles && user.UserRoles.includes(role)
        );
    },

    /**
     * Update user roles
     * @param {string} userId - The userId of the user
     * @param {Array} roles - New roles array
     * @returns {Object} Updated user
     */
    async updateRoles(userId, roles) {
        if (!Array.isArray(roles) || roles.length === 0) {
            throw new Error('Roles must be a non-empty array');
        }

        for (const role of roles) {
            if (!VALID_USER_ROLES.includes(role)) {
                throw new Error(`Invalid role: ${role}. Must be one of: ${VALID_USER_ROLES.join(', ')}`);
            }
        }

        return baseModel.findOneAndUpdate(
            { userId },
            { $set: { UserRoles: roles } },
            { new: true }
        );
    },

    /**
     * Update user permissions
     * @param {string} userId - The userId of the user
     * @param {string} permissions - New permissions string
     * @returns {Object} Updated user
     */
    async updatePermissions(userId, permissions) {
        if (!permissions) {
            throw new Error('Permissions is required');
        }

        return baseModel.findOneAndUpdate(
            { userId },
            { $set: { Permissions: permissions } },
            { new: true }
        );
    },

    /**
     * Add audit log entry
     * @param {string} userId - The userId of the user
     * @param {string} logEntry - Log entry to add
     * @returns {Object} Updated user
     */
    async addAuditLog(userId, logEntry) {
        const user = await this.findByUserId(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const logs = user.AuditLogs || [];
        logs.push(logEntry);

        return baseModel.findOneAndUpdate(
            { userId },
            { $set: { AuditLogs: logs } },
            { new: true }
        );
    },

    /**
     * Update authentication method
     * @param {string} userId - The userId of the user
     * @param {string} method - New authentication method
     * @returns {Object} Updated user
     */
    async updateAuthenticationMethod(userId, method) {
        if (!VALID_AUTH_METHODS.includes(method)) {
            throw new Error(`Invalid authentication method: ${method}. Must be one of: ${VALID_AUTH_METHODS.join(', ')}`);
        }

        return baseModel.findOneAndUpdate(
            { userId },
            { $set: { AuthenticationMethods: method } },
            { new: true }
        );
    },

    /**
     * Update user password
     * @param {string} userId - The userId of the user
     * @param {string} password - New password (should be hashed before calling)
     * @returns {Object} Updated user
     */
    async updatePassword(userId, password) {
        return baseModel.findOneAndUpdate(
            { userId },
            { $set: { password } },
            { new: true }
        );
    },

    /**
     * Check if user has a specific role
     * @param {string} userId - The userId of the user
     * @param {string} role - The role to check
     * @returns {boolean} True if user has the role
     */
    async hasRole(userId, role) {
        const user = await this.findByUserId(userId);
        if (!user) {
            return false;
        }
        return user.UserRoles && user.UserRoles.includes(role);
    }
};

module.exports = User;
