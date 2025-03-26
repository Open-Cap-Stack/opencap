/**
 * Test file for MongoDB Connection
 * Feature: OCDI-101: Set up MongoDB connection
 */

const mongoose = require('mongoose');
const { connectToMongoDB, closeMongoDBConnection } = require('../../db/mongoConnection');

// Mock the entire mongoose module
jest.mock('mongoose', () => {
  const mockConnection = {
    on: jest.fn(),
    name: 'test_db',
    close: jest.fn().mockImplementation(() => Promise.resolve())
  };
  
  return {
    connect: jest.fn().mockImplementation(() => Promise.resolve({ connection: mockConnection })),
    connection: mockConnection,
    Types: {
      ObjectId: {
        isValid: jest.fn().mockImplementation(() => true)
      }
    }
  };
});

// Save original environment variables
const originalEnv = { ...process.env };

describe('MongoDB Connection Module (OCDI-101)', () => {
  // Reset environment variables and mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe('connectToMongoDB()', () => {
    it('should connect to the correct MongoDB instance based on environment', async () => {
      // Test production environment
      process.env.NODE_ENV = 'production';
      process.env.MONGODB_URI = 'mongodb://opencap:password123@localhost:27017/opencap?authSource=admin';
      await connectToMongoDB();
      expect(mongoose.connect).toHaveBeenCalledWith(
        process.env.MONGODB_URI,
        expect.objectContaining({
          serverSelectionTimeoutMS: 5000
        })
      );

      // Test development environment
      jest.clearAllMocks();
      process.env.NODE_ENV = 'development';
      await connectToMongoDB();
      expect(mongoose.connect).toHaveBeenCalledWith(
        process.env.MONGODB_URI,
        expect.objectContaining({
          serverSelectionTimeoutMS: 5000
        })
      );

      // Test test environment
      jest.clearAllMocks();
      process.env.NODE_ENV = 'test';
      process.env.MONGODB_URI_TEST = 'mongodb://opencap:password123@localhost:27017/opencap_test?authSource=admin';
      await connectToMongoDB();
      expect(mongoose.connect).toHaveBeenCalledWith(
        process.env.MONGODB_URI_TEST,
        expect.objectContaining({
          serverSelectionTimeoutMS: 5000
        })
      );
    });

    it('should handle connection errors gracefully', async () => {
      // Mock connection error
      mongoose.connect.mockImplementationOnce(() => Promise.reject(new Error('Connection error')));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Test error handling
      await expect(connectToMongoDB()).rejects.toThrow('Connection error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to connect to MongoDB:',
        'Connection error'
      );
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('closeMongoDBConnection()', () => {
    it('should close MongoDB connection', async () => {
      await closeMongoDBConnection();
      expect(mongoose.connection.close).toHaveBeenCalled();
    });

    it('should handle connection close errors gracefully', async () => {
      // Mock connection close error
      mongoose.connection.close.mockImplementationOnce(() => Promise.reject(new Error('Close error')));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Test error handling
      await expect(closeMongoDBConnection()).rejects.toThrow('Close error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error closing MongoDB connection:',
        'Close error'
      );
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });
});
