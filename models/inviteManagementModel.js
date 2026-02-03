/**
 * Invite Management Model - ZeroDB
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages invitations for stakeholder onboarding.
 * Note: This is a duplicate of invitemanagement.js for backwards compatibility.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid status enum values
const VALID_STATUSES = ['Pending', 'Accepted', 'Declined'];

// Schema definition for documentation and validation
const inviteSchema = {
    InviteID: { type: 'string', required: true, unique: true },
    ReceiverID: { type: 'string', required: true },
    Status: {
        type: 'string',
        enum: VALID_STATUSES,
        default: 'Pending'
    },
    Timestamp: { type: 'string', default: () => new Date().toISOString() }
};

// Create base model with ZeroDB
const baseModel = createModel('invite_management', inviteSchema);

/**
 * Validate invite data before create/update
 * @param {Object} data - Invite data to validate
 * @throws {Error} If validation fails
 */
function validateInvite(data) {
    if (!data.InviteID) {
        throw new Error('InviteID is required');
    }
    if (!data.ReceiverID) {
        throw new Error('ReceiverID is required');
    }

    // Validate Status if provided
    if (data.Status && !VALID_STATUSES.includes(data.Status)) {
        throw new Error(`Invalid Status: ${data.Status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
}

/**
 * Apply default values to invite data
 * @param {Object} data - Invite data
 * @returns {Object} Invite data with defaults applied
 */
function applyDefaults(data) {
    return {
        Status: 'Pending',
        Timestamp: new Date().toISOString(),
        ...data
    };
}

// Extended InviteManagement model with validation and business logic
const InviteManagement = {
    ...baseModel,

    // Export enum values for external use
    VALID_STATUSES,

    /**
     * Create a new invite with validation
     * @param {Object} data - Invite data
     * @returns {Object} Created invite
     */
    async create(data) {
        validateInvite(data);
        const inviteData = applyDefaults(data);
        return baseModel.create(inviteData);
    },

    /**
     * Find invite by InviteID
     * @param {string} inviteId - The InviteID to search for
     * @returns {Object|null} Invite or null
     */
    async findByInviteId(inviteId) {
        return baseModel.findOne({ InviteID: inviteId });
    },

    /**
     * Find invites by ReceiverID
     * @param {string} receiverId - The ReceiverID to filter by
     * @returns {Array} Invites for the receiver
     */
    async findByReceiverId(receiverId) {
        return baseModel.find({ ReceiverID: receiverId });
    },

    /**
     * Find invites by status
     * @param {string} status - The status to filter by
     * @returns {Array} Invites with the specified status
     */
    async findByStatus(status) {
        if (!VALID_STATUSES.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        return baseModel.find({ Status: status });
    },

    /**
     * Accept an invite
     * @param {string} inviteId - The InviteID to accept
     * @returns {Object} Updated invite
     */
    async acceptInvite(inviteId) {
        const invite = await this.findByInviteId(inviteId);
        if (!invite) {
            throw new Error('Invite not found');
        }

        if (invite.Status !== 'Pending') {
            throw new Error(`Cannot accept invite with status: ${invite.Status}`);
        }

        return baseModel.findOneAndUpdate(
            { InviteID: inviteId },
            { $set: { Status: 'Accepted' } },
            { new: true }
        );
    },

    /**
     * Decline an invite
     * @param {string} inviteId - The InviteID to decline
     * @returns {Object} Updated invite
     */
    async declineInvite(inviteId) {
        const invite = await this.findByInviteId(inviteId);
        if (!invite) {
            throw new Error('Invite not found');
        }

        if (invite.Status !== 'Pending') {
            throw new Error(`Cannot decline invite with status: ${invite.Status}`);
        }

        return baseModel.findOneAndUpdate(
            { InviteID: inviteId },
            { $set: { Status: 'Declined' } },
            { new: true }
        );
    },

    /**
     * Update invite status
     * @param {string} inviteId - The InviteID to update
     * @param {string} status - New status
     * @returns {Object} Updated invite
     */
    async updateStatus(inviteId, status) {
        if (!VALID_STATUSES.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }

        return baseModel.findOneAndUpdate(
            { InviteID: inviteId },
            { $set: { Status: status } },
            { new: true }
        );
    },

    /**
     * Get pending invites for a receiver
     * @param {string} receiverId - The ReceiverID to filter by
     * @returns {Array} Pending invites for the receiver
     */
    async getPendingInvites(receiverId) {
        return baseModel.find({ ReceiverID: receiverId, Status: 'Pending' });
    },

    /**
     * Count invites by status
     * @param {string} status - The status to count
     * @returns {number} Count of invites with the status
     */
    async countByStatus(status) {
        if (!VALID_STATUSES.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        return baseModel.countDocuments({ Status: status });
    }
};

module.exports = InviteManagement;
