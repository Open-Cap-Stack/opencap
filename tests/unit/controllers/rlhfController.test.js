/**
 * RLHF Controller Test Suite
 *
 * [Feature] Issue #29: Implement RLHF data collection
 * API endpoint tests for RLHF data collection operations.
 */

const rlhfController = require('../../../controllers/rlhfController');
const rlhfService = require('../../../services/rlhfService');

// Mock the service
jest.mock('../../../services/rlhfService');

describe('RLHF Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { userId: 'user-001' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('POST /api/rlhf/feedback', () => {
    describe('submitFeedback', () => {
      it('should submit feedback successfully', async () => {
        mockReq.body = {
          interactionId: 'int-001',
          feedbackType: 'thumbs_up',
          sessionId: 'session-001'
        };

        rlhfService.captureFeedback = jest.fn().mockResolvedValue({
          success: true,
          feedbackId: 'fb-001'
        });

        await rlhfController.submitFeedback(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true })
        );
      });

      it('should return 400 when interaction ID is missing', async () => {
        mockReq.body = {
          feedbackType: 'thumbs_up',
          sessionId: 'session-001'
        };

        await rlhfController.submitFeedback(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Interaction ID is required' })
        );
      });

      it('should return 400 when feedback type is missing', async () => {
        mockReq.body = {
          interactionId: 'int-001',
          sessionId: 'session-001'
        };

        await rlhfController.submitFeedback(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Feedback type is required' })
        );
      });

      it('should handle service errors', async () => {
        mockReq.body = {
          interactionId: 'int-001',
          feedbackType: 'thumbs_up',
          sessionId: 'session-001'
        };

        rlhfService.captureFeedback = jest.fn().mockRejectedValue(
          new Error('Service error')
        );

        await rlhfController.submitFeedback(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Error submitting feedback' })
        );
      });

      it('should include user ID from authenticated user', async () => {
        mockReq.body = {
          interactionId: 'int-001',
          feedbackType: 'thumbs_up',
          sessionId: 'session-001'
        };

        rlhfService.captureFeedback = jest.fn().mockResolvedValue({
          success: true,
          feedbackId: 'fb-001'
        });

        await rlhfController.submitFeedback(mockReq, mockRes);

        expect(rlhfService.captureFeedback).toHaveBeenCalledWith(
          expect.objectContaining({ userId: 'user-001' })
        );
      });
    });
  });

  describe('POST /api/rlhf/interaction', () => {
    describe('recordInteraction', () => {
      it('should record an AI interaction successfully', async () => {
        mockReq.body = {
          sessionId: 'session-001',
          prompt: 'What is the valuation?',
          response: 'Based on the data...',
          model: 'gpt-4',
          feature: 'valuation_assistant'
        };

        rlhfService.storeInteraction = jest.fn().mockResolvedValue({
          success: true,
          interactionId: 'int-001'
        });

        await rlhfController.recordInteraction(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true, interactionId: 'int-001' })
        );
      });

      it('should return 400 when prompt is missing', async () => {
        mockReq.body = {
          sessionId: 'session-001',
          response: 'Some response',
          model: 'gpt-4'
        };

        await rlhfController.recordInteraction(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Prompt is required' })
        );
      });

      it('should return 400 when response is missing', async () => {
        mockReq.body = {
          sessionId: 'session-001',
          prompt: 'Some prompt',
          model: 'gpt-4'
        };

        await rlhfController.recordInteraction(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Response is required' })
        );
      });

      it('should handle service errors', async () => {
        mockReq.body = {
          sessionId: 'session-001',
          prompt: 'Some prompt',
          response: 'Some response',
          model: 'gpt-4'
        };

        rlhfService.storeInteraction = jest.fn().mockRejectedValue(
          new Error('Service error')
        );

        await rlhfController.recordInteraction(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('POST /api/rlhf/usage', () => {
    describe('trackUsage', () => {
      it('should track feature usage successfully', async () => {
        mockReq.body = {
          sessionId: 'session-001',
          feature: 'document_analysis',
          action: 'analyze_document'
        };

        rlhfService.recordFeatureUsage = jest.fn().mockResolvedValue({
          success: true
        });

        await rlhfController.trackUsage(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true })
        );
      });

      it('should return 400 when feature is missing', async () => {
        mockReq.body = {
          sessionId: 'session-001',
          action: 'some_action'
        };

        await rlhfController.trackUsage(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Feature name is required' })
        );
      });

      it('should return 400 when action is missing', async () => {
        mockReq.body = {
          sessionId: 'session-001',
          feature: 'some_feature'
        };

        await rlhfController.trackUsage(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Action is required' })
        );
      });
    });
  });

  describe('POST /api/rlhf/correction', () => {
    describe('submitCorrection', () => {
      it('should submit a correction successfully', async () => {
        mockReq.body = {
          interactionId: 'int-001',
          originalResponse: 'Original answer',
          correctedResponse: 'Corrected answer',
          correctionType: 'factual_error'
        };

        rlhfService.recordCorrection = jest.fn().mockResolvedValue({
          success: true,
          correctionId: 'corr-001'
        });

        await rlhfController.submitCorrection(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true })
        );
      });

      it('should return 400 when interaction ID is missing', async () => {
        mockReq.body = {
          originalResponse: 'Original',
          correctedResponse: 'Corrected'
        };

        await rlhfController.submitCorrection(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Interaction ID is required' })
        );
      });

      it('should return 400 when corrected response is missing', async () => {
        mockReq.body = {
          interactionId: 'int-001',
          originalResponse: 'Original'
        };

        await rlhfController.submitCorrection(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Corrected response is required' })
        );
      });
    });
  });

  describe('GET /api/rlhf/analytics', () => {
    describe('getAnalytics', () => {
      it('should return analytics successfully', async () => {
        rlhfService.getDashboardMetrics = jest.fn().mockResolvedValue({
          totalInteractions: 500,
          totalFeedback: 120,
          totalCorrections: 30,
          averageRating: 4.2,
          positiveRate: 0.83
        });

        await rlhfController.getAnalytics(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            totalInteractions: 500,
            totalFeedback: 120
          })
        );
      });

      it('should handle service errors', async () => {
        rlhfService.getDashboardMetrics = jest.fn().mockRejectedValue(
          new Error('Analytics error')
        );

        await rlhfController.getAnalytics(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('GET /api/rlhf/analytics/feedback', () => {
    describe('getFeedbackAnalytics', () => {
      it('should return feedback analytics', async () => {
        mockReq.query = {
          startDate: '2026-01-01',
          endDate: '2026-01-31'
        };

        rlhfService.getFeedbackAnalytics = jest.fn().mockResolvedValue({
          totalFeedback: 100,
          positiveRate: 0.85,
          byType: {
            thumbs_up: 70,
            thumbs_down: 15,
            rating: 15
          }
        });

        await rlhfController.getFeedbackAnalytics(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(rlhfService.getFeedbackAnalytics).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2026-01-01',
            endDate: '2026-01-31'
          })
        );
      });
    });
  });

  describe('GET /api/rlhf/analytics/interactions', () => {
    describe('getInteractionAnalytics', () => {
      it('should return interaction analytics', async () => {
        rlhfService.getInteractionAnalytics = jest.fn().mockResolvedValue({
          totalInteractions: 500,
          avgTokens: 250,
          avgLatency: 1200,
          errorRate: 0.05
        });

        await rlhfController.getInteractionAnalytics(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  describe('GET /api/rlhf/analytics/corrections', () => {
    describe('getCorrectionAnalytics', () => {
      it('should return correction analytics', async () => {
        rlhfService.getCorrectionAnalytics = jest.fn().mockResolvedValue({
          totalCorrections: 30,
          byType: {
            factual_error: 15,
            incomplete: 10,
            formatting: 5
          }
        });

        await rlhfController.getCorrectionAnalytics(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  describe('GET /api/rlhf/export', () => {
    describe('exportData', () => {
      it('should export data in JSON format', async () => {
        mockReq.query = {
          format: 'json',
          includeInteractions: 'true',
          includeFeedback: 'true'
        };

        rlhfService.exportData = jest.fn().mockResolvedValue({
          format: 'json',
          data: [
            { prompt: 'Q1', response: 'A1' }
          ],
          count: 1
        });

        await rlhfController.exportData(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ format: 'json' })
        );
      });

      it('should export data in JSONL format', async () => {
        mockReq.query = {
          format: 'jsonl'
        };

        rlhfService.exportData = jest.fn().mockResolvedValue({
          format: 'jsonl',
          data: '{"prompt":"Q1","response":"A1"}\n',
          count: 1
        });

        await rlhfController.exportData(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should apply date filters to export', async () => {
        mockReq.query = {
          format: 'json',
          startDate: '2026-01-01',
          endDate: '2026-01-31'
        };

        rlhfService.exportData = jest.fn().mockResolvedValue({
          format: 'json',
          data: [],
          count: 0
        });

        await rlhfController.exportData(mockReq, mockRes);

        expect(rlhfService.exportData).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2026-01-01',
            endDate: '2026-01-31'
          })
        );
      });

      it('should return 400 for unsupported format', async () => {
        mockReq.query = {
          format: 'xml'
        };

        rlhfService.exportData = jest.fn().mockRejectedValue(
          new Error('Unsupported export format')
        );

        await rlhfController.exportData(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('PUT /api/rlhf/consent', () => {
    describe('updateConsent', () => {
      it('should update consent settings successfully', async () => {
        mockReq.body = {
          collectInteractions: true,
          collectFeedback: true,
          allowAnalytics: true,
          allowDataExport: false
        };

        rlhfService.updateConsentSettings = jest.fn().mockResolvedValue({
          success: true
        });

        await rlhfController.updateConsent(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(rlhfService.updateConsentSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-001',
            collectInteractions: true
          })
        );
      });

      it('should handle service errors', async () => {
        mockReq.body = {
          collectInteractions: false
        };

        rlhfService.updateConsentSettings = jest.fn().mockRejectedValue(
          new Error('Update failed')
        );

        await rlhfController.updateConsent(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('GET /api/rlhf/consent', () => {
    describe('getConsent', () => {
      it('should return consent settings', async () => {
        rlhfService.getConsentSettings = jest.fn().mockResolvedValue({
          collectInteractions: true,
          collectFeedback: true,
          allowAnalytics: true,
          allowDataExport: false
        });

        await rlhfController.getConsent(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ collectInteractions: true })
        );
      });
    });
  });

  describe('DELETE /api/rlhf/user-data', () => {
    describe('deleteUserData', () => {
      it('should delete user data successfully', async () => {
        rlhfService.deleteUserData = jest.fn().mockResolvedValue({
          success: true,
          deletedCount: 50
        });

        await rlhfController.deleteUserData(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(rlhfService.deleteUserData).toHaveBeenCalledWith('user-001');
      });

      it('should handle service errors', async () => {
        rlhfService.deleteUserData = jest.fn().mockRejectedValue(
          new Error('Delete failed')
        );

        await rlhfController.deleteUserData(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });
  });

  describe('GET /api/rlhf/user-export', () => {
    describe('exportUserData', () => {
      it('should export user data successfully', async () => {
        rlhfService.exportForUser = jest.fn().mockResolvedValue({
          userId: 'user-001',
          data: [
            { prompt: 'Q1', response: 'A1' }
          ],
          count: 1
        });

        await rlhfController.exportUserData(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(rlhfService.exportForUser).toHaveBeenCalledWith('user-001');
      });
    });
  });
});
