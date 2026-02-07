/**
 * Fundraise Model Controller Tests
 * Issue #195: Interactive Fundraising Modeling Engine
 *
 * Comprehensive tests for fundraising model controller following TDD principles.
 * Tests written before controller implementation.
 */

// Mock the models and services before requiring controller
jest.mock('../../../models/FundraisingModel');
jest.mock('../../../models/ModelScenario');
jest.mock('../../../services/dilutionCalculationService');

const FundraisingModel = require('../../../models/FundraisingModel');
const ModelScenario = require('../../../models/ModelScenario');
const DilutionCalculationService = require('../../../services/dilutionCalculationService');
const fundraiseModelController = require('../../../controllers/fundraiseModelController');

// Manually assign mock methods for ModelScenario (ZeroDB createModel pattern)
ModelScenario.findOne = jest.fn();
ModelScenario.find = jest.fn();
ModelScenario.create = jest.fn();
ModelScenario.deleteMany = jest.fn();

describe('FundraiseModelController', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            query: {},
            user: {
                userId: 'user123',
                email: 'test@example.com'
            }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            send: jest.fn().mockReturnThis()
        };

        jest.clearAllMocks();
    });

    describe('createModel', () => {
        it('should create a new fundraising model successfully', async () => {
            const modelData = {
                companyId: 'company123',
                name: 'Series A Scenario',
                modelType: 'series_a',
                baseCapTable: {
                    totalShares: 10000000,
                    fullyDilutedShares: 10000000,
                    shareClasses: [],
                    stakeholders: [],
                    optionPool: { allocated: 0, unallocated: 0, total: 0 }
                },
                financing: {
                    amount: 5000000,
                    pricePerShare: 2.00,
                    investors: []
                }
            };

            mockReq.body = modelData;

            const mockModel = {
                ...modelData,
                modelId: 'fm_123456',
                status: 'draft',
                createdBy: 'user123'
            };

            FundraisingModel.create.mockResolvedValue(mockModel);

            await fundraiseModelController.createModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    modelId: 'fm_123456',
                    status: 'draft'
                })
            });
        });

        it('should return 400 for missing required fields', async () => {
            mockReq.body = {
                companyId: 'company123'
                // Missing name, modelType, etc.
            };

            await fundraiseModelController.createModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: expect.stringContaining('required')
            });
        });

        it('should handle database errors gracefully', async () => {
            mockReq.body = {
                companyId: 'company123',
                name: 'Test Model',
                modelType: 'series_a',
                baseCapTable: {},
                financing: {}
            };

            FundraisingModel.create.mockRejectedValue(new Error('Database connection failed'));

            await fundraiseModelController.createModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Database connection failed'
            });
        });
    });

    describe('getModel', () => {
        it('should retrieve a model by ID', async () => {
            mockReq.params.id = 'fm_123456';

            const mockModel = {
                modelId: 'fm_123456',
                companyId: 'company123',
                name: 'Series A Model',
                status: 'calculated'
            };

            FundraisingModel.findOne.mockResolvedValue(mockModel);

            await fundraiseModelController.getModel(mockReq, mockRes);

            expect(FundraisingModel.findOne).toHaveBeenCalledWith({ modelId: 'fm_123456' });
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: mockModel
            });
        });

        it('should return 404 if model not found', async () => {
            mockReq.params.id = 'nonexistent';

            FundraisingModel.findOne.mockResolvedValue(null);

            await fundraiseModelController.getModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Fundraising model not found'
            });
        });
    });

    describe('updateModel', () => {
        it('should update a model successfully', async () => {
            mockReq.params.id = 'fm_123456';
            mockReq.body = {
                name: 'Updated Series A Model',
                financing: {
                    amount: 6000000
                }
            };

            const existingModel = {
                modelId: 'fm_123456',
                status: 'draft'
            };

            const updatedModel = {
                ...existingModel,
                ...mockReq.body,
                updatedBy: 'user123'
            };

            FundraisingModel.findOne.mockResolvedValue(existingModel);
            FundraisingModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
            FundraisingModel.findOne.mockResolvedValueOnce(existingModel).mockResolvedValueOnce(updatedModel);

            await fundraiseModelController.updateModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    name: 'Updated Series A Model'
                })
            });
        });

        it('should prevent updates to finalized models', async () => {
            mockReq.params.id = 'fm_123456';
            mockReq.body = { name: 'New Name' };

            const finalizedModel = {
                modelId: 'fm_123456',
                status: 'finalized'
            };

            FundraisingModel.findOne.mockResolvedValue(finalizedModel);

            await fundraiseModelController.updateModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: expect.stringContaining('finalized')
            });
        });
    });

    describe('calculateModel', () => {
        it('should calculate dilution and pro-forma cap table', async () => {
            mockReq.params.id = 'fm_123456';

            const mockModel = {
                modelId: 'fm_123456',
                companyId: 'company123',
                baseCapTable: {
                    totalShares: 10000000,
                    stakeholders: [
                        { stakeholderId: 'founder-1', shares: 10000000, ownershipPercentage: 100 }
                    ]
                },
                financing: {
                    amount: 5000000,
                    pricePerShare: 2.00,
                    investors: [{ investorId: 'inv-1', investmentAmount: 5000000 }]
                },
                status: 'draft'
            };

            const proFormaCapTable = {
                totalShares: 12500000,
                postMoneyValuation: 25000000,
                stakeholders: [
                    { stakeholderId: 'founder-1', shares: 10000000, ownershipPercentage: 80 },
                    { stakeholderId: 'inv-1', shares: 2500000, ownershipPercentage: 20 }
                ]
            };

            const dilutionAnalysis = {
                averageDilution: 20,
                foundersDilution: 20,
                byStakeholder: [
                    {
                        stakeholderId: 'founder-1',
                        preFunding: 100,
                        postFunding: 80,
                        dilutionPercentage: 20
                    }
                ]
            };

            FundraisingModel.findOne.mockResolvedValue(mockModel);
            DilutionCalculationService.calculateProFormaCapTable.mockReturnValue(proFormaCapTable);
            DilutionCalculationService.calculateDilution.mockReturnValue(dilutionAnalysis);
            FundraisingModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
            FundraisingModel.findOne.mockResolvedValueOnce(mockModel).mockResolvedValueOnce({
                ...mockModel,
                proFormaCapTable,
                dilutionAnalysis,
                status: 'calculated'
            });

            await fundraiseModelController.calculateModel(mockReq, mockRes);

            expect(DilutionCalculationService.calculateProFormaCapTable).toHaveBeenCalled();
            expect(DilutionCalculationService.calculateDilution).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    status: 'calculated',
                    proFormaCapTable: expect.any(Object),
                    dilutionAnalysis: expect.any(Object)
                })
            });
        });

        it('should return 404 if model not found', async () => {
            mockReq.params.id = 'nonexistent';

            FundraisingModel.findOne.mockResolvedValue(null);

            await fundraiseModelController.calculateModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should handle calculation errors', async () => {
            mockReq.params.id = 'fm_123456';

            const mockModel = {
                modelId: 'fm_123456',
                baseCapTable: {},
                financing: {}
            };

            FundraisingModel.findOne.mockResolvedValue(mockModel);
            DilutionCalculationService.calculateProFormaCapTable.mockImplementation(() => {
                throw new Error('Invalid cap table structure');
            });

            await fundraiseModelController.calculateModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid cap table structure'
            });
        });
    });

    describe('calculateWaterfall', () => {
        it('should calculate waterfall distribution for exit scenario', async () => {
            mockReq.params.id = 'fm_123456';
            mockReq.body = {
                exitValuation: 50000000
            };

            const mockModel = {
                modelId: 'fm_123456',
                proFormaCapTable: {
                    shareClasses: [
                        { shareClassId: 'common-1', shares: 10000000, preferenceType: 'common' },
                        { shareClassId: 'series-a', shares: 2500000, preferenceType: 'preferred' }
                    ]
                },
                status: 'calculated'
            };

            const waterfallResult = {
                exitValuation: 50000000,
                shareClassResults: [],
                summary: {
                    totalDistributed: 50000000
                }
            };

            FundraisingModel.findOne.mockResolvedValue(mockModel);
            DilutionCalculationService.calculateWaterfallWithNewRound.mockReturnValue(waterfallResult);

            await fundraiseModelController.calculateWaterfall(mockReq, mockRes);

            expect(DilutionCalculationService.calculateWaterfallWithNewRound).toHaveBeenCalledWith(
                mockModel.proFormaCapTable,
                50000000,
                expect.any(Object)
            );
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: waterfallResult
            });
        });

        it('should require calculated model for waterfall', async () => {
            mockReq.params.id = 'fm_123456';
            mockReq.body = { exitValuation: 50000000 };

            const draftModel = {
                modelId: 'fm_123456',
                status: 'draft'
            };

            FundraisingModel.findOne.mockResolvedValue(draftModel);

            await fundraiseModelController.calculateWaterfall(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: expect.stringContaining('calculated')
            });
        });
    });

    describe('addScenario', () => {
        it('should add a new scenario to model', async () => {
            mockReq.params.id = 'fm_123456';
            mockReq.body = {
                name: 'High Valuation Scenario',
                scenarioType: 'best_case',
                financingOverrides: {
                    pricePerShare: 3.00
                }
            };

            const mockModel = {
                modelId: 'fm_123456',
                companyId: 'company123'
            };

            const mockScenario = {
                scenarioId: 'scn_789',
                modelId: 'fm_123456',
                ...mockReq.body,
                createdBy: 'user123'
            };

            FundraisingModel.findOne.mockResolvedValue(mockModel);
            ModelScenario.create.mockResolvedValue(mockScenario);

            await fundraiseModelController.addScenario(mockReq, mockRes);

            expect(ModelScenario.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    modelId: 'fm_123456',
                    companyId: 'company123',
                    name: 'High Valuation Scenario',
                    createdBy: 'user123'
                })
            );
            expect(mockRes.status).toHaveBeenCalledWith(201);
        });
    });

    describe('getScenario', () => {
        it('should retrieve a specific scenario', async () => {
            mockReq.params.id = 'fm_123456';
            mockReq.params.scenarioId = 'scn_789';

            const mockScenario = {
                scenarioId: 'scn_789',
                modelId: 'fm_123456',
                name: 'Scenario 1'
            };

            ModelScenario.findOne.mockResolvedValue(mockScenario);

            await fundraiseModelController.getScenario(mockReq, mockRes);

            expect(ModelScenario.findOne).toHaveBeenCalledWith({ scenarioId: 'scn_789' });
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getProFormaCapTable', () => {
        it('should return pro-forma cap table', async () => {
            mockReq.params.id = 'fm_123456';

            const mockModel = {
                modelId: 'fm_123456',
                status: 'calculated',
                proFormaCapTable: {
                    totalShares: 12500000,
                    stakeholders: []
                }
            };

            FundraisingModel.findOne.mockResolvedValue(mockModel);

            await fundraiseModelController.getProFormaCapTable(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: mockModel.proFormaCapTable
            });
        });

        it('should require calculated model', async () => {
            mockReq.params.id = 'fm_123456';

            const draftModel = {
                modelId: 'fm_123456',
                status: 'draft'
            };

            FundraisingModel.findOne.mockResolvedValue(draftModel);

            await fundraiseModelController.getProFormaCapTable(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    describe('exportModel', () => {
        it('should export model as JSON', async () => {
            mockReq.params.id = 'fm_123456';
            mockReq.query.format = 'json';

            const mockModel = {
                modelId: 'fm_123456',
                name: 'Series A Model',
                proFormaCapTable: {},
                dilutionAnalysis: {}
            };

            FundraisingModel.findOne.mockResolvedValue(mockModel);

            await fundraiseModelController.exportModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    modelId: 'fm_123456',
                    exportedAt: expect.any(String)
                })
            });
        });

        it('should export model as CSV', async () => {
            mockReq.params.id = 'fm_123456';
            mockReq.query.format = 'csv';

            const mockModel = {
                modelId: 'fm_123456',
                proFormaCapTable: {
                    stakeholders: [
                        {
                            name: 'Founder 1',
                            shares: 10000000,
                            ownershipPercentage: 80
                        }
                    ]
                }
            };

            FundraisingModel.findOne.mockResolvedValue(mockModel);
            mockRes.send = jest.fn();

            await fundraiseModelController.exportModel(mockReq, mockRes);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
            expect(mockRes.send).toHaveBeenCalled();
        });
    });

    describe('deleteModel', () => {
        it('should delete a model', async () => {
            mockReq.params.id = 'fm_123456';

            const mockModel = {
                modelId: 'fm_123456',
                status: 'draft'
            };

            FundraisingModel.findOne.mockResolvedValue(mockModel);
            FundraisingModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
            ModelScenario.deleteMany.mockResolvedValue({ deletedCount: 2 });

            await fundraiseModelController.deleteModel(mockReq, mockRes);

            expect(FundraisingModel.deleteOne).toHaveBeenCalledWith({ modelId: 'fm_123456' });
            expect(ModelScenario.deleteMany).toHaveBeenCalledWith({ modelId: 'fm_123456' });
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: expect.stringContaining('deleted')
            });
        });

        it('should prevent deletion of finalized models', async () => {
            mockReq.params.id = 'fm_123456';

            const finalizedModel = {
                modelId: 'fm_123456',
                status: 'finalized'
            };

            FundraisingModel.findOne.mockResolvedValue(finalizedModel);

            await fundraiseModelController.deleteModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(FundraisingModel.deleteOne).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle malformed request data', async () => {
            mockReq.body = 'invalid json';

            await fundraiseModelController.createModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should validate numeric fields', async () => {
            mockReq.body = {
                companyId: 'company123',
                name: 'Test',
                modelType: 'series_a',
                financing: {
                    amount: -5000000, // Negative amount
                    pricePerShare: 2.00
                }
            };

            await fundraiseModelController.createModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should handle concurrent modification conflicts', async () => {
            mockReq.params.id = 'fm_123456';
            mockReq.body = { name: 'Updated Name' };

            FundraisingModel.findOne.mockResolvedValue({ modelId: 'fm_123456', status: 'draft' });
            FundraisingModel.updateOne.mockResolvedValue({ modifiedCount: 0 });

            await fundraiseModelController.updateModel(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(409);
        });
    });
});
