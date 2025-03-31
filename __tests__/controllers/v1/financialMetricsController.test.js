/**
 * Financial Metrics Controller Tests
 * 
 * [Feature] OCAE-402: Create financial metrics calculation endpoints
 * Testing controller for financial metrics calculation with proper BDD patterns
 */

const mongoose = require('mongoose');
const { expect } = require('chai');
const sinon = require('sinon');

// Import the controller
const financialMetricsController = require('../../../controllers/v1/financialMetricsController');

// Import models
const FinancialReport = require('../../../models/financialReport');
const Company = require('../../../models/Company');

describe('Financial Metrics Controller', () => {
  // Setup sandbox for stubs and mocks
  let sandbox;
  
  // Mock objects
  let mockReq;
  let mockRes;
  
  // Sample data
  const sampleFinancialData = {
    companyId: new mongoose.Types.ObjectId(),
    revenueData: [
      { quarter: 'Q1', year: 2024, value: 100000 },
      { quarter: 'Q2', year: 2024, value: 120000 },
      { quarter: 'Q3', year: 2024, value: 150000 },
      { quarter: 'Q4', year: 2024, value: 180000 }
    ],
    expenseData: [
      { quarter: 'Q1', year: 2024, value: 70000 },
      { quarter: 'Q2', year: 2024, value: 75000 },
      { quarter: 'Q3', year: 2024, value: 90000 },
      { quarter: 'Q4', year: 2024, value: 100000 }
    ],
    assetData: [
      { quarter: 'Q1', year: 2024, value: 500000 },
      { quarter: 'Q2', year: 2024, value: 520000 },
      { quarter: 'Q3', year: 2024, value: 530000 },
      { quarter: 'Q4', year: 2024, value: 550000 }
    ],
    liabilityData: [
      { quarter: 'Q1', year: 2024, value: 300000 },
      { quarter: 'Q2', year: 2024, value: 290000 },
      { quarter: 'Q3', year: 2024, value: 280000 },
      { quarter: 'Q4', year: 2024, value: 270000 }
    ]
  };
  
  beforeEach(() => {
    // Create sandbox for test isolation
    sandbox = sinon.createSandbox();
    
    // Mock request and response objects
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: new mongoose.Types.ObjectId() }
    };
    
    mockRes = {
      status: sandbox.stub().returnsThis(),
      json: sandbox.stub()
    };
  });
  
  afterEach(() => {
    // Clean up sandbox
    sandbox.restore();
  });
  
  describe('calculateProfitabilityMetrics', () => {
    it('should calculate gross profit margin correctly', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-full';
      
      const financialReportFindStub = sandbox.stub(FinancialReport, 'find').resolves([
        {
          companyId: sampleFinancialData.companyId,
          reportType: 'income',
          reportingPeriod: { year: 2024, quarter: 'full' },
          data: {
            revenue: 550000,
            costOfGoodsSold: 330000
          }
        }
      ]);
      
      // Act
      await financialMetricsController.calculateProfitabilityMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(200)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('grossProfitMargin');
      expect(responseData.grossProfitMargin).to.be.closeTo(0.4, 0.01); // 40% margin
      expect(financialReportFindStub.calledOnce).to.be.true;
    });
    
    it('should calculate operating profit margin correctly', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-full';
      
      sandbox.stub(FinancialReport, 'find').resolves([
        {
          companyId: sampleFinancialData.companyId,
          reportType: 'income',
          reportingPeriod: { year: 2024, quarter: 'full' },
          data: {
            revenue: 550000,
            operatingExpenses: 220000,
            operatingIncome: 330000
          }
        }
      ]);
      
      // Act
      await financialMetricsController.calculateProfitabilityMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(200)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('operatingProfitMargin');
      expect(responseData.operatingProfitMargin).to.be.closeTo(0.6, 0.01); // 60% margin
    });
    
    it('should handle missing financial data gracefully', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-full';
      
      sandbox.stub(FinancialReport, 'find').resolves([]);
      
      // Act
      await financialMetricsController.calculateProfitabilityMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(404)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.include('No financial data available');
    });
    
    it('should handle invalid period format gracefully', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = 'invalid-period-format';
      
      // Act
      await financialMetricsController.calculateProfitabilityMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(400)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.include('Invalid period format');
    });
  });
  
  describe('calculateLiquidityMetrics', () => {
    it('should calculate current ratio correctly', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-Q4';
      
      sandbox.stub(FinancialReport, 'find').resolves([
        {
          companyId: sampleFinancialData.companyId,
          reportType: 'balance',
          reportingPeriod: { year: 2024, quarter: 'Q4' },
          data: {
            currentAssets: 200000,
            currentLiabilities: 100000
          }
        }
      ]);
      
      // Act
      await financialMetricsController.calculateLiquidityMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(200)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('currentRatio');
      expect(responseData.currentRatio).to.be.closeTo(2.0, 0.01); // 2.0 ratio
    });
    
    it('should calculate quick ratio correctly', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-Q4';
      
      sandbox.stub(FinancialReport, 'find').resolves([
        {
          companyId: sampleFinancialData.companyId,
          reportType: 'balance',
          reportingPeriod: { year: 2024, quarter: 'Q4' },
          data: {
            currentAssets: 200000,
            inventory: 50000,
            currentLiabilities: 100000
          }
        }
      ]);
      
      // Act
      await financialMetricsController.calculateLiquidityMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(200)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('quickRatio');
      expect(responseData.quickRatio).to.be.closeTo(1.5, 0.01); // 1.5 ratio
    });
  });
  
  describe('calculateSolvencyMetrics', () => {
    it('should calculate debt-to-equity ratio correctly', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-Q4';
      
      sandbox.stub(FinancialReport, 'find').resolves([
        {
          companyId: sampleFinancialData.companyId,
          reportType: 'balance',
          reportingPeriod: { year: 2024, quarter: 'Q4' },
          data: {
            totalLiabilities: 300000,
            equity: 200000
          }
        }
      ]);
      
      // Act
      await financialMetricsController.calculateSolvencyMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(200)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('debtToEquityRatio');
      expect(responseData.debtToEquityRatio).to.be.closeTo(1.5, 0.01); // 1.5 ratio
    });
    
    it('should calculate interest coverage ratio correctly', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-full';
      
      sandbox.stub(FinancialReport, 'find').resolves([
        {
          companyId: sampleFinancialData.companyId,
          reportType: 'income',
          reportingPeriod: { year: 2024, quarter: 'full' },
          data: {
            operatingIncome: 100000,
            interestExpense: 20000
          }
        }
      ]);
      
      // Act
      await financialMetricsController.calculateSolvencyMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(200)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('interestCoverageRatio');
      expect(responseData.interestCoverageRatio).to.be.closeTo(5.0, 0.01); // 5.0 ratio
    });
  });
  
  describe('calculateEfficiencyMetrics', () => {
    it('should calculate asset turnover ratio correctly', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-full';
      
      sandbox.stub(FinancialReport, 'find')
        .onFirstCall().resolves([
          {
            companyId: sampleFinancialData.companyId,
            reportType: 'income',
            reportingPeriod: { year: 2024, quarter: 'full' },
            data: {
              revenue: 500000
            }
          }
        ])
        .onSecondCall().resolves([
          {
            companyId: sampleFinancialData.companyId,
            reportType: 'balance',
            reportingPeriod: { year: 2024, quarter: 'Q4' },
            data: {
              totalAssets: 1000000
            }
          },
          {
            companyId: sampleFinancialData.companyId,
            reportType: 'balance',
            reportingPeriod: { year: 2023, quarter: 'Q4' },
            data: {
              totalAssets: 900000
            }
          }
        ]);
      
      // Act
      await financialMetricsController.calculateEfficiencyMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(200)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('assetTurnoverRatio');
      expect(responseData.assetTurnoverRatio).to.be.closeTo(0.526, 0.01); // ~0.53 ratio (500000 / 950000)
    });
    
    it('should calculate inventory turnover ratio correctly', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-full';
      
      sandbox.stub(FinancialReport, 'find')
        .onFirstCall().resolves([
          {
            companyId: sampleFinancialData.companyId,
            reportType: 'income',
            reportingPeriod: { year: 2024, quarter: 'full' },
            data: {
              costOfGoodsSold: 300000
            }
          }
        ])
        .onSecondCall().resolves([
          {
            companyId: sampleFinancialData.companyId,
            reportType: 'balance',
            reportingPeriod: { year: 2024, quarter: 'Q4' },
            data: {
              inventory: 50000
            }
          },
          {
            companyId: sampleFinancialData.companyId,
            reportType: 'balance',
            reportingPeriod: { year: 2023, quarter: 'Q4' },
            data: {
              inventory: 40000
            }
          }
        ]);
      
      // Act
      await financialMetricsController.calculateEfficiencyMetrics(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status.calledWith(200)).to.be.true;
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('inventoryTurnoverRatio');
      expect(responseData.inventoryTurnoverRatio).to.be.closeTo(6.67, 0.1); // ~6.67 ratio (300000 / 45000)
    });
  });
  
  describe('calculateComprehensiveMetrics', () => {
    it('should combine multiple metrics into a comprehensive dashboard', async () => {
      // Arrange
      mockReq.params.companyId = sampleFinancialData.companyId.toString();
      mockReq.query.period = '2024-full';
      
      // Create stubs for each individual metric function
      const profitabilityStub = sandbox.stub(financialMetricsController, 'calculateProfitabilityMetrics')
        .callsFake((req, res) => {
          res.metrics = { grossProfitMargin: 0.4, operatingProfitMargin: 0.3, netProfitMargin: 0.2 };
          return Promise.resolve();
        });
        
      const liquidityStub = sandbox.stub(financialMetricsController, 'calculateLiquidityMetrics')
        .callsFake((req, res) => {
          res.metrics = { ...res.metrics, currentRatio: 2.0, quickRatio: 1.5 };
          return Promise.resolve();
        });
        
      const solvencyStub = sandbox.stub(financialMetricsController, 'calculateSolvencyMetrics')
        .callsFake((req, res) => {
          res.metrics = { ...res.metrics, debtToEquityRatio: 0.8, interestCoverageRatio: 5.0 };
          return Promise.resolve();
        });
        
      const efficiencyStub = sandbox.stub(financialMetricsController, 'calculateEfficiencyMetrics')
        .callsFake((req, res) => {
          res.metrics = { ...res.metrics, assetTurnoverRatio: 1.2, inventoryTurnoverRatio: 6.0 };
          return Promise.resolve();
        });
      
      // Act
      await financialMetricsController.calculateComprehensiveMetrics(mockReq, mockRes);
      
      // Assert
      expect(profitabilityStub.calledOnce).to.be.true;
      expect(liquidityStub.calledOnce).to.be.true;
      expect(solvencyStub.calledOnce).to.be.true;
      expect(efficiencyStub.calledOnce).to.be.true;
      expect(mockRes.status.calledWith(200)).to.be.true;
      
      const responseData = mockRes.json.args[0][0];
      expect(responseData).to.have.property('profitability');
      expect(responseData).to.have.property('liquidity');
      expect(responseData).to.have.property('solvency');
      expect(responseData).to.have.property('efficiency');
    });
  });
});
