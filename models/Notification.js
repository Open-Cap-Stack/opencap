/**
 * Notification Model
 * Migrated: ZeroDB Migration - Issue #175
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid notification types
const notificationTypes = ['system', 'user-generated'];

// Schema definition for documentation and validation
const notificationSchema = {
    notificationId: { type: 'string', required: true, unique: true },
    notificationType: { type: 'string', required: true, enum: notificationTypes },
    title: { type: 'string', required: true },
    message: { type: 'string', required: true },
    recipient: { type: 'string', required: true },
    Timestamp: { type: 'date', required: true },
    RelatedObjects: { type: 'string' },
    UserInvolved: { type: 'string', required: true },
    read: { type: 'boolean', default: false },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model - using 'compliance_events' table for notifications
const baseModel = createModel('compliance_events', notificationSchema);

// Extended Notification model with business logic
const Notification = {
    ...baseModel,
    tableName: 'compliance_events',
    schema: notificationSchema,
    notificationTypes,

    /**
     * Create a new notification with defaults
     * @param {Object} data - Notification data
     * @returns {Object} Created notification
     */
    async create(data) {
        // Generate notificationId if not provided
        if (!data.notificationId) {
            data.notificationId = `notif_${uuidv4()}`;
        }

        // Set timestamp if not provided
        if (!data.Timestamp) {
            data.Timestamp = new Date().toISOString();
        }

        // Set default read status
        if (data.read === undefined) {
            data.read = false;
        }

        // Validate notification type
        if (data.notificationType && !notificationTypes.includes(data.notificationType)) {
            throw new Error(`Invalid notification type: ${data.notificationType}`);
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find notification by notificationId
     * @param {string} notificationId - Notification ID
     * @returns {Object|null} Notification or null
     */
    async findByNotificationId(notificationId) {
        return baseModel.findOne.call(baseModel, { notificationId });
    },

    /**
     * Find notifications by recipient
     * @param {string} recipient - Recipient user ID
     * @param {Object} options - Query options
     * @returns {Array} Recipient's notifications
     */
    async findByRecipient(recipient, options = {}) {
        return baseModel.find.call(baseModel, { recipient }, options);
    },

    /**
     * Find unread notifications for user
     * @param {string} recipient - Recipient user ID
     * @returns {Array} Unread notifications
     */
    async findUnread(recipient) {
        return baseModel.find.call(baseModel, { recipient, read: false });
    },

    /**
     * Mark notification as read
     * @param {string} notificationId - Notification ID
     * @returns {Object} Update result
     */
    async markAsRead(notificationId) {
        return baseModel.updateOne.call(baseModel,
            { notificationId },
            { $set: { read: true } }
        );
    },

    /**
     * Mark all notifications as read for user
     * @param {string} recipient - Recipient user ID
     * @returns {Object} Update result
     */
    async markAllAsRead(recipient) {
        return baseModel.updateMany.call(baseModel,
            { recipient, read: false },
            { $set: { read: true } }
        );
    },

    /**
     * Send a notification
     * @param {string} type - Notification type
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} recipient - Recipient user ID
     * @param {string} userInvolved - User who triggered the notification
     * @param {string} relatedObjects - Related object IDs
     * @returns {Object} Created notification
     */
    async send(type, title, message, recipient, userInvolved, relatedObjects = '') {
        return this.create({
            notificationType: type,
            title,
            message,
            recipient,
            UserInvolved: userInvolved,
            RelatedObjects: relatedObjects,
            Timestamp: new Date().toISOString()
        });
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

module.exports = Notification;
