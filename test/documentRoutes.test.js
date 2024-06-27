const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Document = require('../models/Document'); // Ensure this import
const connectDB = require('../db');

const app = express();
app.use(express.json());
app.use('/api/documents', require('../routes/documents'));

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Document.deleteMany({});
});

describe('Document API Test', () => {
  it('should create a new document', async () => {
    const res = await request(app)
      .post('/api/documents')
      .send({
        documentId: '3',
        name: 'Document.pdf',
        path: '/documents/Document.pdf',
        uploadedBy: 'unique_user_id_1',
        uploadedAt: new Date(),
        metadata: { type: 'pdf', size: '2MB' }
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('document');
    expect(res.body.document).toHaveProperty('_id');
    expect(res.body.document).toHaveProperty('name', 'Document.pdf');
  }, 10000);

  it('should fail to create a document with missing fields', async () => {
    const res = await request(app)
      .post('/api/documents')
      .send({
        documentId: '4'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  }, 10000);

  it('should get all documents', async () => {
    const res = await request(app).get('/api/documents');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('documents');
    expect(res.body.documents).toBeInstanceOf(Array);
  }, 10000);

  it('should get a document by ID', async () => {
    const document = new Document({
      documentId: '5',
      name: 'Report.pdf',
      path: '/documents/Report.pdf',
      uploadedBy: 'unique_user_id_1',
      uploadedAt: new Date(),
      metadata: { type: 'pdf', size: '3MB' }
    });
    await document.save();

    const res = await request(app).get(`/api/documents/${document._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('document');
    expect(res.body.document).toHaveProperty('_id', document._id.toString());
  }, 10000);

  it('should update a document by ID', async () => {
    const document = new Document({
      documentId: '6',
      name: 'Notes.pdf',
      path: '/documents/Notes.pdf',
      uploadedBy: 'unique_user_id_1',
      uploadedAt: new Date(),
      metadata: { type: 'pdf', size: '1MB' }
    });
    await document.save();

    const res = await request(app)
      .put(`/api/documents/${document._id}`)
      .send({
        name: 'Notes Updated.pdf',
        metadata: { type: 'pdf', size: '2MB' }
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('document');
    expect(res.body.document).toHaveProperty('name', 'Notes Updated.pdf');
  }, 10000);

  it('should delete a document by ID', async () => {
    const document = new Document({
      documentId: '7',
      name: 'Draft.pdf',
      path: '/documents/Draft.pdf',
      uploadedBy: 'unique_user_id_1',
      uploadedAt: new Date(),
      metadata: { type: 'pdf', size: '4MB' }
    });
    await document.save();

    const res = await request(app).delete(`/api/documents/${document._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Document deleted');
  }, 10000);
});
