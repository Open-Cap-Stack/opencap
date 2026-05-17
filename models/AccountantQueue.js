/**
 * AccountantQueue Model
 * Feature: AI-Powered 409A Valuation - Accountant Review Workflow
 *
 * Manages the queue of AI-generated 409A valuations awaiting accountant review.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const baseModel = createModel('accountant_queues');

const AccountantQueue = {
  async create(data) {
    const now = new Date().toISOString();
    const record = {
      queueId: data.queueId || `queue_${uuidv4()}`,
      valuationId: data.valuationId,
      companyId: data.companyId,
      assignedAccountantId: data.assignedAccountantId || null,
      status: data.status || 'unassigned',
      priority: data.priority || 'normal',
      queuedAt: data.queuedAt || now,
      assignedAt: data.assignedAt || null,
      reviewStartedAt: data.reviewStartedAt || null,
      completedAt: data.completedAt || null,
      dueDate: data.dueDate || null,
      notes: data.notes || '',
      createdBy: data.createdBy || null,
      createdAt: now,
      updatedAt: now
    };
    return baseModel.create(record);
  },

  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel)
};

module.exports = AccountantQueue;
