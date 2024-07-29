const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../db');
const Document = require('../models/Document');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

describe('Document Model Test', () => {
  it('should create & save document successfully', async () => {
    const documentData = {
      documentId: 'document1',
      name: 'Document 1',
      title: 'Document 1',
      content: 'Content of document 1',
      uploadedBy: mongoose.Types.ObjectId(),
      path: 'path/to/document1',
    };
    const document = new Document(documentData);
    const savedDocument = await document.save();

    expect(savedDocument._id).toBeDefined();
    expect(savedDocument.documentId).toBe(documentData.documentId);
    expect(savedDocument.name).toBe(documentData.name);
    expect(savedDocument.title).toBe(documentData.title);
    expect(savedDocument.content).toBe(documentData.content);
    expect(savedDocument.uploadedBy.toString()).toBe(documentData.uploadedBy.toString());
    expect(savedDocument.path).toBe(documentData.path);
  });
});
