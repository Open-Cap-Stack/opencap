/**
 * DocumentEmbedding Model
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Stores vector embeddings for document content for semantic search.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const documentEmbeddingSchema = {
    _id: { type: 'string', required: true },
    embeddingId: { type: 'string', unique: true, required: true },
    documentId: { type: 'string', required: true }, // Reference to Document
    embedding: { type: 'array', required: true }, // Array of numbers (vector)
    EmbeddingType: {
        type: 'string',
        enum: ['Type1', 'Type2', 'Type3'],
        required: true
    },
    EmbeddingVersion: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
};

// Valid embedding types for validation
const VALID_EMBEDDING_TYPES = ['Type1', 'Type2', 'Type3'];

// Create base model
const baseModel = createModel('document_embeddings', documentEmbeddingSchema);

/**
 * DocumentEmbedding Model with custom methods
 */
const DocumentEmbeddingModel = {
    // Base model reference
    _baseModel: baseModel,
    tableName: baseModel.tableName,
    schema: documentEmbeddingSchema,

    // Expose base model methods
    find: (query, options) => baseModel.find(query, options),
    findOne: (query, options) => baseModel.findOne(query, options),
    findById: (id, options) => baseModel.findById(id, options),
    findOneAndUpdate: (query, update, options) => baseModel.findOneAndUpdate(query, update, options),
    findByIdAndUpdate: (id, update, options) => baseModel.findByIdAndUpdate(id, update, options),
    updateOne: (query, update, options) => baseModel.updateOne(query, update, options),
    updateMany: (query, update, options) => baseModel.updateMany(query, update, options),
    deleteOne: (query) => baseModel.deleteOne(query),
    deleteMany: (query) => baseModel.deleteMany(query),
    findOneAndDelete: (query) => baseModel.findOneAndDelete(query),
    findByIdAndDelete: (id) => baseModel.findByIdAndDelete(id),
    countDocuments: (query) => baseModel.countDocuments(query),
    exists: (query) => baseModel.exists(query),
    distinct: (field, query) => baseModel.distinct(field, query),
    aggregate: (pipeline) => baseModel.aggregate(pipeline),
    insertMany: (dataArray) => baseModel.insertMany(dataArray),

    /**
     * Validate embedding type
     * @param {string} type - Embedding type to validate
     * @returns {boolean} True if valid
     */
    isValidEmbeddingType(type) {
        return VALID_EMBEDDING_TYPES.includes(type);
    },

    /**
     * Validate embedding vector
     * @param {Array} embedding - Embedding array to validate
     * @returns {boolean} True if valid
     */
    isValidEmbedding(embedding) {
        if (!Array.isArray(embedding)) return false;
        if (embedding.length === 0) return false;
        return embedding.every(val => typeof val === 'number');
    },

    /**
     * Create a new document embedding with validation
     * @param {Object} data - Embedding data
     * @returns {Object} Created embedding record
     */
    async create(data) {
        // Validate required fields
        if (!data.embeddingId) {
            throw new Error('embeddingId is required');
        }
        if (!data.documentId) {
            throw new Error('documentId is required');
        }
        if (!data.embedding) {
            throw new Error('embedding is required');
        }
        if (!this.isValidEmbedding(data.embedding)) {
            throw new Error('Embedding cannot be an empty array and must contain numbers.');
        }
        if (!data.EmbeddingType) {
            throw new Error('EmbeddingType is required');
        }
        if (!this.isValidEmbeddingType(data.EmbeddingType)) {
            throw new Error(`EmbeddingType must be one of: ${VALID_EMBEDDING_TYPES.join(', ')}`);
        }

        // Check for duplicate embeddingId
        const existing = await baseModel.findOne({ embeddingId: data.embeddingId });
        if (existing) {
            throw new Error('embeddingId must be unique');
        }

        return baseModel.create(data);
    },

    /**
     * Find embeddings by document
     * @param {string} documentId - Document ID
     * @returns {Array} Embedding records
     */
    async findByDocument(documentId) {
        return baseModel.find({ documentId });
    },

    /**
     * Find embedding by document and type
     * @param {string} documentId - Document ID
     * @param {string} embeddingType - Embedding type
     * @returns {Object|null} Embedding record
     */
    async findByDocumentAndType(documentId, embeddingType) {
        return baseModel.findOne({ documentId, EmbeddingType: embeddingType });
    },

    /**
     * Update or create embedding for a document
     * @param {string} documentId - Document ID
     * @param {Array} embedding - Embedding vector
     * @param {string} embeddingType - Embedding type
     * @param {string} version - Embedding version
     * @returns {Object} Created or updated embedding
     */
    async upsertEmbedding(documentId, embedding, embeddingType, version = null) {
        if (!this.isValidEmbedding(embedding)) {
            throw new Error('Embedding cannot be an empty array and must contain numbers.');
        }
        if (!this.isValidEmbeddingType(embeddingType)) {
            throw new Error(`EmbeddingType must be one of: ${VALID_EMBEDDING_TYPES.join(', ')}`);
        }

        const existing = await this.findByDocumentAndType(documentId, embeddingType);

        if (existing) {
            return baseModel.findOneAndUpdate(
                { _id: existing._id },
                {
                    $set: {
                        embedding,
                        EmbeddingVersion: version || existing.EmbeddingVersion
                    }
                },
                { new: true }
            );
        }

        return this.create({
            embeddingId: `emb_${uuidv4()}`,
            documentId,
            embedding,
            EmbeddingType: embeddingType,
            EmbeddingVersion: version
        });
    },

    /**
     * Delete all embeddings for a document
     * @param {string} documentId - Document ID
     * @returns {Object} Delete result
     */
    async deleteByDocument(documentId) {
        return baseModel.deleteMany({ documentId });
    },

    /**
     * Get embeddings by type
     * @param {string} embeddingType - Embedding type
     * @returns {Array} Embedding records
     */
    async findByType(embeddingType) {
        return baseModel.find({ EmbeddingType: embeddingType });
    },

    /**
     * Get embeddings by version
     * @param {string} version - Embedding version
     * @returns {Array} Embedding records
     */
    async findByVersion(version) {
        return baseModel.find({ EmbeddingVersion: version });
    },

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array} vecA - First vector
     * @param {Array} vecB - Second vector
     * @returns {number} Cosine similarity score
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same dimension');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    },

    /**
     * Find similar documents based on embedding similarity
     * @param {Array} queryEmbedding - Query embedding vector
     * @param {string} embeddingType - Embedding type to search
     * @param {number} limit - Maximum number of results
     * @param {number} threshold - Minimum similarity threshold
     * @returns {Array} Similar documents sorted by similarity
     */
    async findSimilar(queryEmbedding, embeddingType, limit = 10, threshold = 0.7) {
        const embeddings = await this.findByType(embeddingType);

        const results = embeddings
            .map(doc => ({
                ...doc,
                similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
            }))
            .filter(doc => doc.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        return results;
    }
};

module.exports = DocumentEmbeddingModel;
