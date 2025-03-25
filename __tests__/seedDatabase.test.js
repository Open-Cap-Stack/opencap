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
      expect(Company.create).toHaveBeenCalledTimes(expect.any(Number));
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
      expect(ShareClass.create).toHaveBeenCalledTimes(expect.any(Number));
    });
    
    it('should seed sample financial reports', async () => {
      // Setup
      FinancialReport.exists.mockResolvedValue(false);
      FinancialReport.create.mockImplementation(data => Promise.resolve(data));
      
      // Test
      await seedDatabase();
      
      // Verify
      expect(FinancialReport.exists).toHaveBeenCalled();
      expect(FinancialReport.create).toHaveBeenCalledTimes(expect.any(Number));
    });
  });
  
  describe('Clear Database Functionality', () => {
    it('should clear all collections in development environment', async () => {
      // Setup
      process.env.NODE_ENV = 'development';
      const collections = [
        { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }) },
        { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 3 }) }
      ];
      mongoose.connection.collections = collections;
      
      // Test
      await clearDatabase();
      
      // Verify
      collections.forEach(collection => {
        expect(collection.deleteMany).toHaveBeenCalledWith({});
      });
      
      // Reset
      process.env.NODE_ENV = 'test';
    });
    
    it('should not clear collections in production environment', async () => {
      // Setup
      process.env.NODE_ENV = 'production';
      const collections = [
        { deleteMany: jest.fn() },
        { deleteMany: jest.fn() }
      ];
      mongoose.connection.collections = collections;
      
      // Test
      await expect(clearDatabase()).rejects.toThrow();
      
      // Verify
      collections.forEach(collection => {
        expect(collection.deleteMany).not.toHaveBeenCalled();
      });
      
      // Reset
      process.env.NODE_ENV = 'test';
    });
  });
});
