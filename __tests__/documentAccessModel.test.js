/**
 * Document Access Model Tests
 * Following OpenCap TDD principles and Semantic Seed standards
 */
const mongoose = require('mongoose');
const DocumentAccessModel = require('../models/DocumentAccessModel');
// Use the shared test database setup instead of creating a new connection
const { clearDB } = require('./setup/testDB');

// We don't need to explicitly connect or disconnect because it's handled by jest.setup.js
beforeEach(async () => {
    // Clear test data before each test
    await clearDB();
});

describe('DocumentAccess Model', () => {
    it('should create a document access', async () => {
        const access = new DocumentAccessModel({
            accessId: 'unique-access-id',
            AccessLevel: 'Read',
            RelatedDocument: mongoose.Types.ObjectId(),
            User: mongoose.Types.ObjectId(),
        });
        const savedAccess = await access.save();
        expect(savedAccess.accessId).toBe('unique-access-id');
    });

    it('should fail without required fields', async () => {
        const access = new DocumentAccessModel({});
        await expect(access.save()).rejects.toThrow();
    });
});
