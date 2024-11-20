const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Stakeholder = require('../models/Stakeholder');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

const PORT = 5008;

describe('Stakeholder Routes', () => {
  let server;

  beforeAll(async () => {
    await setupTestDB();
    server = app.listen(PORT);
  });

  afterAll(async () => {
    await server.close();
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  // Your existing test cases remain exactly the same below this point
  it('GET /api/stakeholders should return all stakeholders', async () => {
    const stakeholder = new Stakeholder({
      stakeholderId: 'stakeholder1',
      name: 'Jane Doe',
      role: 'Developer',
      projectId: new mongoose.Types.ObjectId()
    });
    await stakeholder.save();

    const response = await request(server).get('/api/stakeholders');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1); // Ensure response.body is an array
    expect(response.body[0].name).toBe('Jane Doe');
  });

  it('POST /api/stakeholders should create a new stakeholder', async () => {
    const stakeholderData = {
      stakeholderId: 'stakeholder2',
      name: 'John Doe',
      role: 'Manager',
      projectId: new mongoose.Types.ObjectId()
    };

    const response = await request(server).post('/api/stakeholders').send(stakeholderData);
    console.log('POST response:', response.body);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('John Doe');
  });

  it('PUT /api/stakeholders/:id should update a stakeholder', async () => {
    const stakeholder = new Stakeholder({
      stakeholderId: 'stakeholder3',
      name: 'Update Stakeholder',
      role: 'Tester',
      projectId: new mongoose.Types.ObjectId()
    });
    await stakeholder.save();

    const updatedData = { name: 'Updated Stakeholder' };
    const response = await request(server).put(`/api/stakeholders/${stakeholder._id}`).send(updatedData);
    expect(response.status).toBe(200);
    expect(response.body.stakeholder.name).toBe('Updated Stakeholder');
  });

  it('DELETE /api/stakeholders/:id should delete a stakeholder', async () => {
    const stakeholder = new Stakeholder({
      stakeholderId: 'stakeholder4',
      name: 'Delete Stakeholder',
      role: 'Analyst',
      projectId: new mongoose.Types.ObjectId()
    });
    await stakeholder.save();

    const response = await request(server).delete(`/api/stakeholders/${stakeholder._id}`);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Stakeholder deleted');
  });
});