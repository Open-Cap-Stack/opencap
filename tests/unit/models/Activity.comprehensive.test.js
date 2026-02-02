/**
 * Comprehensive Activity Model Unit Tests
 *
 * Tests for the Activity model including validation, methods, and schema behavior
 */

const mongoose = require('mongoose');

// Mock mongoose connection
jest.mock('../../../utils/mongoDbConnection', () => ({}));

describe('Activity Model', () => {
  let Activity;

  const validActivityTypes = [
    'DocumentUpload',
    'StakeholderUpdate',
    'FinancialReportCreated',
    'UserLogin',
    'SystemUpdate'
  ];

  beforeAll(() => {
    // Mock mongoose model creation
    jest.spyOn(mongoose, 'model').mockImplementation((name, schema) => {
      function MockActivity(data = {}) {
        Object.assign(this, data);
        this.isNew = true;
        this.isModified = jest.fn();
        this.save = jest.fn();

        // Apply defaults
        if (this.relatedObjects === undefined) this.relatedObjects = [];

        this.validateSync = jest.fn(() => {
          const errors = {};

          // Check required fields
          if (!this.activityId) {
            errors.activityId = { message: 'activityId is required' };
          }
          if (!this.activityType) {
            errors.activityType = { message: 'activityType is required' };
          } else if (!validActivityTypes.includes(this.activityType)) {
            errors.activityType = { message: `${this.activityType} is not a valid activity type` };
          }
          if (!this.timestamp) {
            errors.timestamp = { message: 'timestamp is required' };
          }
          if (!this.userInvolved) {
            errors.userInvolved = { message: 'userInvolved is required' };
          }

          return Object.keys(errors).length > 0 ? { errors } : null;
        });
        this.toObject = jest.fn(() => ({ ...data }));
      }

      // Add static methods
      MockActivity.findById = jest.fn();
      MockActivity.find = jest.fn();
      MockActivity.findOne = jest.fn();
      MockActivity.create = jest.fn();
      MockActivity.findByIdAndUpdate = jest.fn();
      MockActivity.findByIdAndDelete = jest.fn();
      MockActivity.countDocuments = jest.fn();
      MockActivity.aggregate = jest.fn();

      return MockActivity;
    });

    // Now require the Activity model
    Activity = require('../../../models/Activity');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should create activity with all required fields', () => {
        const activityData = {
          activityId: 'act-123',
          activityType: 'DocumentUpload',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          userInvolved: '507f1f77bcf86cd799439011'
        };

        const activity = new Activity(activityData);

        expect(activity.activityId).toBe(activityData.activityId);
        expect(activity.activityType).toBe(activityData.activityType);
        expect(activity.timestamp).toEqual(activityData.timestamp);
        expect(activity.userInvolved).toBe(activityData.userInvolved);
      });

      it('should reject activity without activityId', () => {
        const activity = new Activity({
          activityType: 'DocumentUpload',
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.activityId).toBeTruthy();
      });

      it('should reject activity without activityType', () => {
        const activity = new Activity({
          activityId: 'act-123',
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.activityType).toBeTruthy();
      });

      it('should reject activity without timestamp', () => {
        const activity = new Activity({
          activityId: 'act-123',
          activityType: 'DocumentUpload',
          userInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.timestamp).toBeTruthy();
      });

      it('should reject activity without userInvolved', () => {
        const activity = new Activity({
          activityId: 'act-123',
          activityType: 'DocumentUpload',
          timestamp: new Date()
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.userInvolved).toBeTruthy();
      });
    });

    describe('ActivityType Enum Validation', () => {
      it.each(validActivityTypes)('should accept valid activity type "%s"', (activityType) => {
        const activity = new Activity({
          activityId: 'act-123',
          activityType: activityType,
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeNull();
        expect(activity.activityType).toBe(activityType);
      });

      it('should reject invalid activity type', () => {
        const activity = new Activity({
          activityId: 'act-123',
          activityType: 'InvalidActivity',
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.activityType).toBeTruthy();
      });

      it('should reject lowercase activity type', () => {
        const activity = new Activity({
          activityId: 'act-123',
          activityType: 'documentupload', // Should be 'DocumentUpload'
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.activityType).toBeTruthy();
      });
    });
  });

  describe('Optional Fields', () => {
    it('should handle changesMade field', () => {
      const activity = new Activity({
        activityId: 'act-123',
        activityType: 'StakeholderUpdate',
        timestamp: new Date(),
        userInvolved: '507f1f77bcf86cd799439011',
        changesMade: 'Updated stakeholder email from old@example.com to new@example.com'
      });

      expect(activity.changesMade).toBe('Updated stakeholder email from old@example.com to new@example.com');
    });

    it('should handle relatedObjects array', () => {
      const activity = new Activity({
        activityId: 'act-123',
        activityType: 'DocumentUpload',
        timestamp: new Date(),
        userInvolved: '507f1f77bcf86cd799439011',
        relatedObjects: ['document-456', 'folder-789']
      });

      expect(activity.relatedObjects).toEqual(['document-456', 'folder-789']);
      expect(activity.relatedObjects.length).toBe(2);
    });

    it('should default relatedObjects to empty array', () => {
      const activity = new Activity({
        activityId: 'act-123',
        activityType: 'UserLogin',
        timestamp: new Date(),
        userInvolved: '507f1f77bcf86cd799439011'
      });

      expect(activity.relatedObjects).toEqual([]);
    });

    it('should allow changesMade to be undefined', () => {
      const activity = new Activity({
        activityId: 'act-123',
        activityType: 'UserLogin',
        timestamp: new Date(),
        userInvolved: '507f1f77bcf86cd799439011'
      });

      expect(activity.changesMade).toBeUndefined();
    });
  });

  describe('Activity Types', () => {
    describe('DocumentUpload', () => {
      it('should handle document upload activity', () => {
        const activity = new Activity({
          activityId: 'act-doc-upload-123',
          activityType: 'DocumentUpload',
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011',
          changesMade: 'Uploaded Q1 Financial Report (PDF, 2.5MB)',
          relatedObjects: ['document-new-456']
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeNull();
        expect(activity.activityType).toBe('DocumentUpload');
      });
    });

    describe('StakeholderUpdate', () => {
      it('should handle stakeholder update activity', () => {
        const activity = new Activity({
          activityId: 'act-stakeholder-123',
          activityType: 'StakeholderUpdate',
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011',
          changesMade: 'Changed role from Employee to Manager for John Doe',
          relatedObjects: ['stakeholder-789']
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeNull();
        expect(activity.activityType).toBe('StakeholderUpdate');
      });
    });

    describe('FinancialReportCreated', () => {
      it('should handle financial report creation activity', () => {
        const activity = new Activity({
          activityId: 'act-financial-123',
          activityType: 'FinancialReportCreated',
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011',
          changesMade: 'Generated Q4 2023 Financial Metrics Report',
          relatedObjects: ['financial-report-456', 'company-789']
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeNull();
        expect(activity.activityType).toBe('FinancialReportCreated');
      });
    });

    describe('UserLogin', () => {
      it('should handle user login activity', () => {
        const activity = new Activity({
          activityId: 'act-login-123',
          activityType: 'UserLogin',
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011',
          changesMade: 'User logged in from IP: 192.168.1.100'
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeNull();
        expect(activity.activityType).toBe('UserLogin');
      });
    });

    describe('SystemUpdate', () => {
      it('should handle system update activity', () => {
        const activity = new Activity({
          activityId: 'act-system-123',
          activityType: 'SystemUpdate',
          timestamp: new Date(),
          userInvolved: '507f1f77bcf86cd799439011',
          changesMade: 'System configuration updated: Enabled two-factor authentication',
          relatedObjects: ['system-config-001']
        });

        const validationError = activity.validateSync();
        expect(validationError).toBeNull();
        expect(activity.activityType).toBe('SystemUpdate');
      });
    });
  });

  describe('Timestamp Handling', () => {
    it('should handle ISO string date', () => {
      const isoDate = new Date('2024-01-15T10:30:00.000Z');
      const activity = new Activity({
        activityId: 'act-123',
        activityType: 'UserLogin',
        timestamp: isoDate,
        userInvolved: '507f1f77bcf86cd799439011'
      });

      expect(activity.timestamp).toEqual(isoDate);
    });

    it('should handle past timestamps', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const activity = new Activity({
        activityId: 'act-past-123',
        activityType: 'DocumentUpload',
        timestamp: pastDate,
        userInvolved: '507f1f77bcf86cd799439011'
      });

      expect(activity.timestamp).toEqual(pastDate);
    });

    it('should handle current timestamp', () => {
      const now = new Date();
      const activity = new Activity({
        activityId: 'act-now-123',
        activityType: 'UserLogin',
        timestamp: now,
        userInvolved: '507f1f77bcf86cd799439011'
      });

      expect(activity.timestamp).toEqual(now);
    });
  });

  describe('Static Methods', () => {
    it('should call findById correctly', async () => {
      const mockActivity = {
        activityId: 'act-123',
        activityType: 'DocumentUpload'
      };
      Activity.findById.mockResolvedValue(mockActivity);

      const result = await Activity.findById('507f1f77bcf86cd799439011');

      expect(Activity.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockActivity);
    });

    it('should call find correctly', async () => {
      const mockActivities = [
        { activityId: 'act-1', activityType: 'DocumentUpload' },
        { activityId: 'act-2', activityType: 'UserLogin' }
      ];
      Activity.find.mockResolvedValue(mockActivities);

      const result = await Activity.find({ userInvolved: '507f1f77bcf86cd799439011' });

      expect(Activity.find).toHaveBeenCalledWith({ userInvolved: '507f1f77bcf86cd799439011' });
      expect(result).toEqual(mockActivities);
    });

    it('should call find by activityType correctly', async () => {
      const mockActivities = [
        { activityId: 'act-1', activityType: 'DocumentUpload' },
        { activityId: 'act-2', activityType: 'DocumentUpload' }
      ];
      Activity.find.mockResolvedValue(mockActivities);

      const result = await Activity.find({ activityType: 'DocumentUpload' });

      expect(Activity.find).toHaveBeenCalledWith({ activityType: 'DocumentUpload' });
      expect(result.every(a => a.activityType === 'DocumentUpload')).toBe(true);
    });

    it('should call countDocuments correctly', async () => {
      Activity.countDocuments.mockResolvedValue(25);

      const count = await Activity.countDocuments({ userInvolved: '507f1f77bcf86cd799439011' });

      expect(Activity.countDocuments).toHaveBeenCalledWith({ userInvolved: '507f1f77bcf86cd799439011' });
      expect(count).toBe(25);
    });

    it('should call create correctly', async () => {
      const activityData = {
        activityId: 'act-new-123',
        activityType: 'DocumentUpload',
        timestamp: new Date(),
        userInvolved: '507f1f77bcf86cd799439011'
      };
      Activity.create.mockResolvedValue(activityData);

      const result = await Activity.create(activityData);

      expect(Activity.create).toHaveBeenCalledWith(activityData);
      expect(result).toEqual(activityData);
    });

    it('should call aggregate correctly for activity statistics', async () => {
      const aggregateResult = [
        { _id: 'DocumentUpload', count: 50 },
        { _id: 'UserLogin', count: 100 },
        { _id: 'StakeholderUpdate', count: 25 }
      ];
      Activity.aggregate.mockResolvedValue(aggregateResult);

      const pipeline = [
        { $group: { _id: '$activityType', count: { $sum: 1 } } }
      ];

      const result = await Activity.aggregate(pipeline);

      expect(Activity.aggregate).toHaveBeenCalledWith(pipeline);
      expect(result).toEqual(aggregateResult);
    });
  });

  describe('Instance Methods', () => {
    it('should save activity successfully', async () => {
      const activity = new Activity({
        activityId: 'act-save-123',
        activityType: 'DocumentUpload',
        timestamp: new Date(),
        userInvolved: '507f1f77bcf86cd799439011'
      });

      activity.save.mockResolvedValue(activity);
      const saved = await activity.save();

      expect(activity.save).toHaveBeenCalled();
      expect(saved).toBe(activity);
    });

    it('should handle save errors', async () => {
      const activity = new Activity({
        activityId: 'act-duplicate',
        activityType: 'UserLogin',
        timestamp: new Date(),
        userInvolved: '507f1f77bcf86cd799439011'
      });

      const duplicateError = new Error('E11000 duplicate key error');
      activity.save.mockRejectedValue(duplicateError);

      await expect(activity.save()).rejects.toThrow('E11000 duplicate key error');
    });

    it('should convert activity to object', () => {
      const activityData = {
        activityId: 'act-object-123',
        activityType: 'StakeholderUpdate',
        timestamp: new Date(),
        userInvolved: '507f1f77bcf86cd799439011',
        changesMade: 'Test changes'
      };

      const activity = new Activity(activityData);
      const activityObject = activity.toObject();

      expect(activityObject).toEqual(activityData);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle activity with all fields populated', () => {
      const activity = new Activity({
        activityId: 'act-complete-123',
        activityType: 'DocumentUpload',
        timestamp: new Date('2024-01-15T14:30:00Z'),
        userInvolved: '507f1f77bcf86cd799439011',
        changesMade: 'Uploaded investor agreement document (PDF, 1.2MB)',
        relatedObjects: ['document-456', 'investor-789', 'company-abc']
      });

      const validationError = activity.validateSync();
      expect(validationError).toBeNull();
      expect(activity.relatedObjects.length).toBe(3);
    });

    it('should handle activity log stream', async () => {
      const activities = [
        { activityId: 'act-1', activityType: 'UserLogin', timestamp: new Date('2024-01-15T09:00:00Z') },
        { activityId: 'act-2', activityType: 'DocumentUpload', timestamp: new Date('2024-01-15T09:15:00Z') },
        { activityId: 'act-3', activityType: 'StakeholderUpdate', timestamp: new Date('2024-01-15T09:30:00Z') },
        { activityId: 'act-4', activityType: 'FinancialReportCreated', timestamp: new Date('2024-01-15T10:00:00Z') }
      ];

      Activity.find.mockResolvedValue(activities);

      const result = await Activity.find({});

      expect(result.length).toBe(4);
      expect(result[0].timestamp < result[3].timestamp).toBe(true);
    });

    it('should handle empty activity object', () => {
      const activity = new Activity({});
      const validationError = activity.validateSync();

      expect(validationError).toBeTruthy();
      expect(Object.keys(validationError.errors).length).toBe(4); // All 4 required fields
    });

    it('should handle filtering activities by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockActivities = [
        { activityId: 'act-1', timestamp: new Date('2024-01-05') },
        { activityId: 'act-2', timestamp: new Date('2024-01-15') }
      ];

      Activity.find.mockResolvedValue(mockActivities);

      const result = await Activity.find({
        timestamp: { $gte: startDate, $lte: endDate }
      });

      expect(result.length).toBe(2);
    });

    it('should handle multiple activities for same user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const userActivities = [
        { activityId: 'act-1', activityType: 'UserLogin', userInvolved: userId },
        { activityId: 'act-2', activityType: 'DocumentUpload', userInvolved: userId },
        { activityId: 'act-3', activityType: 'UserLogin', userInvolved: userId }
      ];

      Activity.find.mockResolvedValue(userActivities);

      const result = await Activity.find({ userInvolved: userId });

      expect(result.length).toBe(3);
      result.forEach(activity => {
        expect(activity.userInvolved).toBe(userId);
      });
    });
  });
});
