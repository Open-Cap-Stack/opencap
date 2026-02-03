/**
 * VestingSchedule Routes Unit Tests
 * Issue #78: Implement Automated Vesting Schedules
 */
process.env.SKIP_DB_SETUP = 'true';

const request = require('supertest');
const express = require('express');

// Mock the controller
jest.mock('../../../../controllers/vestingScheduleController', () => ({
  createVestingSchedule: jest.fn((req, res) => res.status(201).json({ _id: 'schedule123' })),
  getVestingSchedules: jest.fn((req, res) => res.status(200).json([])),
  getSchedulesDueForVesting: jest.fn((req, res) => res.status(200).json([])),
  getVestingScheduleById: jest.fn((req, res) => res.status(200).json({ _id: req.params.id })),
  updateVestingSchedule: jest.fn((req, res) => res.status(200).json({ _id: req.params.id })),
  deleteVestingSchedule: jest.fn((req, res) => res.status(200).json({ message: 'Deleted' })),
  calculateVesting: jest.fn((req, res) => res.status(200).json({ vestedShares: 2500 })),
  getVestingTimeline: jest.fn((req, res) => res.status(200).json({ timeline: [] })),
  getVisualizationData: jest.fn((req, res) => res.status(200).json({ labels: [], vestedData: [] })),
  getUpcomingVestingEvents: jest.fn((req, res) => res.status(200).json({ upcomingEvents: [] })),
  applyAcceleration: jest.fn((req, res) => res.status(200).json({ accelerated: true })),
  pauseVestingSchedule: jest.fn((req, res) => res.status(200).json({ status: 'paused' })),
  resumeVestingSchedule: jest.fn((req, res) => res.status(200).json({ status: 'active' })),
  terminateVestingSchedule: jest.fn((req, res) => res.status(200).json({ status: 'terminated' }))
}));

const vestingScheduleRoutes = require('../../../../routes/v1/vestingScheduleRoutes');
const vestingScheduleController = require('../../../../controllers/vestingScheduleController');

describe('VestingSchedule Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', vestingScheduleRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('POST /api/v1/vesting-schedules', () => {
      it('should create a new vesting schedule', async () => {
        const scheduleData = {
          equityPlanId: 'plan123',
          stakeholderId: 'stakeholder123',
          totalShares: 10000,
          vestingStartDate: '2023-01-01'
        };

        const response = await request(app)
          .post('/api/v1/vesting-schedules')
          .send(scheduleData);

        expect(response.status).toBe(201);
        expect(vestingScheduleController.createVestingSchedule).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/vesting-schedules', () => {
      it('should get all vesting schedules', async () => {
        const response = await request(app)
          .get('/api/v1/vesting-schedules');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.getVestingSchedules).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/vesting-schedules/due-today', () => {
      it('should get schedules due for vesting today', async () => {
        const response = await request(app)
          .get('/api/v1/vesting-schedules/due-today');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.getSchedulesDueForVesting).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/vesting-schedules/:id', () => {
      it('should get vesting schedule by ID', async () => {
        const response = await request(app)
          .get('/api/v1/vesting-schedules/schedule123');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.getVestingScheduleById).toHaveBeenCalled();
      });
    });

    describe('PUT /api/v1/vesting-schedules/:id', () => {
      it('should update vesting schedule', async () => {
        const response = await request(app)
          .put('/api/v1/vesting-schedules/schedule123')
          .send({ cliffPeriodMonths: 6 });

        expect(response.status).toBe(200);
        expect(vestingScheduleController.updateVestingSchedule).toHaveBeenCalled();
      });
    });

    describe('DELETE /api/v1/vesting-schedules/:id', () => {
      it('should delete vesting schedule', async () => {
        const response = await request(app)
          .delete('/api/v1/vesting-schedules/schedule123');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.deleteVestingSchedule).toHaveBeenCalled();
      });
    });
  });

  describe('Vesting Calculations', () => {
    describe('GET /api/v1/vesting-schedules/:id/calculate', () => {
      it('should calculate vesting for a schedule', async () => {
        const response = await request(app)
          .get('/api/v1/vesting-schedules/schedule123/calculate');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.calculateVesting).toHaveBeenCalled();
      });

      it('should accept date query parameter', async () => {
        const response = await request(app)
          .get('/api/v1/vesting-schedules/schedule123/calculate?date=2024-06-01');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.calculateVesting).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/vesting-schedules/:id/timeline', () => {
      it('should get vesting timeline', async () => {
        const response = await request(app)
          .get('/api/v1/vesting-schedules/schedule123/timeline');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.getVestingTimeline).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/vesting-schedules/:id/visualization', () => {
      it('should get visualization data', async () => {
        const response = await request(app)
          .get('/api/v1/vesting-schedules/schedule123/visualization');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.getVisualizationData).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/vesting-schedules/:id/upcoming', () => {
      it('should get upcoming vesting events', async () => {
        const response = await request(app)
          .get('/api/v1/vesting-schedules/schedule123/upcoming');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.getUpcomingVestingEvents).toHaveBeenCalled();
      });

      it('should accept count query parameter', async () => {
        const response = await request(app)
          .get('/api/v1/vesting-schedules/schedule123/upcoming?count=5');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.getUpcomingVestingEvents).toHaveBeenCalled();
      });
    });
  });

  describe('Acceleration', () => {
    describe('POST /api/v1/vesting-schedules/:id/accelerate', () => {
      it('should apply acceleration to schedule', async () => {
        const response = await request(app)
          .post('/api/v1/vesting-schedules/schedule123/accelerate')
          .send({ type: 'change_of_control', date: '2024-06-01' });

        expect(response.status).toBe(200);
        expect(vestingScheduleController.applyAcceleration).toHaveBeenCalled();
      });
    });
  });

  describe('Status Management', () => {
    describe('POST /api/v1/vesting-schedules/:id/pause', () => {
      it('should pause vesting schedule', async () => {
        const response = await request(app)
          .post('/api/v1/vesting-schedules/schedule123/pause');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.pauseVestingSchedule).toHaveBeenCalled();
      });
    });

    describe('POST /api/v1/vesting-schedules/:id/resume', () => {
      it('should resume vesting schedule', async () => {
        const response = await request(app)
          .post('/api/v1/vesting-schedules/schedule123/resume');

        expect(response.status).toBe(200);
        expect(vestingScheduleController.resumeVestingSchedule).toHaveBeenCalled();
      });
    });

    describe('POST /api/v1/vesting-schedules/:id/terminate', () => {
      it('should terminate vesting schedule', async () => {
        const response = await request(app)
          .post('/api/v1/vesting-schedules/schedule123/terminate')
          .send({ terminationType: 'voluntary' });

        expect(response.status).toBe(200);
        expect(vestingScheduleController.terminateVestingSchedule).toHaveBeenCalled();
      });
    });
  });

  describe('Route Ordering', () => {
    it('should route due-today before :id parameter', async () => {
      const response = await request(app)
        .get('/api/v1/vesting-schedules/due-today');

      expect(response.status).toBe(200);
      // Verify it called getSchedulesDueForVesting, not getVestingScheduleById
      expect(vestingScheduleController.getSchedulesDueForVesting).toHaveBeenCalled();
      expect(vestingScheduleController.getVestingScheduleById).not.toHaveBeenCalled();
    });
  });
});
