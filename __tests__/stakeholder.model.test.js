/**
 * Stakeholder Model Tests
 * Following OpenCap TDD principles and Semantic Seed standards
 */
const mongoose = require('mongoose');
const Stakeholder = require('../models/Stakeholder');
// Use the shared test database setup instead of creating a new connection
const { clearDB } = require('./setup/testDB');

// We don't need to explicitly connect or disconnect because it's handled by jest.setup.js
beforeEach(async () => {
  // Clear test data before each test
  await clearDB();
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
