/**
 * InvestorCommunication Routes Unit Tests
 * Issue #91: Build Investor Communication System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const express = require('express');
const request = require('supertest');

// Mock controller before requiring routes
jest.mock('../../../../controllers/investorCommunicationController', () => ({
  createCommunication: jest.fn((req, res) => res.status(201).json({ success: true })),
  getCommunications: jest.fn((req, res) => res.status(200).json([])),
  getCommunicationById: jest.fn((req, res) => res.status(200).json({ communicationId: 'INVCOM-001' })),
  updateCommunication: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteCommunication: jest.fn((req, res) => res.status(200).json({ message: 'deleted' })),
  sendCommunication: jest.fn((req, res) => res.status(200).json({ success: true, sent: 10 })),
  scheduleCommunication: jest.fn((req, res) => res.status(200).json({ success: true })),
  getDeliveryStatus: jest.fn((req, res) => res.status(200).json({ total: 10, delivered: 8 })),
  segmentInvestors: jest.fn((req, res) => res.status(200).json({ count: 5, investors: [] })),
  createTemplate: jest.fn((req, res) => res.status(201).json({ templateId: 'TPL-001' })),
  getTemplates: jest.fn((req, res) => res.status(200).json({ count: 2, templates: [] })),
  getPreferences: jest.fn((req, res) => res.status(200).json({ email: true })),
  updatePreferences: jest.fn((req, res) => res.status(200).json({ success: true })),
  unsubscribe: jest.fn((req, res) => res.status(200).json({ message: 'Unsubscribed' }))
}));

const investorCommunicationRoutes = require('../../../../routes/v1/investorCommunicationRoutes');
const investorCommunicationController = require('../../../../controllers/investorCommunicationController');

describe('InvestorCommunication Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/investor-communications', investorCommunicationRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Communication CRUD Routes', () => {
    describe('POST /api/v1/investor-communications', () => {
      it('should create a new communication', async () => {
        const commData = {
          companyId: 'COMP-001',
          communicationType: 'quarterly_update',
          subject: 'Q4 2025 Update',
          content: 'Dear Investors...',
          createdBy: 'USER-001'
        };

        const response = await request(app)
          .post('/api/v1/investor-communications')
          .send(commData);

        expect(response.status).toBe(201);
        expect(investorCommunicationController.createCommunication).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/investor-communications', () => {
      it('should get all communications', async () => {
        const response = await request(app)
          .get('/api/v1/investor-communications?companyId=COMP-001');

        expect(response.status).toBe(200);
        expect(investorCommunicationController.getCommunications).toHaveBeenCalled();
      });

      it('should support query filters', async () => {
        const response = await request(app)
          .get('/api/v1/investor-communications?companyId=COMP-001&status=sent&communicationType=quarterly_update');

        expect(response.status).toBe(200);
        expect(investorCommunicationController.getCommunications).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/investor-communications/:id', () => {
      it('should get a specific communication', async () => {
        const response = await request(app)
          .get('/api/v1/investor-communications/comm123');

        expect(response.status).toBe(200);
        expect(investorCommunicationController.getCommunicationById).toHaveBeenCalled();
      });
    });

    describe('PUT /api/v1/investor-communications/:id', () => {
      it('should update a communication', async () => {
        const updateData = { subject: 'Updated Subject' };

        const response = await request(app)
          .put('/api/v1/investor-communications/comm123')
          .send(updateData);

        expect(response.status).toBe(200);
        expect(investorCommunicationController.updateCommunication).toHaveBeenCalled();
      });
    });

    describe('DELETE /api/v1/investor-communications/:id', () => {
      it('should delete a communication', async () => {
        const response = await request(app)
          .delete('/api/v1/investor-communications/comm123');

        expect(response.status).toBe(200);
        expect(investorCommunicationController.deleteCommunication).toHaveBeenCalled();
      });
    });
  });

  describe('Communication Action Routes', () => {
    describe('POST /api/v1/investor-communications/:id/send', () => {
      it('should send a communication', async () => {
        const response = await request(app)
          .post('/api/v1/investor-communications/comm123/send');

        expect(response.status).toBe(200);
        expect(investorCommunicationController.sendCommunication).toHaveBeenCalled();
      });
    });

    describe('POST /api/v1/investor-communications/:id/schedule', () => {
      it('should schedule a communication', async () => {
        const scheduleData = { scheduledFor: '2026-03-01T10:00:00Z' };

        const response = await request(app)
          .post('/api/v1/investor-communications/comm123/schedule')
          .send(scheduleData);

        expect(response.status).toBe(200);
        expect(investorCommunicationController.scheduleCommunication).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/investor-communications/:id/delivery-status', () => {
      it('should get delivery status for a communication', async () => {
        const response = await request(app)
          .get('/api/v1/investor-communications/comm123/delivery-status');

        expect(response.status).toBe(200);
        expect(investorCommunicationController.getDeliveryStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Investor Segmentation Routes', () => {
    describe('POST /api/v1/investor-communications/segment', () => {
      it('should segment investors based on criteria', async () => {
        const segmentData = {
          companyId: 'COMP-001',
          investorTypes: ['Angel', 'Venture Capital'],
          minInvestmentAmount: 50000
        };

        const response = await request(app)
          .post('/api/v1/investor-communications/segment')
          .send(segmentData);

        expect(response.status).toBe(200);
        expect(investorCommunicationController.segmentInvestors).toHaveBeenCalled();
      });
    });
  });

  describe('Template Routes', () => {
    describe('POST /api/v1/investor-communications/templates', () => {
      it('should create a communication template', async () => {
        const templateData = {
          companyId: 'COMP-001',
          name: 'Quarterly Update Template',
          communicationType: 'quarterly_update',
          subject: 'Q{{quarter}} {{year}} Update',
          content: 'Dear {{investorName}}...',
          createdBy: 'USER-001'
        };

        const response = await request(app)
          .post('/api/v1/investor-communications/templates')
          .send(templateData);

        expect(response.status).toBe(201);
        expect(investorCommunicationController.createTemplate).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/investor-communications/templates', () => {
      it('should get all templates for a company', async () => {
        const response = await request(app)
          .get('/api/v1/investor-communications/templates?companyId=COMP-001');

        expect(response.status).toBe(200);
        expect(investorCommunicationController.getTemplates).toHaveBeenCalled();
      });

      it('should support filtering by communicationType', async () => {
        const response = await request(app)
          .get('/api/v1/investor-communications/templates?companyId=COMP-001&communicationType=quarterly_update');

        expect(response.status).toBe(200);
        expect(investorCommunicationController.getTemplates).toHaveBeenCalled();
      });
    });
  });

  describe('Preference Routes', () => {
    describe('GET /api/v1/investor-communications/preferences/:investorId/:companyId', () => {
      it('should get investor preferences', async () => {
        const response = await request(app)
          .get('/api/v1/investor-communications/preferences/inv123/comp123');

        expect(response.status).toBe(200);
        expect(investorCommunicationController.getPreferences).toHaveBeenCalled();
      });
    });

    describe('PUT /api/v1/investor-communications/preferences/:investorId/:companyId', () => {
      it('should update investor preferences', async () => {
        const prefData = {
          communicationPreferences: { email: true, sms: true },
          frequency: 'daily_digest'
        };

        const response = await request(app)
          .put('/api/v1/investor-communications/preferences/inv123/comp123')
          .send(prefData);

        expect(response.status).toBe(200);
        expect(investorCommunicationController.updatePreferences).toHaveBeenCalled();
      });
    });

    describe('POST /api/v1/investor-communications/preferences/:investorId/:companyId/unsubscribe', () => {
      it('should unsubscribe investor from all communications', async () => {
        const response = await request(app)
          .post('/api/v1/investor-communications/preferences/inv123/comp123/unsubscribe')
          .send({});

        expect(response.status).toBe(200);
        expect(investorCommunicationController.unsubscribe).toHaveBeenCalled();
      });

      it('should unsubscribe investor from specific communication type', async () => {
        const response = await request(app)
          .post('/api/v1/investor-communications/preferences/inv123/comp123/unsubscribe')
          .send({ communicationType: 'quarterly_update' });

        expect(response.status).toBe(200);
        expect(investorCommunicationController.unsubscribe).toHaveBeenCalled();
      });
    });
  });
});
