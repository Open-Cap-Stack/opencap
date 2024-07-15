// test/stakeholderController.test.js
const chai = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const Stakeholder = require('../models/Stakeholder');
const stakeholderController = require('../controllers/stakeholderController');

const expect = chai.expect;

describe('Stakeholder Controller', () => {
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

  describe('getStakeholders', () => {
    it('should return a list of stakeholders', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(Stakeholder, 'find').resolves([{ name: 'Jane Doe', role: 'Manager' }]);

      await stakeholderController.getStakeholders(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith([{ name: 'Jane Doe', role: 'Manager' }])).to.be.true;

      Stakeholder.find.restore();
    });

    it('should handle errors', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(Stakeholder, 'find').rejects(new Error('Database error'));

      await stakeholderController.getStakeholders(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: 'Database error' })).to.be.true;

      Stakeholder.find.restore();
    });
  });
});
