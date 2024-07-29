const mongoose = require('mongoose');
const { connectDB } = require('../db');
const Stakeholder = require('../models/Stakeholder');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Stakeholder Model Test', () => {
  it('create & save stakeholder successfully', async () => {
    const stakeholderData = {
      stakeholderId: 'stakeholder1',
      name: 'John Doe',
      role: 'Manager',
      projectId: 'project1',
    };
    const validStakeholder = new Stakeholder(stakeholderData);
    const savedStakeholder = await validStakeholder.save();
    expect(savedStakeholder._id).toBeDefined();
    expect(savedStakeholder.stakeholderId).toBe(stakeholderData.stakeholderId);
    expect(savedStakeholder.name).toBe(stakeholderData.name);
    expect(savedStakeholder.role).toBe(stakeholderData.role);
    expect(savedStakeholder.projectId).toBe(stakeholderData.projectId);
  });
});
