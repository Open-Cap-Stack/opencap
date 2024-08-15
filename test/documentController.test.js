const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Document = require('../models/documentModel');
const { connectDB, disconnectDB } = require('../db');

const app = express();
app.use(express.json());
app.use('/api', require('../routes/documentRoutes'));

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
});

describe('Document Controller', () => {
    it('should create a new document', async () => {
        const response = await request(app)
            .post('/api/documents')
            .send({
                documentId: 'doc123',
                name: 'Sample Document',
                uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
                path: '/path/to/document',
                title: 'Sample Title',
                content: 'Sample Content',
                DocumentType: 'Legal',
                FileType: 'PDF',
                Versioning: '1.0'
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.name).toBe('Sample Document');
    });

    it('should get all documents', async () => {
        const response = await request(app).get('/api/documents');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
    });

    it('should get a document by ID', async () => {
        const newDocument = new Document({
            documentId: 'doc124',
            name: 'Another Document',
            uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
            path: '/path/to/another/document',
            title: 'Another Title',
            content: 'Another Content',
            DocumentType: 'Financial',
            FileType: 'DOCX'
        });
        const savedDocument = await newDocument.save();

        const response = await request(app).get(`/api/documents/${savedDocument._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe('Another Document');
    });

    it('should update a document by ID', async () => {
        const newDocument = new Document({
            documentId: 'doc125',
            name: 'Update Document',
            uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
            path: '/path/to/update/document',
            title: 'Update Title',
            content: 'Update Content',
            DocumentType: 'Legal',
            FileType: 'PDF'
        });
        const savedDocument = await newDocument.save();

        const response = await request(app)
            .put(`/api/documents/${savedDocument._id}`)
            .send({ name: 'Updated Document' });

        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe('Updated Document');
    });

    it('should delete a document by ID', async () => {
        const newDocument = new Document({
            documentId: 'doc126',
            name: 'Delete Document',
            uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
            path: '/path/to/delete/document',
            title: 'Delete Title',
            content: 'Delete Content',
            DocumentType: 'Other',
            FileType: 'TXT'
        });
        const savedDocument = await newDocument.save();

        const response = await request(app).delete(`/api/documents/${savedDocument._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Document deleted');
    });
});
