import chai from 'chai';
import sinon from 'sinon/pkg/sinon-esm.js';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import { getAllDocuments } from '../controllers/documentController.js';

const expect = chai.expect;

describe('Document Controller', () => {
  before((done) => {
    mongoose.connect('mongodb://localhost:27017/opencap-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }, done);
  });

  after((done) => {
    mongoose.connection.db.dropDatabase(() => {
      mongoose.connection.close(done);
    });
  });

  beforeEach(() => {
    sinon.restore();
  });

  describe('getAllDocuments', () => {
    it('should return a list of documents', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(Document, 'find').resolves([{ title: 'Doc 1', content: 'Content 1' }]);

      await getAllDocuments(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ documents: [{ title: 'Doc 1', content: 'Content 1' }] })).to.be.true;
    });

    it('should handle errors', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(Document, 'find').rejects(new Error('Database error'));

      await getAllDocuments(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Error fetching documents' })).to.be.true;
    });
  });
});
