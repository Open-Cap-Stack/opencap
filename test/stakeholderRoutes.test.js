const request = require('supertest');
const { connectDB, disconnectDB } = require('../db');
const app = require('../app');
const Stakeholder = require('../models/Stakeholder');

let server;

beforeAll(async () => {
  await connectDB();
  server = app.listen(5005);
});

afterAll(async () => {
  await server.close();
  await disconnectDB();
});

describe('Stakeholder Routes', () => {
  beforeEach(async () => {
    await Stakeholder.deleteMany({});
  });

  it('GET /api/stakeholders should return all stakeholders', async () => {
    const stakeholder = new Stakeholder({
      stakeholderId: 'stakeholder1',
      name: 'Jane Doe',
      role: 'CEO',
      projectId: 'project1',
    });
    await stakeholder.save();

    const response = await request(server).get('/api/stakeholders');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].name).toBe('Jane Doe');
  });

  it('POST /api/stakeholders should create a new stakeholder', async () => {
    const stakeholderData = {
      stakeholderId: 'stakeholder2',
      name: 'John Doe',
      role: 'Manager',
      projectId: 'project1',
    };
    const response = await request(server).post('/api/stakeholders').send(stakeholderData);
    console.log('POST response:', response.body);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('John Doe');
  });
});
