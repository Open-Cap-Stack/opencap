/**
 * Report Scheduling Routes Unit Tests
 * Issue #112: Create Report Scheduling System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const express = require('express');
const request = require('supertest');

// Mock the controller before requiring routes
jest.mock('../../../../controllers/reportSchedulingController', () => ({
  createSchedule: jest.fn((req, res) => res.status(201).json({ scheduleId: 'RS-001' })),
  getSchedules: jest.fn((req, res) => res.status(200).json([])),
  getScheduleById: jest.fn((req, res) => res.status(200).json({ scheduleId: req.params.id })),
  updateSchedule: jest.fn((req, res) => res.status(200).json({ scheduleId: req.params.id })),
  deleteSchedule: jest.fn((req, res) => res.status(200).json({ message: 'Deleted' })),
  pauseSchedule: jest.fn((req, res) => res.status(200).json({ status: 'paused' })),
  resumeSchedule: jest.fn((req, res) => res.status(200).json({ status: 'active' })),
  runReport: jest.fn((req, res) => res.status(200).json({ executionId: 'RE-001' })),
  getUpcomingReports: jest.fn((req, res) => res.status(200).json([])),
  getExecutionHistory: jest.fn((req, res) => res.status(200).json([])),
  processSchedules: jest.fn((req, res) => res.status(200).json({ processed: 0 }))
}));

const reportSchedulingController = require('../../../../controllers/reportSchedulingController');
const reportSchedulingRoutes = require('../../../../routes/v1/reportSchedulingRoutes');

describe('Report Scheduling Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', reportSchedulingRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/report-schedules', () => {
    it('should call createSchedule controller', async () => {
      const scheduleData = {
        companyId: 'COMP-001',
        reportType: 'cap_table',
        name: 'Monthly Report',
        schedule: '0 9 1 * *'
      };

      const response = await request(app)
        .post('/api/v1/report-schedules')
        .send(scheduleData)
        .expect(201);

      expect(reportSchedulingController.createSchedule).toHaveBeenCalled();
      expect(response.body).toHaveProperty('scheduleId');
    });
  });

  describe('GET /api/v1/report-schedules', () => {
    it('should call getSchedules controller', async () => {
      const response = await request(app)
        .get('/api/v1/report-schedules')
        .query({ companyId: 'COMP-001' })
        .expect(200);

      expect(reportSchedulingController.getSchedules).toHaveBeenCalled();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support status filter query parameter', async () => {
      await request(app)
        .get('/api/v1/report-schedules')
        .query({ companyId: 'COMP-001', status: 'active' })
        .expect(200);

      expect(reportSchedulingController.getSchedules).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/report-schedules/upcoming', () => {
    it('should call getUpcomingReports controller', async () => {
      const response = await request(app)
        .get('/api/v1/report-schedules/upcoming')
        .query({ minutes: 60 })
        .expect(200);

      expect(reportSchedulingController.getUpcomingReports).toHaveBeenCalled();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/v1/report-schedules/process', () => {
    it('should call processSchedules controller', async () => {
      const response = await request(app)
        .post('/api/v1/report-schedules/process')
        .expect(200);

      expect(reportSchedulingController.processSchedules).toHaveBeenCalled();
      expect(response.body).toHaveProperty('processed');
    });
  });

  describe('GET /api/v1/report-schedules/:id', () => {
    it('should call getScheduleById controller', async () => {
      const response = await request(app)
        .get('/api/v1/report-schedules/RS-001')
        .expect(200);

      expect(reportSchedulingController.getScheduleById).toHaveBeenCalled();
      expect(response.body).toHaveProperty('scheduleId', 'RS-001');
    });
  });

  describe('PUT /api/v1/report-schedules/:id', () => {
    it('should call updateSchedule controller', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put('/api/v1/report-schedules/RS-001')
        .send(updateData)
        .expect(200);

      expect(reportSchedulingController.updateSchedule).toHaveBeenCalled();
      expect(response.body).toHaveProperty('scheduleId');
    });
  });

  describe('DELETE /api/v1/report-schedules/:id', () => {
    it('should call deleteSchedule controller', async () => {
      const response = await request(app)
        .delete('/api/v1/report-schedules/RS-001')
        .expect(200);

      expect(reportSchedulingController.deleteSchedule).toHaveBeenCalled();
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/v1/report-schedules/:id/pause', () => {
    it('should call pauseSchedule controller', async () => {
      const response = await request(app)
        .post('/api/v1/report-schedules/RS-001/pause')
        .expect(200);

      expect(reportSchedulingController.pauseSchedule).toHaveBeenCalled();
      expect(response.body).toHaveProperty('status', 'paused');
    });
  });

  describe('POST /api/v1/report-schedules/:id/resume', () => {
    it('should call resumeSchedule controller', async () => {
      const response = await request(app)
        .post('/api/v1/report-schedules/RS-001/resume')
        .expect(200);

      expect(reportSchedulingController.resumeSchedule).toHaveBeenCalled();
      expect(response.body).toHaveProperty('status', 'active');
    });
  });

  describe('POST /api/v1/report-schedules/:id/run', () => {
    it('should call runReport controller', async () => {
      const response = await request(app)
        .post('/api/v1/report-schedules/RS-001/run')
        .expect(200);

      expect(reportSchedulingController.runReport).toHaveBeenCalled();
      expect(response.body).toHaveProperty('executionId');
    });
  });

  describe('GET /api/v1/report-schedules/:id/history', () => {
    it('should call getExecutionHistory controller', async () => {
      const response = await request(app)
        .get('/api/v1/report-schedules/RS-001/history')
        .expect(200);

      expect(reportSchedulingController.getExecutionHistory).toHaveBeenCalled();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support limit and status query parameters', async () => {
      await request(app)
        .get('/api/v1/report-schedules/RS-001/history')
        .query({ limit: 10, status: 'completed' })
        .expect(200);

      expect(reportSchedulingController.getExecutionHistory).toHaveBeenCalled();
    });
  });

  describe('Route structure', () => {
    it('should export an express router', () => {
      expect(reportSchedulingRoutes).toBeDefined();
      expect(typeof reportSchedulingRoutes).toBe('function');
    });
  });
});
