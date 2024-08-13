const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const documentRoutes = require('../routes/documentRoutes');

const app = express();
app.use(express.json());
app.use('/api/documents', documentRoutes);

beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDB', { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Document Routes API', () => {
    let documentId;

    beforeEach(() => {
        documentId = new mongoose.Types.ObjectId();
    });

    afterEach(async () => {
        await Document.deleteMany({});
    });

    it('GET /api/documents should return all documents', async () => {
        const document = new Document({
            documentId: 'document1',
            name: 'Document 1',
            title: 'Document 1',
            content: 'Content of document 1',
            uploadedBy: new mongoose.Types.ObjectId(),
            path: 'path/to/document1'
        });
        await document.save();

        const response = await request(app).get('/api/documents');
        expect(response.statusCode).toBe(200);
        expect(response.body.documents).toBeInstanceOf(Array);
        expect(response.body.documents.length).toBe(1);
        expect(response.body.documents[0].title).toBe('Document 1');
    });

    it('POST /api/documents should create a new document', async () => {
        const documentData = {
            documentId: 'document2',
            name: 'Document 2',
            title: 'Document 2',
            content: 'Content of document 2',
            uploadedBy: new mongoose.Types.ObjectId(),
            path: 'path/to/document2',
            metadata: {} // Include this field
        };

        const response = await request(app).post('/api/documents').send(documentData);
        expect(response.statusCode).toBe(201);
        expect(response.body.document.title).toBe('Document 2');
    });

    it('PUT /api/documents/:id should update a document', async () => {
        const document = new Document({
            documentId: 'document3',
            name: 'Update Document',
            title: 'Update Document',
            content: 'Content of update document',
            uploadedBy: new mongoose.Types.ObjectId(),
            path: 'path/to/updateDocument'
        });
        const savedDocument = await document.save();

        const updatedData = { title: 'Updated Document' };
        const response = await request(app)
            .put(`/api/documents/${savedDocument._id}`)
            .send(updatedData);

        expect(response.statusCode).toBe(200);
        expect(response.body.document.title).toBe('Updated Document');
    });

    it('DELETE /api/documents/:id should delete a document', async () => {
        const document = new Document({
            documentId: 'document4',
            name: 'Delete Document',
            title: 'Delete Document',
            content: 'Content of delete document',
            uploadedBy: new mongoose.Types.ObjectId(),
            path: 'path/to/deleteDocument'
        });
        const savedDocument = await document.save();

        const response = await request(app).delete(`/api/documents/${savedDocument._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Document deleted');
    });
});
