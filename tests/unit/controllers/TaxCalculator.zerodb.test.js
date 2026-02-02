/**
 * TaxCalculator Controller ZeroDB Migration Tests
 * Issue #20 - Batch 3 Controllers
 */

const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the databaseAdapter
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

// Mock mongoose for ObjectId validation
jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn().mockReturnValue(true),
    },
  },
}));

// Import controller after mocking
const {
  calculateTax,
  getTaxCalculations,
  getTaxCalculationById,
  deleteTaxCalculation,
  updateTaxCalculation,
} = require('../../../controllers/TaxCalculator');

const mongoose = require('mongoose');

describe('TaxCalculator Controller - ZeroDB Migration', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.Types.ObjectId.isValid.mockReturnValue(true);
    req = {
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('calculateTax', () => {
    it('should create a tax calculation successfully', async () => {
      const taxData = {
        calculationId: 'TAX001',
        SaleScenario: 'IPO',
        ShareClassInvolved: 'Common',
        SaleAmount: 100000,
        TaxRate: 0.25,
        TaxImplication: 'Capital Gains',
        TaxDueDate: '2024-04-15',
      };
      req.body = taxData;

      const mockSavedCalculation = {
        _id: 'calc123',
        ...taxData,
        CalculatedTax: 25000,
      };

      databaseAdapter.create.mockResolvedValue(mockSavedCalculation);

      await calculateTax(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('TaxCalculator', {
        ...taxData,
        CalculatedTax: 25000,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedCalculation);
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = { calculationId: 'TAX001' };

      await calculateTax(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid tax calculation data' });
    });

    it('should return 500 on database error', async () => {
      req.body = {
        calculationId: 'TAX001',
        SaleScenario: 'IPO',
        ShareClassInvolved: 'Common',
        SaleAmount: 100000,
        TaxRate: 0.25,
        TaxImplication: 'Capital Gains',
        TaxDueDate: '2024-04-15',
      };
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await calculateTax(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getTaxCalculations', () => {
    it('should return all tax calculations', async () => {
      const mockCalculations = [
        { _id: '1', calculationId: 'TAX001', SaleAmount: 100000 },
        { _id: '2', calculationId: 'TAX002', SaleAmount: 200000 },
      ];

      databaseAdapter.find.mockResolvedValue(mockCalculations);

      await getTaxCalculations(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('TaxCalculator', {});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ taxCalculations: mockCalculations });
    });

    it('should return 404 when no calculations found', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await getTaxCalculations(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'No tax calculations found' });
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await getTaxCalculations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('getTaxCalculationById', () => {
    it('should return a tax calculation by ID', async () => {
      const mockCalculation = {
        _id: 'calc123',
        calculationId: 'TAX001',
        SaleAmount: 100000,
      };
      req.params.id = 'calc123';

      databaseAdapter.findById.mockResolvedValue(mockCalculation);

      await getTaxCalculationById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('TaxCalculator', 'calc123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ taxCalculation: mockCalculation });
    });

    it('should return 400 for invalid ID format', async () => {
      req.params.id = 'invalid-id';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await getTaxCalculationById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid tax calculation ID format' });
    });

    it('should return 404 when calculation not found', async () => {
      req.params.id = 'nonexistent';
      databaseAdapter.findById.mockResolvedValue(null);

      await getTaxCalculationById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Tax calculation not found' });
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'calc123';
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await getTaxCalculationById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('deleteTaxCalculation', () => {
    it('should delete a tax calculation successfully', async () => {
      req.params.id = 'calc123';
      const mockDeletedCalculation = { _id: 'calc123', calculationId: 'TAX001' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedCalculation);

      await deleteTaxCalculation(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('TaxCalculator', 'calc123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Tax calculation deleted' });
    });

    it('should return 400 for invalid ID format', async () => {
      req.params.id = 'invalid-id';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await deleteTaxCalculation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid tax calculation ID format' });
    });

    it('should return 404 when calculation not found', async () => {
      req.params.id = 'nonexistent';
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await deleteTaxCalculation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Tax calculation not found' });
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'calc123';
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await deleteTaxCalculation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('updateTaxCalculation', () => {
    it('should update a tax calculation successfully', async () => {
      req.params.id = 'calc123';
      req.body = { SaleAmount: 150000 };

      const existingCalculation = {
        _id: 'calc123',
        calculationId: 'TAX001',
        SaleAmount: 100000,
        TaxRate: 0.25,
      };

      const updatedCalculation = {
        _id: 'calc123',
        calculationId: 'TAX001',
        SaleAmount: 150000,
        TaxRate: 0.25,
        CalculatedTax: 37500,
      };

      databaseAdapter.findById.mockResolvedValue(existingCalculation);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedCalculation);

      await updateTaxCalculation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ taxCalculation: updatedCalculation });
    });

    it('should return 400 for invalid ID format', async () => {
      req.params.id = 'invalid-id';
      req.body = { SaleAmount: 150000 };
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await updateTaxCalculation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid tax calculation ID format' });
    });

    it('should return 404 when calculation not found during update', async () => {
      req.params.id = 'nonexistent';
      req.body = { SaleAmount: 150000 };
      databaseAdapter.findById.mockResolvedValue(null);

      await updateTaxCalculation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Tax calculation not found' });
    });

    it('should return 400 for invalid numeric values', async () => {
      req.params.id = 'calc123';
      req.body = { TaxRate: 1.5 }; // Invalid: > 1

      const existingCalculation = {
        _id: 'calc123',
        SaleAmount: 100000,
        TaxRate: 0.25,
      };

      databaseAdapter.findById.mockResolvedValue(existingCalculation);

      await updateTaxCalculation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid tax calculation data' });
    });

    it('should return 500 on database error', async () => {
      req.params.id = 'calc123';
      req.body = { SaleScenario: 'M&A' };
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await updateTaxCalculation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });
});
