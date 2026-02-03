/**
 * Settings Controller
 *
 * Handles user and company settings management operations including
 * retrieving and updating notification, security, and preference settings.
 *
 * Issue #189: Add Settings Management Endpoints
 */

const Settings = require('../models/Settings');
const User = require('../models/User');
const Company = require('../models/Company');

/**
 * Get current user's settings
 * @route GET /api/v1/users/settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserSettings = async (req, res) => {
    try {
        // Get userId from authenticated user
        const userId = req.user.userId || req.user.id;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Get settings from database
        let settings = await Settings.getUserSettings(userId);

        // If settings don't exist, create default settings
        if (!settings) {
            settings = await Settings.createUserSettings(userId);
        }

        res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({
            error: 'Error fetching user settings',
            message: error.message
        });
    }
};

/**
 * Update current user's settings
 * @route PUT /api/v1/users/settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserSettings = async (req, res) => {
    try {
        // Get userId from authenticated user
        const userId = req.user.userId || req.user.id;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const updates = req.body;

        // Validate that we have updates
        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No settings updates provided' });
        }

        // Don't allow updating settingsId, userId, or settingsType
        delete updates.settingsId;
        delete updates.userId;
        delete updates.settingsType;
        delete updates.createdAt;

        // Check if settings exist, if not create them first
        let settings = await Settings.getUserSettings(userId);
        if (!settings) {
            settings = await Settings.createUserSettings(userId);
        }

        // Update settings (supports partial updates)
        const updatedSettings = await Settings.updateUserSettings(userId, updates);

        res.status(200).json(updatedSettings);
    } catch (error) {
        console.error('Error updating user settings:', error);

        // Handle validation errors
        if (error.message.includes('Invalid settings')) {
            return res.status(400).json({
                error: 'Validation failed',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Error updating user settings',
            message: error.message
        });
    }
};

/**
 * Get company settings by company ID
 * @route GET /api/v1/companies/:id/settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCompanySettings = async (req, res) => {
    try {
        const { id: companyId } = req.params;

        // Verify company exists
        const company = await Company.findByCompanyId(companyId) || await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Check if user has access to this company
        const userId = req.user.userId || req.user.id;
        const user = await User.findByUserId(userId) || await User.findById(userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if user belongs to this company or has admin rights
        const hasAccess = user.companyId === companyId ||
                         user.companyId === company.companyId ||
                         user.permissions.includes('admin:all') ||
                         user.permissions.includes('read:companies');

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to company settings' });
        }

        // Get settings from database
        let settings = await Settings.getCompanySettings(companyId);

        // If settings don't exist, create default settings
        if (!settings) {
            settings = await Settings.createCompanySettings(companyId);
        }

        res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching company settings:', error);
        res.status(500).json({
            error: 'Error fetching company settings',
            message: error.message
        });
    }
};

/**
 * Update company settings by company ID
 * @route PUT /api/v1/companies/:id/settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateCompanySettings = async (req, res) => {
    try {
        const { id: companyId } = req.params;
        const updates = req.body;

        // Validate that we have updates
        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No settings updates provided' });
        }

        // Verify company exists
        const company = await Company.findByCompanyId(companyId) || await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Check if user has access to modify this company's settings
        const userId = req.user.userId || req.user.id;
        const user = await User.findByUserId(userId) || await User.findById(userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if user has write access to company settings
        const hasAccess = user.companyId === companyId ||
                         user.companyId === company.companyId ||
                         user.permissions.includes('admin:all') ||
                         user.permissions.includes('write:companies');

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to modify company settings' });
        }

        // Don't allow updating settingsId, companyId, or settingsType
        delete updates.settingsId;
        delete updates.companyId;
        delete updates.settingsType;
        delete updates.createdAt;

        // Check if settings exist, if not create them first
        let settings = await Settings.getCompanySettings(companyId);
        if (!settings) {
            settings = await Settings.createCompanySettings(companyId);
        }

        // Update settings (supports partial updates)
        const updatedSettings = await Settings.updateCompanySettings(companyId, updates);

        res.status(200).json(updatedSettings);
    } catch (error) {
        console.error('Error updating company settings:', error);

        // Handle validation errors
        if (error.message.includes('Invalid settings')) {
            return res.status(400).json({
                error: 'Validation failed',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Error updating company settings',
            message: error.message
        });
    }
};

/**
 * Reset user settings to defaults
 * @route POST /api/v1/users/settings/reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetUserSettings = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Delete existing settings if they exist
        const existingSettings = await Settings.getUserSettings(userId);
        if (existingSettings) {
            await Settings.userSettingsModel.deleteOne({ userId });
        }

        // Create new default settings
        const settings = await Settings.createUserSettings(userId);

        res.status(200).json({
            message: 'Settings reset to defaults',
            settings
        });
    } catch (error) {
        console.error('Error resetting user settings:', error);
        res.status(500).json({
            error: 'Error resetting user settings',
            message: error.message
        });
    }
};

/**
 * Reset company settings to defaults
 * @route POST /api/v1/companies/:id/settings/reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetCompanySettings = async (req, res) => {
    try {
        const { id: companyId } = req.params;

        // Verify company exists
        const company = await Company.findByCompanyId(companyId) || await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Check if user has admin access
        const userId = req.user.userId || req.user.id;
        const user = await User.findByUserId(userId) || await User.findById(userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const hasAccess = user.permissions.includes('admin:all') ||
                         (user.companyId === companyId && user.role === 'admin') ||
                         (user.companyId === company.companyId && user.role === 'admin');

        if (!hasAccess) {
            return res.status(403).json({ error: 'Admin access required to reset company settings' });
        }

        // Delete existing settings if they exist
        const existingSettings = await Settings.getCompanySettings(companyId);
        if (existingSettings) {
            await Settings.companySettingsModel.deleteOne({ companyId });
        }

        // Create new default settings
        const settings = await Settings.createCompanySettings(companyId);

        res.status(200).json({
            message: 'Company settings reset to defaults',
            settings
        });
    } catch (error) {
        console.error('Error resetting company settings:', error);
        res.status(500).json({
            error: 'Error resetting company settings',
            message: error.message
        });
    }
};

module.exports = {
    getUserSettings,
    updateUserSettings,
    getCompanySettings,
    updateCompanySettings,
    resetUserSettings,
    resetCompanySettings
};
