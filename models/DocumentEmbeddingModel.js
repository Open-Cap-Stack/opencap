const mongoose = require('mongoose');

const documentEmbeddingSchema = new mongoose.Schema({
    embeddingId: {
        type: String,
        unique: true,
        required: true,
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
        validate: {
            validator: function(arr) {
                return arr.length > 0;
            },
            message: 'Embedding cannot be an empty array.'
        }
    },    
    EmbeddingType: {
        type: String,
        enum: ['Type1', 'Type2', 'Type3'], // Replace with actual types
        required: true,
    },
    EmbeddingVersion: {
        type: String,
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
