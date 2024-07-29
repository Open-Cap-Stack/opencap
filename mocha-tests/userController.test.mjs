import chai from 'chai';
import sinon from 'sinon/pkg/sinon-esm.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { getAllUsers } from '../controllers/userController.js';

const expect = chai.expect;

describe('User Controller', () => {
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

  describe('getAllUsers', () => {
    it('should return a list of users', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(User, 'find').resolves([{ name: 'John Doe', email: 'john@example.com' }]);

      await getAllUsers(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ users: [{ name: 'John Doe', email: 'john@example.com' }] })).to.be.true;
    });

    it('should handle errors', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(User, 'find').rejects(new Error('Database error'));

      await getAllUsers(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Error fetching users' })).to.be.true;
    });
  });
});
