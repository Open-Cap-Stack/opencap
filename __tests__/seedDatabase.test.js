/**
 * Test file for Database Seed Script
 * 
 * [Feature] OCDI-106: Database seed script
 * 
 * Tests for the database seeding functionality to ensure proper data initialization
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const ShareClass = require('../models/ShareClass');
const FinancialReport = require('../models/financialReport');
const { seedDatabase, clearDatabase } = require('../scripts/seedDatabase');

// Mock models
jest.mock('../models/User');
jest.mock('../models/Company');
jest.mock('../models/ShareClass');
jest.mock('../models/financialReport');

describe('Database Seed Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup FinancialReport.create mock for tests
    FinancialReport.create = jest.fn().mockImplementation(data => Promise.resolve(data));
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Seed Database Functionality', () => {
    it('should seed test admin user', async () => {
      // Setup
      User.exists.mockResolvedValue(false);
      User.create.mockImplementation(data => Promise.resolve(data));
      
      // Test
      await seedDatabase();
      
      // Verify
      expect(User.exists).toHaveBeenCalled();
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        email: expect.any(String),
        role: 'admin'
      }));
    });
    
    it('should skip seeding if admin user already exists', async () => {
      // Setup
      User.exists.mockResolvedValue(true);
      
      // Test
      await seedDatabase();
      
      // Verify
      expect(User.exists).toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
    });
    
    it('should seed sample companies', async () => {
      // Setup
      Company.exists.mockResolvedValue(false);
      Company.create.mockImplementation(data => Promise.resolve(data));
      
      // Test
      await seedDatabase();
      
      // Verify
      expect(Company.exists).toHaveBeenCalled();
      expect(Company.create).toHaveBeenCalled();
      expect(Company.create).toHaveBeenCalledWith(expect.objectContaining({
        companyId: expect.any(String),
        CompanyName: expect.any(String)
      }));
    });
    
    it('should seed sample share classes', async () => {
      // Setup
      ShareClass.exists.mockResolvedValue(false);
      ShareClass.create.mockImplementation(data => Promise.resolve(data));
      
      // Test
      await seedDatabase();
      
      // Verify
      expect(ShareClass.exists).toHaveBeenCalled();
      expect(ShareClass.create).toHaveBeenCalled();
    });
    
    it('should seed sample financial reports', async () => {
      // Setup
      FinancialReport.exists.mockResolvedValue(false);
      
      // Test
      await seedDatabase();
      
      // Verify
      expect(FinancialReport.exists).toHaveBeenCalled();
      expect(FinancialReport.create).toHaveBeenCalled();
    });
  });
  
  describe('Clear Database Functionality', () => {
    it('should clear all collections in development environment', async () => {
      // Setup
      process.env.NODE_ENV = 'development';
      mongoose.connection.collections = {
        users: { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }) },
        companies: { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 3 }) }
      };
      
      // Test
      await clearDatabase();
      
      // Verify
      expect(mongoose.connection.collections.users.deleteMany).toHaveBeenCalledWith({});
      expect(mongoose.connection.collections.companies.deleteMany).toHaveBeenCalledWith({});
      
      // Reset
      process.env.NODE_ENV = 'test';
    });
    
    it('should not clear collections in production environment', async () => {
      // Setup
      process.env.NODE_ENV = 'production';
      mongoose.connection.collections = {
        users: { deleteMany: jest.fn() },
        companies: { deleteMany: jest.fn() }
      };
      
      // Test
      await expect(clearDatabase()).rejects.toThrow();
      
      // Verify
      expect(mongoose.connection.collections.users.deleteMany).not.toHaveBeenCalled();
      expect(mongoose.connection.collections.companies.deleteMany).not.toHaveBeenCalled();
      
      // Reset
      process.env.NODE_ENV = 'test';
    });
  });
});
