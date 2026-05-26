/**
 * Activity Controller
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 * Issue #124: Add Activity and Notification Filtering by Company
 *
 * Handles CRUD operations for activities using DatabaseAdapter
 * for ZeroDB migration support. Supports filtering by companyId,
 * type, and dateRange with pagination.
 */

const databaseAdapter = require('../services/databaseAdapter');

/**
 * Build query filter from request query parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} MongoDB-style query filter
 */
const buildActivityFilter = (query, user) => {
  const filter = {};

  // Scope by companyId: prefer explicit query param, fall back to the
  // authenticated user's companyId so users only see their own data.
  const companyId = query.companyId || user?.companyId;
  if (companyId) {
    filter.companyId = companyId;
  }

  // Filter by activity type
  if (query.type) {
    const types = query.type.split(',').map(t => t.trim());
    if (types.length === 1) {
      filter.activityType = types[0];
    } else {
      filter.activityType = { $in: types };
    }
  }

  // Date range filter
  if (query.startDate || query.endDate) {
    filter.timestamp = {};
    if (query.startDate) {
      filter.timestamp.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.timestamp.$lte = new Date(query.endDate);
    }
  }

  return filter;
};

/**
 * Create a new activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createActivity = async (req, res) => {
  try {
    const activity = await databaseAdapter.create('Activity', req.body);
    res.status(201).send(activity);
  } catch (error) {
    res.status(400).send(error);
  }
};

/**
 * Get all activities with optional filtering and pagination
 *
 * Query Parameters:
 * - companyId: Filter by company ID
 * - type: Filter by activity type (comma-separated for multiple)
 * - startDate: Filter activities from this date
 * - endDate: Filter activities until this date
 * - limit: Number of results to return (default: 100)
 * - offset: Number of results to skip (default: 0)
 * - page: Page number (alternative to offset, for backward compatibility)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getActivities = async (req, res) => {
  try {
    // Build filter from query parameters
    const filter = buildActivityFilter(req.query, req.user);

    // Handle pagination
    const limit = Math.max(parseInt(req.query.limit) || 100, 1);
    let skip;
    if (req.query.offset !== undefined) {
      skip = Math.max(parseInt(req.query.offset) || 0, 0);
    } else {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      skip = (page - 1) * limit;
    }

    const [activities, total] = await Promise.all([
      databaseAdapter.find('Activity', filter, {
        limit,
        skip,
        sort: { timestamp: -1 }
      }),
      databaseAdapter.count('Activity', filter)
    ]);

    const hasMore = skip + activities.length < total;

    res.status(200).json({ activities, total, hasMore });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching activities' });
  }
};

/**
 * Get activity by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getActivityById = async (req, res) => {
  try {
    const activity = await databaseAdapter.findById('Activity', req.params.id);
    if (!activity) {
      res.status(404).send({ message: 'Activity not found' });
    } else {
      res.send(activity);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching activity' });
  }
};

/**
 * Update activity by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateActivity = async (req, res) => {
  try {
    const activity = await databaseAdapter.findByIdAndUpdate(
      'Activity',
      req.params.id,
      req.body,
      { new: true }
    );
    if (!activity) {
      res.status(404).send({ message: 'Activity not found' });
    } else {
      res.send(activity);
    }
  } catch (error) {
    res.status(400).send(error);
  }
};

/**
 * Delete activity by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteActivity = async (req, res) => {
  try {
    await databaseAdapter.findByIdAndDelete('Activity', req.params.id);
    res.send({ message: 'Activity deleted' });
  } catch (error) {
    res.status(500).send(error);
  }
};
