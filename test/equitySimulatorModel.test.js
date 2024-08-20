const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const EquitySimulator = require('../models/equitySimulator');

// In-memory MongoDB server instance
let mongoServer;

// Connect to an in-memory database before running tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Disconnect and stop the in-memory database after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('EquitySimulator Model', () => {
  it('should create and save an equity simulator document successfully', async () => {
    const equitySimulatorData = {
      simulationId: '12345',
      ScenarioDetails: { /* mock details */ },
      EquityChangeType: 'Dilution',
      StakeholdersAffected: [/* mock stakeholders */],
      ProjectedEquityValue: 1000000,
      PredictedOutcome: { /* mock outcome */ },
      OutcomeDescription: 'Sample description',
      ImpactOnStakeholders: [/* mock impact */],
    };

    const equitySimulator = new EquitySimulator(equitySimulatorData);
    const savedEquitySimulator = await equitySimulator.save();

    expect(savedEquitySimulator._id).toBeDefined();
    expect(savedEquitySimulator.simulationId).toBe(equitySimulatorData.simulationId);
    expect(savedEquitySimulator.ScenarioDetails).toEqual(equitySimulatorData.ScenarioDetails);
    expect(savedEquitySimulator.EquityChangeType).toBe(equitySimulatorData.EquityChangeType);
    expect(savedEquitySimulator.StakeholdersAffected).toEqual(equitySimulatorData.StakeholdersAffected);
    expect(savedEquitySimulator.ProjectedEquityValue).toBe(equitySimulatorData.ProjectedEquityValue);
    expect(savedEquitySimulator.PredictedOutcome).toEqual(equitySimulatorData.PredictedOutcome);
    expect(savedEquitySimulator.OutcomeDescription).toBe(equitySimulatorData.OutcomeDescription);
    expect(savedEquitySimulator.ImpactOnStakeholders).toEqual(equitySimulatorData.ImpactOnStakeholders);
  });

  it('should fail if required fields are missing', async () => {
    const invalidData = {
      ScenarioDetails: { /* mock details */ },
      EquityChangeType: 'Dilution',
      StakeholdersAffected: [/* mock stakeholders */],
      ProjectedEquityValue: 1000000,
      PredictedOutcome: { /* mock outcome */ },
    };

    const equitySimulator = new EquitySimulator(invalidData);

    let error;
    try {
      await equitySimulator.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.errors.simulationId).toBeDefined();
  });

  it('should enforce enum validation for EquityChangeType', async () => {
    const invalidData = {
      simulationId: '12345',
      ScenarioDetails: { /* mock details */ },
      EquityChangeType: 'InvalidType', // Invalid enum value
      StakeholdersAffected: [/* mock stakeholders */],
      ProjectedEquityValue: 1000000,
      PredictedOutcome: { /* mock outcome */ },
    };

    const equitySimulator = new EquitySimulator(invalidData);

    let error;
    try {
      await equitySimulator.save();
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.errors.EquityChangeType).toBeDefined();
  });

  it('should handle optional fields correctly', async () => {
    const equitySimulatorData = {
      simulationId: '12346',
      ScenarioDetails: { /* mock details */ },
      EquityChangeType: 'Conversion',
      StakeholdersAffected: [/* mock stakeholders */],
      ProjectedEquityValue: 2000000,
      PredictedOutcome: { /* mock outcome */ },
      // Omitting optional fields
    };

    const equitySimulator = new EquitySimulator(equitySimulatorData);
    const savedEquitySimulator = await equitySimulator.save();

    expect(savedEquitySimulator._id).toBeDefined();
    expect(savedEquitySimulator.OutcomeDescription).toBeUndefined();
    expect(savedEquitySimulator.ImpactOnStakeholders).toBeUndefined();
  });
});