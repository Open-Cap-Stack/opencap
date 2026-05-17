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
const buildActivityFilter = (query) => {
  const filter = {};

  // Filter by companyId (only when explicitly provided)
  if (query.companyId) {
    filter.companyId = query.companyId;
  }

  // Filter by activity type — ZeroDB only supports equality; use single type only
  if (query.type) {
    const types = query.type.split(',').map(t => t.trim());
    // ZeroDB does not support $in; only filter by single type
    if (types.length === 1) {
      filter.activityType = types[0];
    }
    // For multiple types, skip filter (JS post-filtering will handle it)
  }

  // Note: date range filters ($gte/$lte) are not supported by ZeroDB's basic equality filter.
  // We store startDate/endDate in the query for JS-side post-filtering.

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
    // Build filter from query parameters (ZeroDB equality only)
    const filter = buildActivityFilter(req.query);
    // Do NOT auto-filter by req.user.companyId — rows may lack this field

    // Handle pagination
    const limit = Math.max(parseInt(req.query.limit) || 100, 1);
    let skip;
    if (req.query.offset !== undefined) {
      skip = Math.max(parseInt(req.query.offset) || 0, 0);
    } else {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      skip = (page - 1) * limit;
    }

    // Fetch with higher limit to allow JS post-filtering
    const fetchLimit = limit + skip + 500;
    let activities = await databaseAdapter.find('Activity', filter, {
      limit: fetchLimit,
      sort: { timestamp: -1 }
    });

    // JS post-filtering for multi-type and date ranges (ZeroDB doesn't support $in/$gte/$lte)
    if (req.query.type) {
      const types = req.query.type.split(',').map(t => t.trim());
      if (types.length > 1) {
        activities = activities.filter(a => types.includes(a.activityType));
      }
    }
    if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      activities = activities.filter(a => a.timestamp && new Date(a.timestamp) >= start);
    }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      activities = activities.filter(a => a.timestamp && new Date(a.timestamp) <= end);
    }

    const total = activities.length;
    const paged = activities.slice(skip, skip + limit);
    const hasMore = skip + paged.length < total;

    res.status(200).json({ activities: paged, total, hasMore });
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
