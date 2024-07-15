// test/shareClassController.test.js
const chai = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const ShareClass = require('../models/ShareClass');
const shareClassController = require('../controllers/shareClassController');

const expect = chai.expect;

describe('ShareClass Controller', () => {
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

  describe('getShareClasses', () => {
    it('should return a list of share classes', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(ShareClass, 'find').resolves([{ name: 'Class A', description: 'Description A' }]);

      await shareClassController.getShareClasses(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith([{ name: 'Class A', description: 'Description A' }])).to.be.true;

      ShareClass.find.restore();
    });

    it('should handle errors', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      sinon.stub(ShareClass, 'find').rejects(new Error('Database error'));

      await shareClassController.getShareClasses(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: 'Database error' })).to.be.true;

      ShareClass.find.restore();
    });
  });
});
