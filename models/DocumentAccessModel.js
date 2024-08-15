const mongoose = require('mongoose');

const documentAccessSchema = new mongoose.Schema({
    accessId: {
        type: String,
        unique: true,
        required: true,
    },
    AccessLevel: {
        type: String,
        enum: ['Read', 'Write', 'Admin'],
        required: true,
    },
    RelatedDocument: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
    },
    User: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    Permissions: {
        type: String,
        optional: true,
    },
});

const DocumentAccessModel = mongoose.model('DocumentAccess', documentAccessSchema);
module.exports = DocumentAccessModel;
