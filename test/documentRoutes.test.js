const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../db');
const app = require('../app');
const Document = require('../models/Document');

let server;

beforeAll(async () => {
  await connectDB();
  server = app.listen(5004);
});

afterAll(async () => {
  await server.close();
  await disconnectDB();
});

describe('Document Routes', () => {
  beforeEach(async () => {
    await Document.deleteMany({});
  });

  it('GET /api/documents should return all documents', async () => {
    const document = new Document({
      documentId: 'document1',
      name: 'Document 1',
      title: 'Document 1',
      content: 'Content of document 1',
      uploadedBy: mongoose.Types.ObjectId(),
      path: 'path/to/document1',
    });
    await document.save();

    const response = await request(server).get('/api/documents');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].title).toBe('Document 1');
  });

  it('POST /api/documents should create a new document', async () => {
    const documentData = {
      documentId: 'document2',
      name: 'Document 2',
      title: 'Document 2',
      content: 'Content of document 2',
      uploadedBy: mongoose.Types.ObjectId(),
      path: 'path/to/document2',
    };
    const response = await request(server).post('/api/documents').send(documentData);
    console.log('POST response:', response.body);
    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Document 2');
  });
});
