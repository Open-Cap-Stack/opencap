/**
 * Task Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages tasks with support for comments, status tracking, priority levels,
 * and company/assignee relationships.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const taskSchema = {
    title: { type: 'string', required: true, maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    status: { type: 'string', enum: STATUSES, default: 'pending' },
    priority: { type: 'string', enum: PRIORITIES, default: 'medium' },
    assigneeId: { type: 'string' },
    companyId: { type: 'string' },
    dueDate: { type: 'date' },
    tags: { type: 'array' },
    comments: { type: 'array' }
};

const baseModel = createModel('companies', taskSchema);

/**
 * Validate task data
 * @param {Object} data - Task data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateTask(data) {
    const errors = [];

    if (!data.title || !data.title.trim()) {
        errors.push('Task title is required');
    } else if (data.title.length > 200) {
        errors.push('Title cannot exceed 200 characters');
    }

    if (data.description && data.description.length > 2000) {
        errors.push('Description cannot exceed 2000 characters');
    }

    if (data.status && !STATUSES.includes(data.status)) {
        errors.push(`${data.status} is not a valid status`);
    }

    if (data.priority && !PRIORITIES.includes(data.priority)) {
        errors.push(`${data.priority} is not a valid priority`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate comment data
 * @param {Object} comment - Comment data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateComment(comment) {
    const errors = [];

    if (!comment.text || !comment.text.trim()) {
        errors.push('Comment text is required');
    }

    if (!comment.authorId) {
        errors.push('Comment authorId is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Check if task is overdue
 * @param {Object} task - Task object
 * @returns {boolean} True if overdue
 */
function isOverdue(task) {
    if (!task.dueDate) return false;
    return new Date() > new Date(task.dueDate) &&
           task.status !== 'completed' &&
           task.status !== 'cancelled';
}

/**
 * Add computed fields to task
 * @param {Object} task - Task object
 * @returns {Object} Task with computed fields
 */
function addComputedFields(task) {
    if (!task) return task;
    return {
        ...task,
        isOverdue: isOverdue(task)
    };
}

const Task = {
    ...baseModel,
    STATUSES,
    PRIORITIES,

    /**
     * Create a new task with validation
     * @param {Object} data - Task data
     * @returns {Object} Created task
     */
    async create(data) {
        const validation = validateTask(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const doc = {
            ...data,
            title: data.title.trim(),
            description: data.description ? data.description.trim() : undefined,
            status: data.status || 'pending',
            priority: data.priority || 'medium',
            tags: data.tags || [],
            comments: data.comments || [],
            _type: 'task'
        };

        const created = await baseModel.create(doc);
        return addComputedFields(created);
    },

    /**
     * Find task by ID
     * @param {string} id - Task ID
     * @returns {Object|null} Task or null
     */
    async findById(id) {
        const task = await baseModel.findById(id);
        if (task && task._type !== 'task') return null;
        return addComputedFields(task);
    },

    /**
     * Find tasks by company
     * @param {string} companyId - Company ID
     * @param {Object} options - Query options
     * @returns {Array} Tasks for company
     */
    async findByCompany(companyId, options = {}) {
        const tasks = await baseModel.find(
            { companyId, _type: 'task' },
            options
        );
        return tasks.map(addComputedFields);
    },

    /**
     * Find tasks by assignee
     * @param {string} assigneeId - Assignee ID
     * @param {Object} options - Query options
     * @returns {Array} Tasks for assignee
     */
    async findByAssignee(assigneeId, options = {}) {
        const tasks = await baseModel.find(
            { assigneeId, _type: 'task' },
            options
        );
        return tasks.map(addComputedFields);
    },

    /**
     * Find tasks by status
     * @param {string} status - Task status
     * @param {Object} options - Query options
     * @returns {Array} Tasks with status
     */
    async findByStatus(status, options = {}) {
        if (!STATUSES.includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }
        const tasks = await baseModel.find(
            { status, _type: 'task' },
            options
        );
        return tasks.map(addComputedFields);
    },

    /**
     * Find tasks by priority
     * @param {string} priority - Task priority
     * @param {Object} options - Query options
     * @returns {Array} Tasks with priority
     */
    async findByPriority(priority, options = {}) {
        if (!PRIORITIES.includes(priority)) {
            throw new Error(`Invalid priority: ${priority}`);
        }
        const tasks = await baseModel.find(
            { priority, _type: 'task' },
            options
        );
        return tasks.map(addComputedFields);
    },

    /**
     * Find tasks by tag
     * @param {string} tag - Tag to search for
     * @param {Object} options - Query options
     * @returns {Array} Tasks with tag
     */
    async findByTag(tag, options = {}) {
        const allTasks = await baseModel.find({ _type: 'task' }, options);
        const filtered = allTasks.filter(task =>
            task.tags && task.tags.includes(tag)
        );
        return filtered.map(addComputedFields);
    },

    /**
     * Find overdue tasks
     * @param {Object} options - Query options
     * @returns {Array} Overdue tasks
     */
    async findOverdue(options = {}) {
        const allTasks = await baseModel.find({ _type: 'task' }, options);
        const overdueTasks = allTasks.filter(isOverdue);
        return overdueTasks.map(addComputedFields);
    },

    /**
     * Update task status
     * @param {string} id - Task ID
     * @param {string} status - New status
     * @returns {Object|null} Updated task
     */
    async updateStatus(id, status) {
        if (!STATUSES.includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }
        await baseModel.updateOne(
            { _id: id, _type: 'task' },
            { $set: { status } }
        );
        return this.findById(id);
    },

    /**
     * Update task priority
     * @param {string} id - Task ID
     * @param {string} priority - New priority
     * @returns {Object|null} Updated task
     */
    async updatePriority(id, priority) {
        if (!PRIORITIES.includes(priority)) {
            throw new Error(`Invalid priority: ${priority}`);
        }
        await baseModel.updateOne(
            { _id: id, _type: 'task' },
            { $set: { priority } }
        );
        return this.findById(id);
    },

    /**
     * Assign task to user
     * @param {string} id - Task ID
     * @param {string} assigneeId - Assignee ID
     * @returns {Object|null} Updated task
     */
    async assign(id, assigneeId) {
        await baseModel.updateOne(
            { _id: id, _type: 'task' },
            { $set: { assigneeId } }
        );
        return this.findById(id);
    },

    /**
     * Add comment to task
     * @param {string} id - Task ID
     * @param {Object} comment - Comment data (text, authorId)
     * @returns {Object|null} Updated task
     */
    async addComment(id, comment) {
        const validation = validateComment(comment);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const task = await this.findById(id);
        if (!task) {
            throw new Error(`Task not found: ${id}`);
        }

        const newComment = {
            _id: uuidv4(),
            text: comment.text.trim(),
            authorId: comment.authorId,
            createdAt: new Date().toISOString()
        };

        const comments = task.comments || [];
        comments.push(newComment);

        await baseModel.updateOne(
            { _id: id, _type: 'task' },
            { $set: { comments } }
        );

        return this.findById(id);
    },

    /**
     * Add tag to task
     * @param {string} id - Task ID
     * @param {string} tag - Tag to add
     * @returns {Object|null} Updated task
     */
    async addTag(id, tag) {
        const task = await this.findById(id);
        if (!task) {
            throw new Error(`Task not found: ${id}`);
        }

        const tags = task.tags || [];
        if (!tags.includes(tag.trim())) {
            tags.push(tag.trim());
            await baseModel.updateOne(
                { _id: id, _type: 'task' },
                { $set: { tags } }
            );
        }

        return this.findById(id);
    },

    /**
     * Remove tag from task
     * @param {string} id - Task ID
     * @param {string} tag - Tag to remove
     * @returns {Object|null} Updated task
     */
    async removeTag(id, tag) {
        const task = await this.findById(id);
        if (!task) {
            throw new Error(`Task not found: ${id}`);
        }

        const tags = (task.tags || []).filter(t => t !== tag);
        await baseModel.updateOne(
            { _id: id, _type: 'task' },
            { $set: { tags } }
        );

        return this.findById(id);
    },

    /**
     * Find all tasks (filtered by type)
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Tasks
     */
    async find(query = {}, options = {}) {
        const tasks = await baseModel.find({ ...query, _type: 'task' }, options);
        return tasks.map(addComputedFields);
    },

    /**
     * Find a single task
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Task or null
     */
    async findOne(query = {}, options = {}) {
        const task = await baseModel.findOne({ ...query, _type: 'task' }, options);
        return addComputedFields(task);
    },

    /**
     * Update task
     * @param {string} id - Task ID
     * @param {Object} updateData - Data to update
     * @returns {Object|null} Updated task
     */
    async findByIdAndUpdate(id, updateData, options = {}) {
        const data = updateData.$set || updateData;

        // Validate if status or priority is being updated
        if (data.status && !STATUSES.includes(data.status)) {
            throw new Error(`Invalid status: ${data.status}`);
        }
        if (data.priority && !PRIORITIES.includes(data.priority)) {
            throw new Error(`Invalid priority: ${data.priority}`);
        }
        if (data.title && data.title.length > 200) {
            throw new Error('Title cannot exceed 200 characters');
        }
        if (data.description && data.description.length > 2000) {
            throw new Error('Description cannot exceed 2000 characters');
        }

        await baseModel.updateOne(
            { _id: id, _type: 'task' },
            { $set: data }
        );

        if (options.new) {
            return this.findById(id);
        }
        return null;
    },

    /**
     * Delete task
     * @param {string} id - Task ID
     * @returns {Object|null} Deleted task
     */
    async findByIdAndDelete(id) {
        const task = await this.findById(id);
        if (task) {
            await baseModel.deleteOne({ _id: id, _type: 'task' });
        }
        return task;
    },

    /**
     * Count tasks matching query
     * @param {Object} query - Query filter
     * @returns {number} Count
     */
    async countDocuments(query = {}) {
        return baseModel.countDocuments({ ...query, _type: 'task' });
    }
};

module.exports = Task;
