/**
 * Task Controller
 *
 * Issue #121: Create Task Management API
 *
 * Handles CRUD operations for tasks using Task model
 * which is backed by ZeroDB.
 */

const Task = require('../models/Task');

/**
 * Create a new task
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createTask = async (req, res) => {
  try {
    req.body.companyId = req.body.companyId || req.user?.companyId;
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    if (error.message.includes('Validation failed')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

/**
 * Get all tasks with optional filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTasks = async (req, res) => {
  try {
    // Build filter object from query parameters
    const filter = {};
    const companyId = req.query.companyId || req.user?.companyId;

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    if (req.query.assigneeId) {
      filter.assigneeId = req.query.assigneeId;
    }

    if (companyId) {
      filter.companyId = companyId;
    }

    const tasks = await Task.find(filter);

    // Return 200 with empty array for consistent REST API behavior
    res.status(200).json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Error fetching tasks' });
  }
};

/**
 * Get task by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching task' });
  }
};

/**
 * Update task by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json(task);
  } catch (error) {
    if (error.message.includes('Invalid') || error.message.includes('cannot exceed')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

/**
 * Delete task by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add a comment to a task
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addComment = async (req, res) => {
  try {
    const { text, authorId } = req.body;

    // Validate required fields
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    if (!authorId) {
      return res.status(400).json({ error: 'Author ID is required' });
    }

    const task = await Task.addComment(req.params.id, { text, authorId });
    res.status(201).json(task);
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ message: 'Task not found' });
    } else if (error.message.includes('Validation failed')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

/**
 * Get task analytics and metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAnalytics = async (req, res) => {
  try {
    // Build filter from query parameters
    const filter = {};

    if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    if (req.query.assigneeId) {
      filter.assigneeId = req.query.assigneeId;
    }

    // Fetch all tasks matching the filter
    const tasks = await Task.find(filter);

    // Calculate analytics
    const analytics = {
      total: tasks.length,
      byStatus: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      },
      overdue: 0
    };

    const now = new Date();

    tasks.forEach(task => {
      // Count by status
      if (analytics.byStatus.hasOwnProperty(task.status)) {
        analytics.byStatus[task.status]++;
      }

      // Count by priority
      if (analytics.byPriority.hasOwnProperty(task.priority)) {
        analytics.byPriority[task.priority]++;
      }

      // Count overdue tasks (or use the computed isOverdue field)
      if (task.isOverdue || (task.dueDate && new Date(task.dueDate) < now &&
          task.status !== 'completed' && task.status !== 'cancelled')) {
        analytics.overdue++;
      }
    });

    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Error fetching analytics' });
  }
};
