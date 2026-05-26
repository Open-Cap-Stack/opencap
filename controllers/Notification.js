/**
 * Notification Controller
 * Issue #20: Migrate to ZeroDB via DatabaseAdapter
 * Issue #124: Add Activity and Notification Filtering by Company
 *
 * Handles CRUD operations for notifications using DatabaseAdapter.
 * Supports filtering by companyId, type, unread status with pagination.
 */
const databaseAdapter = require('../services/databaseAdapter');
const { parsePagination } = require('../middleware/pagination');

/**
 * Build query filter from request query parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} MongoDB-style query filter
 */
const buildNotificationFilter = (query, user) => {
  const filter = {};

  // Scope by companyId: prefer explicit query param, fall back to the
  // authenticated user's companyId so users only see their own data.
  const companyId = query.companyId || user?.companyId;
  if (companyId) {
    filter.companyId = companyId;
  }

  // Filter by notification type
  if (query.type) {
    const types = query.type.split(',').map(t => t.trim());
    if (types.length === 1) {
      filter.notificationType = types[0];
    } else {
      filter.notificationType = { $in: types };
    }
  }

  // Filter by read/unread status
  if (query.unread !== undefined) {
    const isUnread = query.unread === 'true';
    filter.isRead = !isUnread;
  }

  // Filter by recipient
  if (query.recipient) {
    filter.recipient = query.recipient;
  }

  return filter;
};

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { notificationId, notificationType, title, message, recipient, Timestamp, RelatedObjects, UserInvolved } = req.body;

    if (!notificationId || !notificationType || !title || !message || !recipient || !Timestamp || !UserInvolved) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const notificationData = {
      notificationId,
      notificationType,
      title,
      message,
      recipient,
      Timestamp,
      RelatedObjects,
      UserInvolved,
      isRead: false, // New notifications start as unread
    };

    const savedNotification = await databaseAdapter.create('Notification', notificationData);
    res.status(201).json(savedNotification);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create notification', error: error.message });
  }
};

/**
 * Get all notifications with optional filtering and pagination
 *
 * Query Parameters:
 * - companyId: Filter by company ID
 * - type: Filter by notification type (comma-separated for multiple)
 * - unread: Filter by read status (true = unread only, false = read only)
 * - recipient: Filter by recipient
 * - limit: Number of results to return (default: 100)
 * - offset: Number of results to skip (default: 0)
 *
 * Response includes:
 * - notifications: Array of notification objects
 * - total: Total count matching the filter
 * - hasMore: Boolean indicating if more results exist
 * - unreadCount: Count of unread notifications matching the filter
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getNotifications = async (req, res) => {
  try {
    // Build filter from query parameters (ZeroDB equality only)
    const filter = buildNotificationFilter(req.query, req.user);

    const { limit, skip } = parsePagination({
      limit: req.query.limit,
      skip: req.query.offset,
      page: req.query.page
    });

    const [allNotifications, total, unreadCount] = await Promise.all([
      databaseAdapter.find('Notification', filter, {
        limit,
        skip,
        sort: { Timestamp: -1 }
      }),
      databaseAdapter.count('Notification', filter),
      databaseAdapter.count('Notification', { ...filter, isRead: false })
    ]);

    const hasMore = skip + allNotifications.length < total;

    res.status(200).json({ notifications: allNotifications, total, hasMore, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve notifications', error: error.message });
  }
};

// Get a notification by ID
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await databaseAdapter.findById('Notification', req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json({ notification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve notification', error: error.message });
  }
};

// Delete a notification by ID
exports.deleteNotification = async (req, res) => {
  try {
    const deletedNotification = await databaseAdapter.findByIdAndDelete('Notification', req.params.id);
    if (!deletedNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

/**
 * Mark notifications as read
 *
 * POST /notifications/mark-read
 *
 * Body:
 * - notificationIds: Array of notification IDs to mark as read
 * - markAll: Boolean to mark all unread notifications as read
 * - companyId: Optional company ID filter when markAll is true
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.markNotificationsRead = async (req, res) => {
  try {
    const { notificationIds, markAll, companyId } = req.body;
    const now = new Date();
    let updatedCount = 0;

    // Mark all unread notifications as read
    if (markAll) {
      const updateFilter = { isRead: false };
      if (companyId) {
        updateFilter.companyId = companyId;
      }

      const result = await databaseAdapter.update(
        'Notification',
        updateFilter,
        { isRead: true, readAt: now },
        { multi: true }
      );
      updatedCount = result.modifiedCount || result.nModified || 0;
    }
    // Mark specific notifications as read
    else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      const updatePromises = notificationIds.map(id =>
        databaseAdapter.findByIdAndUpdate(
          'Notification',
          id,
          { isRead: true, readAt: now },
          { new: true }
        )
      );
      const results = await Promise.all(updatePromises);
      updatedCount = results.filter(r => r !== null).length;
    } else {
      return res.status(400).json({
        message: 'Either notificationIds array or markAll=true is required'
      });
    }

    res.status(200).json({
      message: 'Notifications marked as read',
      updatedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notifications as read', error: error.message });
  }
};
