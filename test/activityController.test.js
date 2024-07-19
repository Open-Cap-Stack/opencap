// test/activityController.test.js
const chai = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const activityController = require('../controllers/activityController');
const connectDB = require('../db');


const expect = chai.expect;

describe('Activity Controller', () => {
    before(async () => {
        await connectDB();
      });

      after(async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
      });

    it('Successfully creates activity log', async () => {
        const documentWithoutRequiredField = new Document({ documentId: 'unique_id_2' });
        let err;
        try {
            const savedDocumentWithoutRequiredField = await documentWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        expect(err.errors.name).toBeDefined();
        expect(err.errors.path).toBeDefined();
        expect(err.errors.uploadedBy).toBeDefined();
    });

    it('Successfully saves activity log to database', async () => {
        const activityLogData = {
            name: 'Sample Activity',
            description: 'Sample description for the activity',
            date: new Date(),
            type: 'Login',
            participants: [],
            status: 'Active',
            createdBy: mongoose.Types.ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const activityLog = new ActivityLog(activityLogData);
        const newActivityLog = await activityLog.save();

        expect(newActivityLog._id).toBeDefined();
        expect(newActivityLog.name).toBe(activityLogData.name);
        expect(newActivityLog.description).toBe(activityLogData.description);
    });

    it('Should respond with the newly created activity log', async () => {
        const req = {};
        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub(),
        };

        const savedActivityLog = {
            ...reqBody,
            _id: 'someUniqueId',
        };

        const next = sinon.stub();

        const activityLogStub = sinon.stub(ActivityLog.prototype, 'save').resolves(savedActivityLog);

        await createActivityLog(req, res, next);

        // assert that the result is a 201
        expect(res.status.calledWith(201)).to.be.true;
        expect(res.json.calledWith(savedActivityLog)).to.be.true;
        expect(next.called).to.be.false;

        activityLogStub.restore();
    });


});