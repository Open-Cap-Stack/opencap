// test/documentController.test.js
const chai = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const documentController = require('../controllers/documentController');

const expect = chai.expect;

describe('Document Controller', () => {
  before((done) => {
    mongoose.connect('mongodb://localhost:27017/opencap-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }, () => done());
  });

  after((done) => {
    mongoose.connection.db.dropDatabase(() => {
      mongoose.connection.close(() => done());
    });
  });

  describe('getDocuments', () => {
    it('should return a list of documents', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(Document, 'find').resolves([{ title: 'Doc 1', content: 'Content 1' }]);

      await documentController.getDocuments(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith([{ title: 'Doc 1', content: 'Content 1' }])).to.be.true;

      Document.find.restore();
    });

    it('should handle errors', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(Document, 'find').rejects(new Error('Database error'));

      await documentController.getDocuments(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: 'Database error' })).to.be.true;

      Document.find.restore();
    });
  });
});
