// test/userController.test.js
const chai = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const User = require('../models/User');
const userController = require('../controllers/userController');

const expect = chai.expect;

describe('User Controller', () => {
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

  describe('getUsers', () => {
    it('should return a list of users', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(User, 'find').resolves([{ name: 'John Doe', email: 'john@example.com' }]);

      await userController.getUsers(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith([{ name: 'John Doe', email: 'john@example.com' }])).to.be.true;

      User.find.restore();
    });

    it('should handle errors', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(User, 'find').rejects(new Error('Database error'));

      await userController.getUsers(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: 'Database error' })).to.be.true;

      User.find.restore();
    });
  });
});
