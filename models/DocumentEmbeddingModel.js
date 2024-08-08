const mongoose = require('mongoose');

const documentEmbeddingSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

documentEmbeddingSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const DocumentEmbedding = mongoose.model('DocumentEmbedding', documentEmbeddingSchema);
module.exports = DocumentEmbedding;
