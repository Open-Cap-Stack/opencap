/**
 * Communication Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Handles email, SMS, and notification communications between users.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const MESSAGE_TYPES = ['email', 'SMS', 'notification'];

const communicationSchema = {
    communicationId: { type: 'string', required: true, unique: true },
    MessageType: {
        type: 'string',
        required: true,
        enum: MESSAGE_TYPES
    },
    Sender: { type: 'string', required: true },
    Recipient: { type: 'string', required: true },
    Timestamp: { type: 'date', required: true },
    Content: { type: 'string', required: true, maxLength: 5000 },
    ThreadId: { type: 'string', required: false }
};

const baseModel = createModel('companies', communicationSchema);

/**
 * Validate communication data
 * @param {Object} data - Communication data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateCommunication(data) {
    const errors = [];

    if (!data.communicationId) {
        errors.push('communicationId is required');
    }

    if (!data.MessageType) {
        errors.push('MessageType is required');
    } else if (!MESSAGE_TYPES.includes(data.MessageType)) {
        errors.push(`MessageType must be one of: ${MESSAGE_TYPES.join(', ')}`);
    }

    if (!data.Sender) {
        errors.push('Sender is required');
    }

    if (!data.Recipient) {
        errors.push('Recipient is required');
    }

    if (!data.Content) {
        errors.push('Content is required');
    } else if (data.Content.length > 5000) {
        errors.push('Content cannot exceed 5000 characters');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const Communication = {
    ...baseModel,
    MESSAGE_TYPES,

    /**
     * Create a new communication with validation
     * @param {Object} data - Communication data
     * @returns {Object} Created communication
     */
    async create(data) {
        const validation = validateCommunication(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const doc = {
            ...data,
            Timestamp: data.Timestamp || new Date().toISOString(),
            _type: 'communication'
        };

        return baseModel.create(doc);
    },

    /**
     * Find communications by sender
     * @param {string} senderId - Sender ID
     * @param {Object} options - Query options
     * @returns {Array} Communications from sender
     */
    async findBySender(senderId, options = {}) {
        return baseModel.find(
            { Sender: senderId, _type: 'communication' },
            { ...options, sort: { Timestamp: -1 } }
        );
    },

    /**
     * Find communications by recipient
     * @param {string} recipientId - Recipient ID
     * @param {Object} options - Query options
     * @returns {Array} Communications to recipient
     */
    async findByRecipient(recipientId, options = {}) {
        return baseModel.find(
            { Recipient: recipientId, _type: 'communication' },
            { ...options, sort: { Timestamp: -1 } }
        );
    },

    /**
     * Find communications in a thread
     * @param {string} threadId - Thread ID
     * @param {Object} options - Query options
     * @returns {Array} Communications in thread
     */
    async findByThread(threadId, options = {}) {
        return baseModel.find(
            { ThreadId: threadId, _type: 'communication' },
            { ...options, sort: { Timestamp: 1 } }
        );
    },

    /**
     * Find communications by type
     * @param {string} messageType - Message type
     * @param {Object} options - Query options
     * @returns {Array} Communications of type
     */
    async findByType(messageType, options = {}) {
        if (!MESSAGE_TYPES.includes(messageType)) {
            throw new Error(`Invalid MessageType: ${messageType}`);
        }
        return baseModel.find(
            { MessageType: messageType, _type: 'communication' },
            options
        );
    },

    /**
     * Find all communications (filtered by type)
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Communications
     */
    async find(query = {}, options = {}) {
        return baseModel.find({ ...query, _type: 'communication' }, options);
    },

    /**
     * Find a single communication
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Communication or null
     */
    async findOne(query = {}, options = {}) {
        return baseModel.findOne({ ...query, _type: 'communication' }, options);
    },

    /**
     * Count communications matching query
     * @param {Object} query - Query filter
     * @returns {number} Count
     */
    async countDocuments(query = {}) {
        return baseModel.countDocuments({ ...query, _type: 'communication' });
    }
};

module.exports = Communication;
module.exports.MESSAGE_TYPES = MESSAGE_TYPES;
