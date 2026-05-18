/**
 * TransferLog Model
 * Feature: Stripe Connect Payouts for 409A Accountant Reviews
 *
 * Records every Stripe transfer made to an accountant after a valuation is released.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const baseModel = createModel('transfer_logs');

const TransferLog = {
  async create(data) {
    const now = new Date().toISOString();
    const record = {
      transferId: data.transferId || uuidv4(),
      valuationId: data.valuationId,
      queueId: data.queueId || null,
      accountantUserId: data.accountantUserId,
      stripeTransferId: data.stripeTransferId || null,
      amount: data.amount,
      currency: data.currency || 'usd',
      status: data.status || 'pending',
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };
    return baseModel.create(record);
  },

  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel)
};

module.exports = TransferLog;
