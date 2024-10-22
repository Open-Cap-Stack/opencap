const mongoose = require('mongoose');
const DocumentEmbedding = require('../models/DocumentEmbeddingModel');
const { connectDB, disconnectDB } = require('../db');

mongoose.set('debug', true);


describe('DocumentEmbedding Model Test', () => {

    beforeAll(async () => {
        await connectDB();
        await DocumentEmbedding.createIndexes();
      });
      
      afterAll(async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
      });

    it('create & save document embedding successfully', async () => {
        const validEmbedding = new DocumentEmbedding({
            embeddingId: 'uniqueEmb123',
            documentId: new mongoose.Types.ObjectId(),
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            EmbeddingType: 'Type1',
        });
        const savedEmbedding = await validEmbedding.save();

        expect(savedEmbedding._id).toBeDefined();
        expect(savedEmbedding.embeddingId).toBe('uniqueEmb123');
    });

    it('should fail to create a document embedding without required fields', async () => {
        const incompleteEmbedding = new DocumentEmbedding({}); // Missing all required fields
    
        let err;
        try {
            await incompleteEmbedding.save();
        } catch (error) {
            err = error;
        }
    
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        expect(err.errors).toHaveProperty('documentId');
        expect(err.errors).toHaveProperty('embeddingId');
        expect(err.errors).toHaveProperty('EmbeddingType');
        expect(err.errors).toHaveProperty('embedding'); // This should now be present
    });

    it('should enforce unique embeddingId', async () => {
        const embedding1 = new DocumentEmbedding({
            embeddingId: 'duplicateEmb123',
            documentId: new mongoose.Types.ObjectId(),
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            EmbeddingType: 'Type1',
        });
        await embedding1.save();
    
        const embedding2 = new DocumentEmbedding({
            embeddingId: 'duplicateEmb123', // Duplicate ID to test uniqueness
            documentId: new mongoose.Types.ObjectId(),
            embedding: [0.6, 0.7, 0.8, 0.9, 1.0],
            EmbeddingType: 'Type2',
        });
    
        let err;
        try {
            await embedding2.save();
        } catch (error) {
            err = error;
        }
    
        expect(err).toBeDefined();
        expect(err.name).toBe('MongoError'); // Updated to check for 'MongoError'
        expect(err.code).toBe(11000); // Duplicate key error code
    });
    
    

});
