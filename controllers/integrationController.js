/**
 * Integration Controller - ZeroDB Migration
 * Issue #20 - Batch 3 Controllers
 * Uses DatabaseAdapter for database-agnostic operations
 */

const databaseAdapter = require('../services/databaseAdapter');

const MODEL_NAME = 'IntegrationModule';

async function createIntegrationModule(req, res, next) {
  try {
    const { IntegrationID, ToolName, Description, Link } = req.body;

    const integrationData = {
      IntegrationID,
      ToolName,
      Description,
      Link,
    };

    const newIntegrationModule = await databaseAdapter.create(MODEL_NAME, integrationData);
    res.status(201).json(newIntegrationModule);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => `${err.path}: Path \`${err.path}\` is required.`);
      return res.status(400).json({ message: errorMessages.join(' ') });
    } else if (error.code === 11000) {
      return res.status(400).json({ message: 'IntegrationID must be unique.' });
    } else {
      next(error);
    }
  }
}

module.exports = {
  createIntegrationModule,
};
