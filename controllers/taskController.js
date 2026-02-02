/**
 * Task Controller
 *
 * Issue #121: Create Task Management API
 *
 * Handles CRUD operations for tasks using DatabaseAdapter
 * for ZeroDB migration support. Includes task comments and analytics.
 */

const databaseAdapter = require('../services/databaseAdapter');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new task
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createTask = async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      status: req.body.status || 'pending',
      priority: req.body.priority || 'medium',
      comments: req.body.comments || [],
      tags: req.body.tags || []
    };

    const task = await databaseAdapter.create('Task', taskData);
    res.status(201).send(task);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

/**
 * Get all tasks with optional filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTasks = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 100, 1);
    const skip = (page - 1) * limit;

    // Build filter object from query parameters
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    if (req.query.assigneeId) {
      filter.assigneeId = req.query.assigneeId;
    }

    if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    if (req.query.tags) {
      const tagList = req.query.tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagList };
    }

    const tasks = await databaseAdapter.find('Task', filter, { skip, limit });
    res.send(tasks);
  } catch (error) {
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
    const task = await databaseAdapter.findById('Task', req.params.id);
    if (!task) {
      res.status(404).send({ message: 'Task not found' });
    } else {
      res.send(task);
    }
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
    const task = await databaseAdapter.findByIdAndUpdate(
      'Task',
      req.params.id,
      req.body,
      { new: true }
    );
    if (!task) {
      res.status(404).send({ message: 'Task not found' });
    } else {
      res.send(task);
    }
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

/**
 * Delete task by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteTask = async (req, res) => {
  try {
    const task = await databaseAdapter.findByIdAndDelete('Task', req.params.id);
    if (!task) {
      res.status(404).send({ message: 'Task not found' });
    } else {
      res.send({ message: 'Task deleted successfully' });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
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
      return res.status(400).send({ error: 'Comment text is required' });
    }

    if (!authorId) {
      return res.status(400).send({ error: 'Author ID is required' });
    }

    // Find the task first
    const task = await databaseAdapter.findById('Task', req.params.id);
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }

    // Create the comment
    const comment = {
      _id: uuidv4(),
      text,
      authorId,
      createdAt: new Date().toISOString()
    };

    // Add comment to the task's comments array
    const comments = task.comments || [];
    comments.push(comment);

    const updatedTask = await databaseAdapter.findByIdAndUpdate(
      'Task',
      req.params.id,
      { comments },
      { new: true }
    );

    res.status(201).send(updatedTask);
  } catch (error) {
    res.status(500).send({ error: error.message });
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
    const tasks = await databaseAdapter.find('Task', filter, {});

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

      // Count overdue tasks
      if (task.dueDate && new Date(task.dueDate) < now &&
          task.status !== 'completed' && task.status !== 'cancelled') {
        analytics.overdue++;
      }
    });

    res.send(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching analytics' });
  }
};
