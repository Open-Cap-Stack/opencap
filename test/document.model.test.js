const mongoose = require('mongoose');
const Document = require('../models/Document');
const connectDB = require('../db');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Document.deleteMany({});
});

describe('Document Model Test', () => {
  it('create & save document successfully', async () => {
    const documentData = {
      documentId: 'unique_id_1',
      name: '2023 W-2.pdf',
      path: '/documents/2023-W-2.pdf',
      uploadedBy: 'unique_user_id_1',
      uploadedAt: new Date(),
      metadata: { type: 'pdf', size: '2MB' }
    };
    const validDocument = new Document(documentData);
    const savedDocument = await validDocument.save();

    expect(savedDocument._id).toBeDefined();
    expect(savedDocument.documentId).toBe(documentData.documentId);
    expect(savedDocument.name).toBe(documentData.name);
    expect(savedDocument.path).toBe(documentData.path);
    expect(savedDocument.uploadedBy).toBe(documentData.uploadedBy);
    expect(savedDocument.metadata).toEqual(documentData.metadata);
  });

  it('should not save document with undefined fields', async () => {
    const documentWithoutRequiredField = new Document({ documentId: 'unique_id_2' });
    let err;
    try {
      const savedDocumentWithoutRequiredField = await documentWithoutRequiredField.save();
      error = savedDocumentWithoutRequiredField;
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
    expect(err.errors.path).toBeDefined();
    expect(err.errors.uploadedBy).toBeDefined();
  });
});
