const mongoose = require('mongoose');
const Document = require('../models/documentModel');
const { connectDB, disconnectDB } = require('../db');

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
});

describe('Document Model', () => {
    it('should create a new document', async () => {
        const document = new Document({
            documentId: 'doc001',
            name: 'Test Document',
            uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
            path: '/test/path',
            title: 'Test Title',
            content: 'Test Content',
            DocumentType: 'Legal',
            FileType: 'PDF',
            Versioning: '1.0'
        });

        const savedDocument = await document.save();
        expect(savedDocument._id).toBeDefined();
        expect(savedDocument.name).toBe('Test Document');
    });

    it('should retrieve a document by ID', async () => {
        const document = new Document({
            documentId: 'doc002',
            name: 'Retrieve Document',
            uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
            path: '/test/retrieve',
            title: 'Retrieve Title',
            content: 'Retrieve Content',
            DocumentType: 'Financial',
            FileType: 'DOCX'
        });

        const savedDocument = await document.save();
        const foundDocument = await Document.findById(savedDocument._id);

        expect(foundDocument).toBeDefined();
        expect(foundDocument.name).toBe('Retrieve Document');
    });

    it('should update a document by ID', async () => {
        const document = new Document({
            documentId: 'doc003',
            name: 'Update Document',
            uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
            path: '/test/update',
            title: 'Update Title',
            content: 'Update Content',
            DocumentType: 'Legal',
            FileType: 'PDF'
        });

        const savedDocument = await document.save();
        savedDocument.name = 'Updated Document';
        const updatedDocument = await savedDocument.save();

        expect(updatedDocument.name).toBe('Updated Document');
    });

    it('should delete a document by ID', async () => {
        const document = new Document({
            documentId: 'doc004',
            name: 'Delete Document',
            uploadedBy: new mongoose.Types.ObjectId(), // Use valid ObjectId
            path: '/test/delete',
            title: 'Delete Title',
            content: 'Delete Content',
            DocumentType: 'Other',
            FileType: 'TXT'
        });

        const savedDocument = await document.save();
        await Document.findByIdAndDelete(savedDocument._id);

        const deletedDocument = await Document.findById(savedDocument._id);
        expect(deletedDocument).toBeNull();
    });
});
