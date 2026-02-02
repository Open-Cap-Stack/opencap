/**
 * RLHF Service Test Suite
 *
 * [Feature] Issue #29: Implement RLHF data collection
 * Comprehensive test coverage for Reinforcement Learning from Human Feedback
 * data collection, including feedback capture, analytics, and privacy controls.
 */

const rlhfService = require('../../../services/rlhfService');
const zerodbService = require('../../../services/zerodbService');

// Mock external services
jest.mock('../../../services/zerodbService');

describe('RLHF Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    zerodbService.logRLHF = jest.fn().mockResolvedValue({ success: true, id: 'rlhf-001' });
    zerodbService.insertRows = jest.fn().mockResolvedValue({ inserted: 1 });
    zerodbService.queryTable = jest.fn().mockResolvedValue([]);
    zerodbService.countRows = jest.fn().mockResolvedValue(0);
    zerodbService.updateRows = jest.fn().mockResolvedValue({ updated: 1 });
    zerodbService.storeMemory = jest.fn().mockResolvedValue({ success: true });
    zerodbService.listMemory = jest.fn().mockResolvedValue([]);
    zerodbService.publishEvent = jest.fn().mockResolvedValue({ success: true });
  });

  describe('Feedback Capture', () => {
    describe('captureFeedback', () => {
      it('should capture thumbs up feedback on an AI response', async () => {
        const feedback = {
          interactionId: 'int-001',
          userId: 'user-001',
          feedbackType: 'thumbs_up',
          sessionId: 'session-001'
        };

        const result = await rlhfService.captureFeedback(feedback);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.feedbackId).toBeDefined();
      });

      it('should capture thumbs down feedback on an AI response', async () => {
        const feedback = {
          interactionId: 'int-002',
          userId: 'user-001',
          feedbackType: 'thumbs_down',
          sessionId: 'session-001'
        };

        const result = await rlhfService.captureFeedback(feedback);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });

      it('should capture numeric rating feedback (1-5)', async () => {
        const feedback = {
          interactionId: 'int-003',
          userId: 'user-001',
          feedbackType: 'rating',
          rating: 4,
          sessionId: 'session-001'
        };

        const result = await rlhfService.captureFeedback(feedback);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });

      it('should capture text comment feedback', async () => {
        const feedback = {
          interactionId: 'int-004',
          userId: 'user-001',
          feedbackType: 'comment',
          comment: 'Very helpful response!',
          sessionId: 'session-001'
        };

        const result = await rlhfService.captureFeedback(feedback);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });

      it('should throw error for invalid feedback type', async () => {
        const feedback = {
          interactionId: 'int-005',
          userId: 'user-001',
          feedbackType: 'invalid_type',
          sessionId: 'session-001'
        };

        await expect(rlhfService.captureFeedback(feedback))
          .rejects.toThrow('Invalid feedback type');
      });

      it('should throw error when interaction ID is missing', async () => {
        const feedback = {
          userId: 'user-001',
          feedbackType: 'thumbs_up',
          sessionId: 'session-001'
        };

        await expect(rlhfService.captureFeedback(feedback))
          .rejects.toThrow('Interaction ID is required');
      });

      it('should throw error when user ID is missing', async () => {
        const feedback = {
          interactionId: 'int-006',
          feedbackType: 'thumbs_up',
          sessionId: 'session-001'
        };

        await expect(rlhfService.captureFeedback(feedback))
          .rejects.toThrow('User ID is required');
      });

      it('should validate rating is between 1 and 5', async () => {
        const feedback = {
          interactionId: 'int-007',
          userId: 'user-001',
          feedbackType: 'rating',
          rating: 6,
          sessionId: 'session-001'
        };

        await expect(rlhfService.captureFeedback(feedback))
          .rejects.toThrow('Rating must be between 1 and 5');
      });

      it('should store feedback with timestamp', async () => {
        const feedback = {
          interactionId: 'int-008',
          userId: 'user-001',
          feedbackType: 'thumbs_up',
          sessionId: 'session-001'
        };

        const result = await rlhfService.captureFeedback(feedback);

        expect(result.timestamp).toBeDefined();
      });

      it('should associate feedback with context metadata', async () => {
        const feedback = {
          interactionId: 'int-009',
          userId: 'user-001',
          feedbackType: 'thumbs_up',
          sessionId: 'session-001',
          context: {
            feature: 'document_analysis',
            page: '/documents'
          }
        };

        const result = await rlhfService.captureFeedback(feedback);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });
    });
  });

  describe('AI Interaction Recording', () => {
    describe('storeInteraction', () => {
      it('should store a prompt/response pair', async () => {
        const interaction = {
          userId: 'user-001',
          sessionId: 'session-001',
          prompt: 'What is the current valuation of the company?',
          response: 'Based on the latest funding round...',
          model: 'gpt-4',
          feature: 'valuation_assistant'
        };

        const result = await rlhfService.storeInteraction(interaction);

        expect(result).toBeDefined();
        expect(result.interactionId).toBeDefined();
        expect(result.success).toBe(true);
      });

      it('should store interaction with token counts', async () => {
        const interaction = {
          userId: 'user-001',
          sessionId: 'session-001',
          prompt: 'Explain the cap table structure',
          response: 'The cap table shows the ownership breakdown...',
          model: 'gpt-4',
          feature: 'cap_table_assistant',
          tokenCounts: {
            promptTokens: 50,
            completionTokens: 200,
            totalTokens: 250
          }
        };

        const result = await rlhfService.storeInteraction(interaction);

        expect(result.success).toBe(true);
      });

      it('should store interaction with latency metrics', async () => {
        const interaction = {
          userId: 'user-001',
          sessionId: 'session-001',
          prompt: 'Calculate dilution',
          response: 'The dilution effect would be...',
          model: 'gpt-4',
          feature: 'equity_calculator',
          latencyMs: 1500
        };

        const result = await rlhfService.storeInteraction(interaction);

        expect(result.success).toBe(true);
      });

      it('should throw error when prompt is missing', async () => {
        const interaction = {
          userId: 'user-001',
          sessionId: 'session-001',
          response: 'Some response',
          model: 'gpt-4'
        };

        await expect(rlhfService.storeInteraction(interaction))
          .rejects.toThrow('Prompt is required');
      });

      it('should throw error when response is missing', async () => {
        const interaction = {
          userId: 'user-001',
          sessionId: 'session-001',
          prompt: 'Some prompt',
          model: 'gpt-4'
        };

        await expect(rlhfService.storeInteraction(interaction))
          .rejects.toThrow('Response is required');
      });

      it('should throw error when user ID is missing', async () => {
        const interaction = {
          sessionId: 'session-001',
          prompt: 'Some prompt',
          response: 'Some response',
          model: 'gpt-4'
        };

        await expect(rlhfService.storeInteraction(interaction))
          .rejects.toThrow('User ID is required');
      });

      it('should link interaction to existing conversation thread', async () => {
        const interaction = {
          userId: 'user-001',
          sessionId: 'session-001',
          prompt: 'Follow up question',
          response: 'Follow up answer',
          model: 'gpt-4',
          conversationId: 'conv-001',
          parentInteractionId: 'int-001'
        };

        const result = await rlhfService.storeInteraction(interaction);

        expect(result.success).toBe(true);
        expect(result.conversationId).toBe('conv-001');
      });

      it('should store error interactions', async () => {
        const interaction = {
          userId: 'user-001',
          sessionId: 'session-001',
          prompt: 'Complex query that failed',
          response: null,
          model: 'gpt-4',
          feature: 'document_analysis',
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out'
          }
        };

        const result = await rlhfService.storeInteraction(interaction);

        expect(result.success).toBe(true);
        expect(result.hasError).toBe(true);
      });
    });
  });

  describe('Feature Usage Tracking', () => {
    describe('recordFeatureUsage', () => {
      it('should record AI feature usage event', async () => {
        const usage = {
          userId: 'user-001',
          sessionId: 'session-001',
          feature: 'document_analysis',
          action: 'analyze_document'
        };

        const result = await rlhfService.recordFeatureUsage(usage);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });

      it('should record feature usage with metadata', async () => {
        const usage = {
          userId: 'user-001',
          sessionId: 'session-001',
          feature: 'valuation_assistant',
          action: 'calculate_409a',
          metadata: {
            documentType: 'financial_statement',
            companyId: 'comp-001'
          }
        };

        const result = await rlhfService.recordFeatureUsage(usage);

        expect(result.success).toBe(true);
      });

      it('should record feature usage duration', async () => {
        const usage = {
          userId: 'user-001',
          sessionId: 'session-001',
          feature: 'equity_simulator',
          action: 'run_simulation',
          durationMs: 5000
        };

        const result = await rlhfService.recordFeatureUsage(usage);

        expect(result.success).toBe(true);
      });

      it('should throw error when feature name is missing', async () => {
        const usage = {
          userId: 'user-001',
          sessionId: 'session-001',
          action: 'some_action'
        };

        await expect(rlhfService.recordFeatureUsage(usage))
          .rejects.toThrow('Feature name is required');
      });

      it('should throw error when action is missing', async () => {
        const usage = {
          userId: 'user-001',
          sessionId: 'session-001',
          feature: 'some_feature'
        };

        await expect(rlhfService.recordFeatureUsage(usage))
          .rejects.toThrow('Action is required');
      });

      it('should track feature usage counts by user', async () => {
        zerodbService.queryTable.mockResolvedValue([
          { feature: 'document_analysis', count: 5 },
          { feature: 'valuation_assistant', count: 3 }
        ]);

        const result = await rlhfService.getFeatureUsageByUser('user-001');

        expect(result).toBeDefined();
        expect(result.features).toBeInstanceOf(Array);
      });
    });
  });

  describe('Correction Recording', () => {
    describe('recordCorrection', () => {
      it('should record a user correction to AI output', async () => {
        const correction = {
          interactionId: 'int-001',
          userId: 'user-001',
          originalResponse: 'The valuation is $10M',
          correctedResponse: 'The valuation is $12M',
          correctionType: 'factual_error'
        };

        const result = await rlhfService.recordCorrection(correction);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.correctionId).toBeDefined();
      });

      it('should record correction with explanation', async () => {
        const correction = {
          interactionId: 'int-002',
          userId: 'user-001',
          originalResponse: 'Based on Series A...',
          correctedResponse: 'Based on Series B...',
          correctionType: 'outdated_info',
          explanation: 'We have since closed Series B'
        };

        const result = await rlhfService.recordCorrection(correction);

        expect(result.success).toBe(true);
      });

      it('should throw error when interaction ID is missing', async () => {
        const correction = {
          userId: 'user-001',
          originalResponse: 'Original',
          correctedResponse: 'Corrected'
        };

        await expect(rlhfService.recordCorrection(correction))
          .rejects.toThrow('Interaction ID is required');
      });

      it('should throw error when corrected response is missing', async () => {
        const correction = {
          interactionId: 'int-003',
          userId: 'user-001',
          originalResponse: 'Original'
        };

        await expect(rlhfService.recordCorrection(correction))
          .rejects.toThrow('Corrected response is required');
      });

      it('should categorize correction types', async () => {
        const validTypes = ['factual_error', 'formatting', 'incomplete', 'outdated_info', 'tone', 'other'];

        for (const correctionType of validTypes) {
          const correction = {
            interactionId: `int-${correctionType}`,
            userId: 'user-001',
            originalResponse: 'Original',
            correctedResponse: 'Corrected',
            correctionType
          };

          const result = await rlhfService.recordCorrection(correction);
          expect(result.success).toBe(true);
        }
      });

      it('should throw error for invalid correction type', async () => {
        const correction = {
          interactionId: 'int-004',
          userId: 'user-001',
          originalResponse: 'Original',
          correctedResponse: 'Corrected',
          correctionType: 'invalid_type'
        };

        await expect(rlhfService.recordCorrection(correction))
          .rejects.toThrow('Invalid correction type');
      });
    });
  });

  describe('Privacy Controls', () => {
    describe('updateConsentSettings', () => {
      it('should update user consent for RLHF data collection', async () => {
        const consent = {
          userId: 'user-001',
          collectInteractions: true,
          collectFeedback: true,
          allowAnalytics: true,
          allowDataExport: false
        };

        const result = await rlhfService.updateConsentSettings(consent);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });

      it('should allow user to opt out of all data collection', async () => {
        const consent = {
          userId: 'user-001',
          collectInteractions: false,
          collectFeedback: false,
          allowAnalytics: false,
          allowDataExport: false
        };

        const result = await rlhfService.updateConsentSettings(consent);

        expect(result.success).toBe(true);
      });

      it('should throw error when user ID is missing', async () => {
        const consent = {
          collectInteractions: true,
          collectFeedback: true
        };

        await expect(rlhfService.updateConsentSettings(consent))
          .rejects.toThrow('User ID is required');
      });

      it('should retrieve user consent settings', async () => {
        zerodbService.queryTable.mockResolvedValue([{
          userId: 'user-001',
          collectInteractions: true,
          collectFeedback: true,
          allowAnalytics: true,
          allowDataExport: false
        }]);

        const result = await rlhfService.getConsentSettings('user-001');

        expect(result).toBeDefined();
        expect(result.collectInteractions).toBe(true);
      });

      it('should return default consent settings for new users', async () => {
        zerodbService.queryTable.mockResolvedValue([]);

        const result = await rlhfService.getConsentSettings('new-user');

        expect(result).toBeDefined();
        expect(result.collectInteractions).toBe(true); // Default opt-in
        expect(result.collectFeedback).toBe(true);
      });
    });

    describe('checkConsent', () => {
      it('should check if user has consented before storing data', async () => {
        zerodbService.queryTable.mockResolvedValue([{
          userId: 'user-001',
          collectInteractions: true
        }]);

        const hasConsent = await rlhfService.checkConsent('user-001', 'collectInteractions');

        expect(hasConsent).toBe(true);
      });

      it('should return false if user has opted out', async () => {
        zerodbService.queryTable.mockResolvedValue([{
          userId: 'user-002',
          collectInteractions: false
        }]);

        const hasConsent = await rlhfService.checkConsent('user-002', 'collectInteractions');

        expect(hasConsent).toBe(false);
      });
    });

    describe('deleteUserData', () => {
      it('should delete all RLHF data for a user', async () => {
        zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted: 5 });

        const result = await rlhfService.deleteUserData('user-001');

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.deletedCount).toBeGreaterThanOrEqual(0);
      });

      it('should throw error when user ID is missing', async () => {
        await expect(rlhfService.deleteUserData(null))
          .rejects.toThrow('User ID is required');
      });
    });

    describe('anonymizeData', () => {
      it('should anonymize user data while preserving patterns', async () => {
        const result = await rlhfService.anonymizeData('user-001');

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.anonymizedCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Analytics', () => {
    describe('getFeedbackAnalytics', () => {
      it('should return feedback statistics', async () => {
        zerodbService.queryTable.mockResolvedValue([
          { feedbackType: 'thumbs_up', count: 100 },
          { feedbackType: 'thumbs_down', count: 20 },
          { feedbackType: 'rating', avgRating: 4.2 }
        ]);
        zerodbService.countRows.mockResolvedValue(120);

        const result = await rlhfService.getFeedbackAnalytics();

        expect(result).toBeDefined();
        expect(result.totalFeedback).toBeDefined();
        expect(result.positiveRate).toBeDefined();
      });

      it('should filter analytics by date range', async () => {
        zerodbService.queryTable.mockResolvedValue([]);
        zerodbService.countRows.mockResolvedValue(50);

        const result = await rlhfService.getFeedbackAnalytics({
          startDate: '2026-01-01',
          endDate: '2026-01-31'
        });

        expect(result).toBeDefined();
      });

      it('should filter analytics by feature', async () => {
        zerodbService.queryTable.mockResolvedValue([]);
        zerodbService.countRows.mockResolvedValue(30);

        const result = await rlhfService.getFeedbackAnalytics({
          feature: 'document_analysis'
        });

        expect(result).toBeDefined();
      });

      it('should return analytics by model', async () => {
        zerodbService.queryTable.mockResolvedValue([
          { model: 'gpt-4', count: 80, avgRating: 4.5 },
          { model: 'gpt-3.5', count: 40, avgRating: 3.8 }
        ]);

        const result = await rlhfService.getAnalyticsByModel();

        expect(result).toBeDefined();
        expect(result.models).toBeInstanceOf(Array);
      });
    });

    describe('getInteractionAnalytics', () => {
      it('should return interaction statistics', async () => {
        zerodbService.countRows.mockResolvedValue(500);
        zerodbService.queryTable.mockResolvedValue([
          { avgTokens: 250, avgLatency: 1200 }
        ]);

        const result = await rlhfService.getInteractionAnalytics();

        expect(result).toBeDefined();
        expect(result.totalInteractions).toBeDefined();
      });

      it('should return error rate statistics', async () => {
        zerodbService.countRows
          .mockResolvedValueOnce(500) // total
          .mockResolvedValueOnce(25);  // errors

        const result = await rlhfService.getInteractionAnalytics();

        expect(result).toBeDefined();
        expect(result.errorRate).toBeDefined();
      });
    });

    describe('getCorrectionAnalytics', () => {
      it('should return correction statistics', async () => {
        zerodbService.queryTable.mockResolvedValue([
          { correctionType: 'factual_error', count: 15 },
          { correctionType: 'incomplete', count: 10 },
          { correctionType: 'formatting', count: 5 }
        ]);
        zerodbService.countRows.mockResolvedValue(30);

        const result = await rlhfService.getCorrectionAnalytics();

        expect(result).toBeDefined();
        expect(result.totalCorrections).toBeDefined();
        expect(result.byType).toBeDefined();
      });
    });

    describe('getDashboardMetrics', () => {
      it('should return aggregated dashboard metrics', async () => {
        zerodbService.countRows
          .mockResolvedValueOnce(500)   // interactions
          .mockResolvedValueOnce(120)   // feedback
          .mockResolvedValueOnce(30)    // corrections
          .mockResolvedValueOnce(25);   // errors
        zerodbService.queryTable.mockResolvedValue([
          { avgRating: 4.2 }
        ]);

        const result = await rlhfService.getDashboardMetrics();

        expect(result).toBeDefined();
        expect(result.totalInteractions).toBeDefined();
        expect(result.totalFeedback).toBeDefined();
        expect(result.totalCorrections).toBeDefined();
        expect(result.averageRating).toBeDefined();
      });
    });
  });

  describe('Data Export', () => {
    describe('exportData', () => {
      it('should export RLHF data for training', async () => {
        zerodbService.queryTable.mockResolvedValue([
          {
            prompt: 'Question 1',
            response: 'Answer 1',
            feedbackType: 'thumbs_up',
            rating: 5
          },
          {
            prompt: 'Question 2',
            response: 'Answer 2',
            feedbackType: 'thumbs_down',
            rating: 2
          }
        ]);

        const result = await rlhfService.exportData({
          format: 'json',
          includeInteractions: true,
          includeFeedback: true
        });

        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
        expect(result.format).toBe('json');
      });

      it('should export data in JSONL format', async () => {
        zerodbService.queryTable.mockResolvedValue([
          { prompt: 'Q1', response: 'A1', rating: 5 }
        ]);

        const result = await rlhfService.exportData({
          format: 'jsonl'
        });

        expect(result.format).toBe('jsonl');
      });

      it('should export data in CSV format', async () => {
        zerodbService.queryTable.mockResolvedValue([
          { prompt: 'Q1', response: 'A1', rating: 5 }
        ]);

        const result = await rlhfService.exportData({
          format: 'csv'
        });

        expect(result.format).toBe('csv');
      });

      it('should filter export by date range', async () => {
        zerodbService.queryTable.mockResolvedValue([]);

        const result = await rlhfService.exportData({
          format: 'json',
          startDate: '2026-01-01',
          endDate: '2026-01-31'
        });

        expect(result).toBeDefined();
      });

      it('should filter export by minimum rating', async () => {
        zerodbService.queryTable.mockResolvedValue([
          { prompt: 'Q1', response: 'A1', rating: 5 },
          { prompt: 'Q2', response: 'A2', rating: 4 }
        ]);

        const result = await rlhfService.exportData({
          format: 'json',
          minRating: 4
        });

        expect(result).toBeDefined();
        expect(result.data.length).toBeLessThanOrEqual(2);
      });

      it('should include correction data in export', async () => {
        zerodbService.queryTable.mockResolvedValue([
          {
            prompt: 'Q1',
            response: 'A1',
            correctedResponse: 'A1 corrected',
            correctionType: 'factual_error'
          }
        ]);

        const result = await rlhfService.exportData({
          format: 'json',
          includeCorrections: true
        });

        expect(result.includesCorrections).toBe(true);
      });

      it('should anonymize exported data when requested', async () => {
        zerodbService.queryTable.mockResolvedValue([
          { prompt: 'Q1', response: 'A1', userId: 'user-001' }
        ]);

        const result = await rlhfService.exportData({
          format: 'json',
          anonymize: true
        });

        expect(result.anonymized).toBe(true);
        // User IDs should be hashed or removed
        if (result.data.length > 0) {
          expect(result.data[0].userId).not.toBe('user-001');
        }
      });

      it('should throw error for unsupported format', async () => {
        await expect(rlhfService.exportData({
          format: 'xml'
        })).rejects.toThrow('Unsupported export format');
      });
    });

    describe('exportForUser', () => {
      it('should export all data for a specific user', async () => {
        zerodbService.queryTable.mockResolvedValue([
          { prompt: 'Q1', response: 'A1' },
          { prompt: 'Q2', response: 'A2' }
        ]);

        const result = await rlhfService.exportForUser('user-001');

        expect(result).toBeDefined();
        expect(result.userId).toBe('user-001');
        expect(result.data).toBeDefined();
      });

      it('should throw error when user ID is missing', async () => {
        await expect(rlhfService.exportForUser(null))
          .rejects.toThrow('User ID is required');
      });
    });
  });

  describe('Reward Scoring', () => {
    describe('calculateRewardScore', () => {
      it('should calculate reward score from feedback', async () => {
        const feedback = {
          feedbackType: 'thumbs_up',
          rating: null
        };

        const score = rlhfService.calculateRewardScore(feedback);

        expect(score).toBe(1);
      });

      it('should calculate negative reward for thumbs down', async () => {
        const feedback = {
          feedbackType: 'thumbs_down',
          rating: null
        };

        const score = rlhfService.calculateRewardScore(feedback);

        expect(score).toBe(-1);
      });

      it('should normalize rating to reward score', async () => {
        const feedback = {
          feedbackType: 'rating',
          rating: 5
        };

        const score = rlhfService.calculateRewardScore(feedback);

        expect(score).toBe(1); // 5/5 normalized to 1
      });

      it('should normalize low rating to negative score', async () => {
        const feedback = {
          feedbackType: 'rating',
          rating: 1
        };

        const score = rlhfService.calculateRewardScore(feedback);

        expect(score).toBe(-1); // 1/5 normalized to -1
      });

      it('should return neutral score for middle rating', async () => {
        const feedback = {
          feedbackType: 'rating',
          rating: 3
        };

        const score = rlhfService.calculateRewardScore(feedback);

        expect(score).toBe(0); // 3/5 normalized to 0
      });

      it('should apply correction penalty to reward score', async () => {
        const feedback = {
          feedbackType: 'thumbs_up',
          rating: null,
          hasCorrection: true
        };

        const score = rlhfService.calculateRewardScore(feedback);

        expect(score).toBeLessThan(1); // Penalized for needing correction
      });
    });
  });

  describe('Batch Operations', () => {
    describe('batchStoreFeedback', () => {
      it('should store multiple feedback entries', async () => {
        const feedbackList = [
          { interactionId: 'int-001', userId: 'user-001', feedbackType: 'thumbs_up', sessionId: 'session-001' },
          { interactionId: 'int-002', userId: 'user-001', feedbackType: 'thumbs_down', sessionId: 'session-001' },
          { interactionId: 'int-003', userId: 'user-002', feedbackType: 'rating', rating: 4, sessionId: 'session-002' }
        ];

        const result = await rlhfService.batchStoreFeedback(feedbackList);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.storedCount).toBe(3);
      });

      it('should continue on individual failures', async () => {
        const feedbackList = [
          { interactionId: 'int-001', userId: 'user-001', feedbackType: 'thumbs_up', sessionId: 'session-001' },
          { interactionId: null, userId: 'user-001', feedbackType: 'thumbs_up', sessionId: 'session-001' }, // Invalid
          { interactionId: 'int-003', userId: 'user-002', feedbackType: 'rating', rating: 4, sessionId: 'session-002' }
        ];

        const result = await rlhfService.batchStoreFeedback(feedbackList);

        expect(result.storedCount).toBe(2);
        expect(result.failedCount).toBe(1);
      });
    });

    describe('batchStoreInteractions', () => {
      it('should store multiple interactions', async () => {
        const interactions = [
          { userId: 'user-001', sessionId: 's-001', prompt: 'Q1', response: 'A1', model: 'gpt-4' },
          { userId: 'user-002', sessionId: 's-002', prompt: 'Q2', response: 'A2', model: 'gpt-4' }
        ];

        const result = await rlhfService.batchStoreInteractions(interactions);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.storedCount).toBe(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle ZeroDB errors gracefully', async () => {
      zerodbService.insertRows.mockRejectedValue(new Error('ZeroDB connection failed'));

      const feedback = {
        interactionId: 'int-001',
        userId: 'user-001',
        feedbackType: 'thumbs_up',
        sessionId: 'session-001'
      };

      await expect(rlhfService.captureFeedback(feedback))
        .rejects.toThrow('ZeroDB connection failed');
    });

    it('should handle query errors gracefully', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('Query failed'));

      await expect(rlhfService.getFeedbackAnalytics())
        .rejects.toThrow('Query failed');
    });
  });
});
