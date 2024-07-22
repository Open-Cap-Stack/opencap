import chai from 'chai';
import sinon from 'sinon/pkg/sinon-esm.js';
import mongoose from 'mongoose';
import ShareClass from '../models/ShareClass.js';
import { getAllShareClasses } from '../controllers/shareClassController.js';

const expect = chai.expect;

describe('ShareClass Controller', () => {
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

  describe('getAllShareClasses', () => {
    it('should return a list of share classes', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(ShareClass, 'find').resolves([{ name: 'Class A', description: 'Description A' }]);

      await getAllShareClasses(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ shareClasses: [{ name: 'Class A', description: 'Description A' }] })).to.be.true;
    });

    it('should handle errors', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(ShareClass, 'find').rejects(new Error('Database error'));

      await getAllShareClasses(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Error fetching share classes' })).to.be.true;
    });
  });
});
