import chai from 'chai';
import sinon from 'sinon/pkg/sinon-esm.js';
import mongoose from 'mongoose';
import Stakeholder from '../models/Stakeholder.js';
import { getAllStakeholders } from '../controllers/stakeholderController.js';

const expect = chai.expect;

describe('Stakeholder Controller', () => {
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

  describe('getAllStakeholders', () => {
    it('should return a list of stakeholders', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(Stakeholder, 'find').resolves([{ name: 'Jane Doe', role: 'Manager' }]);

      await getAllStakeholders(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ stakeholders: [{ name: 'Jane Doe', role: 'Manager' }] })).to.be.true;
    });

    it('should handle errors', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(Stakeholder, 'find').rejects(new Error('Database error'));

      await getAllStakeholders(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Error fetching stakeholders' })).to.be.true;
    });
  });
});
