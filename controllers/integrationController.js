const IntegrationModule = require('../models/integrationModel');

async function createIntegrationModule(req, res, next) {
  try {
    const { IntegrationID, ToolName, Description, Link } = req.body; // Updated field name

    const integrationModule = new IntegrationModule({
      IntegrationID,
      ToolName,
      Description,
      Link, // Updated field name
    });

    const newIntegrationModule = await integrationModule.save();
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
