const mongoose = require('mongoose');
const DocumentAccessModel = require('../models/DocumentAccessModel');

beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/opencap');
});

afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
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
