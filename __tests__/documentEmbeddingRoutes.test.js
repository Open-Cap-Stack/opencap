const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const DocumentEmbedding = require('../models/DocumentEmbeddingModel');
const { connectDB, disconnectDB } = require('../db');

const app = express();
app.use(express.json());
app.use('/api/documentEmbeddings', require('../routes/documentEmbeddingRoutes'));

describe('Document Embedding API', () => {
    let documentId;

    beforeAll(async () => {
        await connectDB();
    });
    
    afterAll(async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
    });

    beforeEach(() => {
        documentId = new mongoose.Types.ObjectId(); // Mock a document ID for testing
    });

    it('should create a new document embedding', async () => {
        const response = await request(app)
            .post('/api/documentEmbeddings/document-embeddings')
            .send({
                embeddingId: 'emb' + new Date().getTime(), // Unique embeddingId
                documentId,
                embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
                EmbeddingType: 'Type1',
                EmbeddingVersion: 'v1',
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.documentId).toBe(documentId.toString());
        expect(response.body.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it('should get all document embeddings', async () => {
        const response = await request(app).get('/api/documentEmbeddings/document-embeddings');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
    });

    it('should get a document embedding by ID', async () => {
        const newEmbedding = new DocumentEmbedding({
            embeddingId: 'emb' + new Date().getTime(), // Unique embeddingId
            documentId,
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            EmbeddingType: 'Type1',
        });
        const savedEmbedding = await newEmbedding.save();

        const response = await request(app).get(`/api/documentEmbeddings/document-embeddings/${savedEmbedding._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.documentId).toBe(documentId.toString());
        expect(response.body.embeddingId).toBe(newEmbedding.embeddingId);
    });

    it('should update a document embedding by ID', async () => {
        const newEmbedding = new DocumentEmbedding({
            embeddingId: 'emb' + new Date().getTime(), // Unique embeddingId
            documentId,
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            EmbeddingType: 'Type1',
        });
        const savedEmbedding = await newEmbedding.save();

        const response = await request(app)
            .put(`/api/documentEmbeddings/document-embeddings/${savedEmbedding._id}`)
            .send({ embedding: [0.5, 0.4, 0.3, 0.2, 0.1], EmbeddingVersion: 'v2' });

        expect(response.statusCode).toBe(200);
        expect(response.body.embedding).toEqual([0.5, 0.4, 0.3, 0.2, 0.1]);
        expect(response.body.EmbeddingVersion).toBe('v2');
    });

    it('should delete a document embedding by ID', async () => {
        const newEmbedding = new DocumentEmbedding({
            embeddingId: 'emb' + new Date().getTime(), // Unique embeddingId
            documentId,
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            EmbeddingType: 'Type1',
        });
        const savedEmbedding = await newEmbedding.save();

        const response = await request(app).delete(`/api/documentEmbeddings/document-embeddings/${savedEmbedding._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Document embedding deleted');
    });
});
