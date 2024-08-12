const mongoose = require('mongoose');
const MongoError = require('mongodb').MongoError; // Import MongoError from the mongodb package
const IntegrationModule = require('../models/integrationModel');
const { connectDB, disconnectDB } = require('../db');

describe('IntegrationModule Model Test', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterEach(async () => {
    await IntegrationModule.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create and save an integration module successfully', async () => {
    const validIntegrationModule = new IntegrationModule({
      IntegrationID: '123',
      ToolName: 'Sample Tool',
      Description: 'A sample tool description',
      Link: 'http://example.com',
    });
    const savedIntegrationModule = await validIntegrationModule.save();

    expect(savedIntegrationModule._id).toBeDefined();
    expect(savedIntegrationModule.IntegrationID).toBe('123');
    expect(savedIntegrationModule.ToolName).toBe('Sample Tool');
    expect(savedIntegrationModule.Description).toBe('A sample tool description');
    expect(savedIntegrationModule.Link).toBe('http://example.com');
  });

  it('should fail to create an integration module without required fields', async () => {
    const invalidIntegrationModule = new IntegrationModule({
      Description: 'A sample tool description',
    });

    let err;
    try {
      await invalidIntegrationModule.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.IntegrationID).toBeDefined();
    expect(err.errors.ToolName).toBeDefined();
  });

  it('should not create an integration module with a duplicate IntegrationID', async () => {
    const integrationModule1 = new IntegrationModule({
      IntegrationID: '123',
      ToolName: 'Tool One',
      Description: 'First tool description',
      Link: 'http://example.com/one',
    });
    await integrationModule1.save();

    const integrationModule2 = new IntegrationModule({
      IntegrationID: '123',
      ToolName: 'Tool Two',
      Description: 'Second tool description',
      Link: 'http://example.com/two',
    });

    let err;
    try {
      await integrationModule2.save();
    } catch (error) {
      err = error;
    }

    // Check for MongoError instance
    expect(err).toBeInstanceOf(MongoError);
    expect(err.code).toBe(11000); // Duplicate key error code
  });
});
