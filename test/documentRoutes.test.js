const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Document = require('../models/Document');
const { connectDB, disconnectDB } = require('../db');

const PORT = 5007; // Ensure a unique port

describe('Document Routes', () => {
  let server;

  beforeAll(async () => {
    await connectDB();
    server = app.listen(PORT);
  });

  afterAll(async () => {
    await server.close();
    await disconnectDB();
  });

  beforeEach(async () => {
    await Document.deleteMany({});
  });

  it('GET /api/documents should return all documents', async () => {
    const document = new Document({
      documentId: 'document1',
      name: 'Document 1',
      title: 'Document 1',
      content: 'Content of document 1',
      uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
      path: 'path/to/document1'
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
      uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
      path: 'path/to/document2'
    };

    const response = await request(server).post('/api/documents').send(documentData);
    console.log('POST response:', response.body);
    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Document 2');
  }, 40000); // Increase timeout if necessary

  it('PUT /api/documents/:id should update a document', async () => {
    const document = new Document({
      documentId: 'document3',
      name: 'Update Document',
      title: 'Update Document',
      content: 'Content of update document',
      uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
      path: 'path/to/updateDocument'
    });
    await document.save();

    const updatedData = { title: 'Updated Document' };
    const response = await request(server).put(`/api/documents/${document._id}`).send(updatedData);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Document');
  }, 40000); // Increase timeout if necessary

  it('DELETE /api/documents/:id should delete a document', async () => {
    const document = new Document({
      documentId: 'document4',
      name: 'Delete Document',
      title: 'Delete Document',
      content: 'Content of delete document',
      uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
      path: 'path/to/deleteDocument'
    });
    await document.save();

    const response = await request(server).delete(`/api/documents/${document._id}`);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Delete Document');
  }, 40000); // Increase timeout if necessary
});
