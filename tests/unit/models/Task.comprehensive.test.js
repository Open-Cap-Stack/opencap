/**
 * Task Model Comprehensive Tests
 *
 * Tests for the Task ZeroDB model including creation with validation,
 * query methods, status/priority updates, comment management, tag operations,
 * overdue detection, and deletion.
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

const Task = require('../../../models/Task');
const zerodbService = require('../../../services/zerodbService');

describe('Task Model (Comprehensive)', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc })),
        total: results.length
      });
    });

    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc => {
        return !Object.entries(filter).every(([key, value]) => doc[key] === value);
      });
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });

    zerodbService.deleteRowById.mockImplementation((tableName, rowId) => {
      store = store.filter((_, i) => i + 1 !== rowId);
      return Promise.resolve({ deleted_count: 1 });
    });
  });

  const validTaskData = {
    title: 'Implement feature X',
    description: 'Build the new feature X for the platform',
    companyId: 'company-001',
    assigneeId: 'user-001'
  };

  // --- Validation ---

  describe('Validation', () => {
    it('should throw when title is missing', async () => {
      await expect(Task.create({})).rejects.toThrow(/Task title is required/);
    });

    it('should throw when title is empty string', async () => {
      await expect(Task.create({ title: '' })).rejects.toThrow(/Task title is required/);
    });

    it('should throw when title is whitespace only', async () => {
      await expect(Task.create({ title: '   ' })).rejects.toThrow(/Task title is required/);
    });

    it('should throw when title exceeds 200 characters', async () => {
      const longTitle = 'a'.repeat(201);
      await expect(Task.create({ title: longTitle })).rejects.toThrow(/Title cannot exceed 200 characters/);
    });

    it('should throw when description exceeds 2000 characters', async () => {
      const longDesc = 'b'.repeat(2001);
      await expect(Task.create({ title: 'Valid', description: longDesc }))
        .rejects.toThrow(/Description cannot exceed 2000 characters/);
    });

    it('should throw for invalid status', async () => {
      await expect(Task.create({ title: 'Valid', status: 'unknown' }))
        .rejects.toThrow(/not a valid status/);
    });

    it('should throw for invalid priority', async () => {
      await expect(Task.create({ title: 'Valid', priority: 'extreme' }))
        .rejects.toThrow(/not a valid priority/);
    });

    it('should accept all valid statuses', async () => {
      for (const status of Task.STATUSES) {
        const result = await Task.create({ title: `Task ${status}`, status });
        expect(result.status).toBe(status);
      }
    });

    it('should accept all valid priorities', async () => {
      for (const priority of Task.PRIORITIES) {
        const result = await Task.create({ title: `Task ${priority}`, priority });
        expect(result.priority).toBe(priority);
      }
    });
  });

  // --- Create ---

  describe('create()', () => {
    it('should create a task with valid data', async () => {
      const result = await Task.create(validTaskData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Implement feature X');
      expect(result.description).toBe('Build the new feature X for the platform');
      expect(result._type).toBe('task');
    });

    it('should trim title', async () => {
      const result = await Task.create({ title: '  My Task  ' });
      expect(result.title).toBe('My Task');
    });

    it('should trim description', async () => {
      const result = await Task.create({
        title: 'Task',
        description: '  Some description  '
      });
      expect(result.description).toBe('Some description');
    });

    it('should default status to pending', async () => {
      const result = await Task.create({ title: 'New Task' });
      expect(result.status).toBe('pending');
    });

    it('should default priority to medium', async () => {
      const result = await Task.create({ title: 'New Task' });
      expect(result.priority).toBe('medium');
    });

    it('should default tags to empty array', async () => {
      const result = await Task.create({ title: 'New Task' });
      expect(result.tags).toEqual([]);
    });

    it('should default comments to empty array', async () => {
      const result = await Task.create({ title: 'New Task' });
      expect(result.comments).toEqual([]);
    });

    it('should add isOverdue computed field', async () => {
      const result = await Task.create({ title: 'New Task' });
      expect(result.isOverdue).toBeDefined();
      expect(result.isOverdue).toBe(false);
    });

    it('should handle missing description gracefully', async () => {
      const result = await Task.create({ title: 'No Description' });
      expect(result.description).toBeUndefined();
    });
  });

  // --- findById ---

  describe('findById()', () => {
    it('should find task by ID', async () => {
      const created = await Task.create(validTaskData);
      const found = await Task.findById(created._id);
      expect(found).toBeDefined();
      expect(found.title).toBe('Implement feature X');
    });

    it('should return null for non-existent ID', async () => {
      const found = await Task.findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should filter out non-task type documents', async () => {
      // Manually insert a non-task document directly into the store
      const doc = { _id: 'fake-id', title: 'Not a task', _type: 'not-a-task' };
      store.push(doc);

      const found = await Task.findById('fake-id');
      expect(found).toBeNull();
    });

    it('should include isOverdue field on created task', async () => {
      const created = await Task.create(validTaskData);
      expect(created.isOverdue).toBeDefined();
      expect(created.isOverdue).toBe(false);
    });
  });

  // --- findByCompany ---

  describe('findByCompany()', () => {
    it('should find tasks by companyId', async () => {
      await Task.create({ title: 'Task A', companyId: 'comp-1' });
      await Task.create({ title: 'Task B', companyId: 'comp-1' });
      await Task.create({ title: 'Task C', companyId: 'comp-2' });

      const tasks = await Task.findByCompany('comp-1');
      expect(tasks.length).toBe(2);
      tasks.forEach(t => expect(t.companyId).toBe('comp-1'));
    });

    it('should return empty array when no tasks for company', async () => {
      const tasks = await Task.findByCompany('no-tasks-company');
      expect(tasks).toEqual([]);
    });

    it('should add isOverdue to all results', async () => {
      await Task.create({ title: 'Task D', companyId: 'comp-3' });
      const tasks = await Task.findByCompany('comp-3');
      tasks.forEach(t => expect(t.isOverdue).toBeDefined());
    });
  });

  // --- findByAssignee ---

  describe('findByAssignee()', () => {
    it('should find tasks by assigneeId', async () => {
      await Task.create({ title: 'Task 1', assigneeId: 'user-1' });
      await Task.create({ title: 'Task 2', assigneeId: 'user-1' });
      await Task.create({ title: 'Task 3', assigneeId: 'user-2' });

      const tasks = await Task.findByAssignee('user-1');
      expect(tasks.length).toBe(2);
      tasks.forEach(t => expect(t.assigneeId).toBe('user-1'));
    });
  });

  // --- findByStatus ---

  describe('findByStatus()', () => {
    it('should find tasks by status', async () => {
      await Task.create({ title: 'Pending task', status: 'pending' });
      await Task.create({ title: 'Completed task', status: 'completed' });

      const pending = await Task.findByStatus('pending');
      expect(pending.length).toBe(1);
      expect(pending[0].status).toBe('pending');
    });

    it('should throw for invalid status', async () => {
      await expect(Task.findByStatus('invalid')).rejects.toThrow(/Invalid status/);
    });
  });

  // --- findByPriority ---

  describe('findByPriority()', () => {
    it('should find tasks by priority', async () => {
      await Task.create({ title: 'Urgent task', priority: 'urgent' });
      await Task.create({ title: 'Low task', priority: 'low' });

      const urgent = await Task.findByPriority('urgent');
      expect(urgent.length).toBe(1);
      expect(urgent[0].priority).toBe('urgent');
    });

    it('should throw for invalid priority', async () => {
      await expect(Task.findByPriority('extreme')).rejects.toThrow(/Invalid priority/);
    });
  });

  // --- findByTag ---

  describe('findByTag()', () => {
    it('should find tasks by tag', async () => {
      await Task.create({ title: 'Tagged task', tags: ['bug', 'frontend'] });
      await Task.create({ title: 'Other task', tags: ['backend'] });

      const bugTasks = await Task.findByTag('bug');
      expect(bugTasks.length).toBe(1);
      expect(bugTasks[0].title).toBe('Tagged task');
    });

    it('should return empty when no tasks have the tag', async () => {
      await Task.create({ title: 'Some task', tags: ['backend'] });
      const results = await Task.findByTag('nonexistent-tag');
      expect(results).toEqual([]);
    });
  });

  // --- findOverdue ---

  describe('findOverdue()', () => {
    it('should find overdue tasks', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
      await Task.create({
        title: 'Overdue task',
        dueDate: pastDate,
        status: 'pending'
      });
      await Task.create({
        title: 'Not overdue',
        dueDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        status: 'pending'
      });

      const overdue = await Task.findOverdue();
      expect(overdue.length).toBe(1);
      expect(overdue[0].title).toBe('Overdue task');
      expect(overdue[0].isOverdue).toBe(true);
    });

    it('should not consider completed tasks as overdue', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      await Task.create({
        title: 'Done task',
        dueDate: pastDate,
        status: 'completed'
      });

      const overdue = await Task.findOverdue();
      expect(overdue.length).toBe(0);
    });

    it('should not consider cancelled tasks as overdue', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      await Task.create({
        title: 'Cancelled task',
        dueDate: pastDate,
        status: 'cancelled'
      });

      const overdue = await Task.findOverdue();
      expect(overdue.length).toBe(0);
    });

    it('should not consider tasks without due dates as overdue', async () => {
      await Task.create({ title: 'No due date' });
      const overdue = await Task.findOverdue();
      expect(overdue.length).toBe(0);
    });
  });

  // --- updateStatus ---

  describe('updateStatus()', () => {
    it('should update task status', async () => {
      const created = await Task.create(validTaskData);
      const updated = await Task.updateStatus(created._id, 'in_progress');

      expect(updated).toBeDefined();
      expect(updated.status).toBe('in_progress');
    });

    it('should throw for invalid status', async () => {
      const created = await Task.create(validTaskData);
      await expect(Task.updateStatus(created._id, 'invalid')).rejects.toThrow(/Invalid status/);
    });
  });

  // --- updatePriority ---

  describe('updatePriority()', () => {
    it('should update task priority', async () => {
      const created = await Task.create(validTaskData);
      const updated = await Task.updatePriority(created._id, 'high');

      expect(updated).toBeDefined();
      expect(updated.priority).toBe('high');
    });

    it('should throw for invalid priority', async () => {
      const created = await Task.create(validTaskData);
      await expect(Task.updatePriority(created._id, 'critical')).rejects.toThrow(/Invalid priority/);
    });
  });

  // --- assign ---

  describe('assign()', () => {
    it('should assign task to user', async () => {
      const created = await Task.create({ title: 'Unassigned' });
      const updated = await Task.assign(created._id, 'user-99');

      expect(updated).toBeDefined();
      expect(updated.assigneeId).toBe('user-99');
    });
  });

  // --- addComment ---

  describe('addComment()', () => {
    it('should add a comment to a task', async () => {
      const created = await Task.create(validTaskData);
      const updated = await Task.addComment(created._id, {
        text: 'This needs review',
        authorId: 'user-002'
      });

      expect(updated).toBeDefined();
      expect(updated.comments.length).toBe(1);
      expect(updated.comments[0].text).toBe('This needs review');
      expect(updated.comments[0].authorId).toBe('user-002');
      expect(updated.comments[0]._id).toBeDefined();
      expect(updated.comments[0].createdAt).toBeDefined();
    });

    it('should throw if comment text is missing', async () => {
      const created = await Task.create(validTaskData);
      await expect(
        Task.addComment(created._id, { authorId: 'user-002' })
      ).rejects.toThrow(/Comment text is required/);
    });

    it('should throw if comment text is empty', async () => {
      const created = await Task.create(validTaskData);
      await expect(
        Task.addComment(created._id, { text: '   ', authorId: 'user-002' })
      ).rejects.toThrow(/Comment text is required/);
    });

    it('should throw if authorId is missing', async () => {
      const created = await Task.create(validTaskData);
      await expect(
        Task.addComment(created._id, { text: 'No author' })
      ).rejects.toThrow(/Comment authorId is required/);
    });

    it('should throw if task not found', async () => {
      await expect(
        Task.addComment('nonexistent', { text: 'Hello', authorId: 'user-1' })
      ).rejects.toThrow(/Task not found/);
    });

    it('should trim comment text', async () => {
      const created = await Task.create(validTaskData);
      const updated = await Task.addComment(created._id, {
        text: '  Trimmed  ',
        authorId: 'user-002'
      });
      expect(updated.comments[0].text).toBe('Trimmed');
    });
  });

  // --- addTag ---

  describe('addTag()', () => {
    it('should add a tag to a task', async () => {
      const created = await Task.create(validTaskData);
      const updated = await Task.addTag(created._id, 'urgent');

      expect(updated).toBeDefined();
      expect(updated.tags).toContain('urgent');
    });

    it('should not add duplicate tags', async () => {
      const created = await Task.create({ ...validTaskData, tags: ['bug'] });
      const updated = await Task.addTag(created._id, 'bug');
      const bugCount = updated.tags.filter(t => t === 'bug').length;
      expect(bugCount).toBe(1);
    });

    it('should trim tag whitespace', async () => {
      const created = await Task.create(validTaskData);
      const updated = await Task.addTag(created._id, '  feature  ');
      expect(updated.tags).toContain('feature');
    });

    it('should throw if task not found', async () => {
      await expect(Task.addTag('nonexistent', 'tag')).rejects.toThrow(/Task not found/);
    });
  });

  // --- removeTag ---

  describe('removeTag()', () => {
    it('should remove a tag from a task', async () => {
      const created = await Task.create({ ...validTaskData, tags: ['bug', 'frontend'] });
      const updated = await Task.removeTag(created._id, 'bug');

      expect(updated.tags).not.toContain('bug');
      expect(updated.tags).toContain('frontend');
    });

    it('should throw if task not found', async () => {
      await expect(Task.removeTag('nonexistent', 'tag')).rejects.toThrow(/Task not found/);
    });

    it('should handle removing non-existent tag gracefully', async () => {
      const created = await Task.create({ ...validTaskData, tags: ['bug'] });
      const updated = await Task.removeTag(created._id, 'nonexistent');
      expect(updated.tags).toEqual(['bug']);
    });
  });

  // --- find ---

  describe('find()', () => {
    it('should filter by _type task', async () => {
      await Task.create({ title: 'Task 1' });
      await Task.create({ title: 'Task 2' });

      const results = await Task.find({});
      expect(results.length).toBe(2);
      results.forEach(t => {
        expect(t._type).toBe('task');
        expect(t.isOverdue).toBeDefined();
      });
    });
  });

  // --- findOne ---

  describe('findOne()', () => {
    it('should find a single task', async () => {
      await Task.create({ title: 'Unique Task' });
      const found = await Task.findOne({ title: 'Unique Task' });
      expect(found).toBeDefined();
      expect(found.title).toBe('Unique Task');
      expect(found.isOverdue).toBeDefined();
    });

    it('should return null when no match', async () => {
      const found = await Task.findOne({ title: 'No Match' });
      expect(found).toBeNull();
    });
  });

  // --- findByIdAndUpdate ---

  describe('findByIdAndUpdate()', () => {
    it('should update task fields', async () => {
      const created = await Task.create(validTaskData);
      await Task.findByIdAndUpdate(
        created._id,
        { $set: { title: 'Updated Title' } },
        { new: true }
      );

      const found = await Task.findById(created._id);
      expect(found.title).toBe('Updated Title');
    });

    it('should return updated task when new option is true', async () => {
      const created = await Task.create(validTaskData);
      const updated = await Task.findByIdAndUpdate(
        created._id,
        { $set: { status: 'completed' } },
        { new: true }
      );
      expect(updated).toBeDefined();
      expect(updated.status).toBe('completed');
    });

    it('should return null when new option is false', async () => {
      const created = await Task.create(validTaskData);
      const result = await Task.findByIdAndUpdate(
        created._id,
        { $set: { status: 'completed' } }
      );
      expect(result).toBeNull();
    });

    it('should throw for invalid status in update', async () => {
      const created = await Task.create(validTaskData);
      await expect(
        Task.findByIdAndUpdate(created._id, { $set: { status: 'invalid' } })
      ).rejects.toThrow(/Invalid status/);
    });

    it('should throw for invalid priority in update', async () => {
      const created = await Task.create(validTaskData);
      await expect(
        Task.findByIdAndUpdate(created._id, { $set: { priority: 'extreme' } })
      ).rejects.toThrow(/Invalid priority/);
    });

    it('should throw for title exceeding 200 chars in update', async () => {
      const created = await Task.create(validTaskData);
      await expect(
        Task.findByIdAndUpdate(created._id, { $set: { title: 'x'.repeat(201) } })
      ).rejects.toThrow(/Title cannot exceed 200 characters/);
    });

    it('should throw for description exceeding 2000 chars in update', async () => {
      const created = await Task.create(validTaskData);
      await expect(
        Task.findByIdAndUpdate(created._id, { $set: { description: 'x'.repeat(2001) } })
      ).rejects.toThrow(/Description cannot exceed 2000 characters/);
    });

    it('should handle update data without $set wrapper', async () => {
      const created = await Task.create(validTaskData);
      const updated = await Task.findByIdAndUpdate(
        created._id,
        { title: 'Direct Update' },
        { new: true }
      );
      expect(updated).toBeDefined();
      expect(updated.title).toBe('Direct Update');
    });
  });

  // --- findByIdAndDelete ---

  describe('findByIdAndDelete()', () => {
    it('should delete task and return it', async () => {
      const created = await Task.create(validTaskData);
      const deleted = await Task.findByIdAndDelete(created._id);

      expect(deleted).toBeDefined();
      expect(deleted.title).toBe('Implement feature X');
    });

    it('should return null for non-existent task', async () => {
      const deleted = await Task.findByIdAndDelete('nonexistent');
      expect(deleted).toBeNull();
    });
  });

  // --- countDocuments ---

  describe('countDocuments()', () => {
    it('should count tasks', async () => {
      zerodbService.queryTable.mockImplementationOnce(() =>
        Promise.resolve({ total: 5 })
      );

      const count = await Task.countDocuments({});
      expect(count).toBe(5);
    });
  });
});
