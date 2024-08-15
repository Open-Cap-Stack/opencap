const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const DocumentAccessModel = require('../models/DocumentAccessModel');
const { connectDB, disconnectDB } = require('../db');

const app = express();
app.use(express.json());
app.use('/api/documentAccessRoutes', require('../routes/documentAccessRoutes'));

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
});

describe('Document Access Routes', () => {
    it('should create a new document access', async () => {
        const response = await request(app)
            .post('/api/documentAccessRoutes/document-accesses')
            .send({
                accessId: 'route-access-id',
                AccessLevel: 'Write',
                RelatedDocument: mongoose.Types.ObjectId(),
                User: mongoose.Types.ObjectId(),
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.accessId).toBe('route-access-id');
    });

    it('should get all document accesses', async () => {
        const response = await request(app).get('/api/documentAccessRoutes/document-accesses');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
    });

    it('should get a document access by ID', async () => {
        const newAccess = new DocumentAccessModel({
            accessId: 'route-get-access-id',
            AccessLevel: 'Admin',
            RelatedDocument: mongoose.Types.ObjectId(),
            User: mongoose.Types.ObjectId(),
        });
        const savedAccess = await newAccess.save();

        const response = await request(app).get(`/api/documentAccessRoutes/document-accesses/${savedAccess._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.accessId).toBe('route-get-access-id');
    });

    it('should update a document access by ID', async () => {
        const newAccess = new DocumentAccessModel({
            accessId: 'route-update-access-id',
            AccessLevel: 'Read',
            RelatedDocument: mongoose.Types.ObjectId(),
            User: mongoose.Types.ObjectId(),
        });
        const savedAccess = await newAccess.save();

        const response = await request(app)
            .put(`/api/documentAccessRoutes/document-accesses/${savedAccess._id}`)
            .send({ AccessLevel: 'Write' });

        expect(response.statusCode).toBe(200);
        expect(response.body.AccessLevel).toBe('Write');
    });

    it('should delete a document access by ID', async () => {
        const newAccess = new DocumentAccessModel({
            accessId: 'route-delete-access-id',
            AccessLevel: 'Admin',
            RelatedDocument: mongoose.Types.ObjectId(),
            User: mongoose.Types.ObjectId(),
        });
        const savedAccess = await newAccess.save();

        const response = await request(app).delete(`/api/documentAccessRoutes/document-accesses/${savedAccess._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Document access deleted');
    });
});
