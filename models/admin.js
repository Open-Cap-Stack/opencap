/**
 * Admin Model - ZeroDB
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages administrator accounts with notification settings.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const notificationSettingsSchema = {
    emailNotifications: { type: 'boolean', default: true },
    smsNotifications: { type: 'boolean', default: false },
    pushNotifications: { type: 'boolean', default: true },
    notificationFrequency: {
        type: 'string',
        enum: ['Immediate', 'Daily', 'Weekly'],
        default: 'Immediate'
    }
};

const adminSchema = {
    UserID: { type: 'string', required: true, unique: true },
    Name: { type: 'string', required: true },
    Email: { type: 'string', required: true, unique: true },
    UserRoles: { type: 'array', items: 'string', default: [] },
    NotificationSettings: {
        type: 'object',
        schema: notificationSettingsSchema,
        default: {
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true,
            notificationFrequency: 'Immediate'
        }
    }
};

// Create base model with ZeroDB
const baseModel = createModel('admins', adminSchema);

/**
 * Validate admin data before create/update
 * @param {Object} data - Admin data to validate
 * @throws {Error} If validation fails
 */
function validateAdmin(data) {
    if (!data.UserID) {
        throw new Error('UserID is required');
    }
    if (!data.Name) {
        throw new Error('Name is required');
    }
    if (!data.Email) {
        throw new Error('Email is required');
    }

    // Validate notification frequency if provided
    if (data.NotificationSettings?.notificationFrequency) {
        const validFrequencies = ['Immediate', 'Daily', 'Weekly'];
        if (!validFrequencies.includes(data.NotificationSettings.notificationFrequency)) {
            throw new Error('NotificationFrequency must be Immediate, Daily, or Weekly');
        }
    }
}

/**
 * Apply default notification settings
 * @param {Object} data - Admin data
 * @returns {Object} Admin data with defaults applied
 */
function applyDefaults(data) {
    const defaults = {
        UserRoles: [],
        NotificationSettings: {
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true,
            notificationFrequency: 'Immediate'
        }
    };

    return {
        ...defaults,
        ...data,
        NotificationSettings: {
            ...defaults.NotificationSettings,
            ...(data.NotificationSettings || {})
        }
    };
}

// Extended Admin model with validation and business logic
const Admin = {
    ...baseModel,

    /**
     * Create a new admin with validation
     * @param {Object} data - Admin data
     * @returns {Object} Created admin
     */
    async create(data) {
        validateAdmin(data);
        const adminData = applyDefaults(data);
        return baseModel.create(adminData);
    },

    /**
     * Find admin by UserID
     * @param {string} userId - The UserID to search for
     * @returns {Object|null} Admin or null
     */
    async findByUserId(userId) {
        return baseModel.findOne({ UserID: userId });
    },

    /**
     * Find admin by email
     * @param {string} email - The email to search for
     * @returns {Object|null} Admin or null
     */
    async findByEmail(email) {
        return baseModel.findOne({ Email: email });
    },

    /**
     * Update admin notification settings
     * @param {string} userId - The UserID of the admin
     * @param {Object} settings - New notification settings
     * @returns {Object} Updated admin
     */
    async updateNotificationSettings(userId, settings) {
        const admin = await this.findByUserId(userId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        const updatedSettings = {
            ...admin.NotificationSettings,
            ...settings
        };

        // Validate frequency if being updated
        if (settings.notificationFrequency) {
            const validFrequencies = ['Immediate', 'Daily', 'Weekly'];
            if (!validFrequencies.includes(settings.notificationFrequency)) {
                throw new Error('NotificationFrequency must be Immediate, Daily, or Weekly');
            }
        }

        return baseModel.findOneAndUpdate(
            { UserID: userId },
            { $set: { NotificationSettings: updatedSettings } },
            { new: true }
        );
    },

    /**
     * Add a role to an admin
     * @param {string} userId - The UserID of the admin
     * @param {string} role - The role to add
     * @returns {Object} Updated admin
     */
    async addRole(userId, role) {
        const admin = await this.findByUserId(userId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        const roles = admin.UserRoles || [];
        if (!roles.includes(role)) {
            roles.push(role);
        }

        return baseModel.findOneAndUpdate(
            { UserID: userId },
            { $set: { UserRoles: roles } },
            { new: true }
        );
    },

    /**
     * Remove a role from an admin
     * @param {string} userId - The UserID of the admin
     * @param {string} role - The role to remove
     * @returns {Object} Updated admin
     */
    async removeRole(userId, role) {
        const admin = await this.findByUserId(userId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        const roles = (admin.UserRoles || []).filter(r => r !== role);

        return baseModel.findOneAndUpdate(
            { UserID: userId },
            { $set: { UserRoles: roles } },
            { new: true }
        );
    }
};

module.exports = Admin;
