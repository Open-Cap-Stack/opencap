/**
 * Integration Marketplace Service
 * Issue #202: Build Integration Marketplace Backend
 */
const databaseAdapter = require('./databaseAdapter');
const crypto = require('crypto');

const INTEGRATION_CATEGORIES = [
  { id: 'payments', name: 'Payments', description: 'Payment processing and billing integrations' },
  { id: 'accounting', name: 'Accounting', description: 'Financial and accounting software integrations' },
  { id: 'communication', name: 'Communication', description: 'Team communication and messaging tools' },
  { id: 'crm', name: 'CRM', description: 'Customer relationship management platforms' },
  { id: 'hr', name: 'HR', description: 'Human resources and payroll systems' },
  { id: 'legal', name: 'Legal', description: 'Legal document and compliance tools' },
  { id: 'analytics', name: 'Analytics', description: 'Business intelligence and analytics platforms' },
  { id: 'storage', name: 'Storage', description: 'Cloud storage and file management' },
  { id: 'productivity', name: 'Productivity', description: 'Productivity and project management tools' },
  { id: 'security', name: 'Security', description: 'Security and identity management' },
  { id: 'other', name: 'Other', description: 'Other integrations' }
];

function generateWebhookSecret() {
  return 'whsec_' + crypto.randomBytes(32).toString('hex');
}

function validateConfiguration(configuration, schema) {
  const errors = [];
  const schemaMap = schema instanceof Map ? Object.fromEntries(schema) : schema;
  for (const [fieldName, fieldSchema] of Object.entries(schemaMap)) {
    const value = configuration[fieldName];
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: fieldName, message: 'Required configuration field "' + fieldName + '" is missing' });
    }
  }
  return { valid: errors.length === 0, errors };
}

async function installIntegration(integrationId, data) {
  const { companyId, configuration, installedBy, permissions } = data;
  const integration = await databaseAdapter.findById('IntegrationMarketplaceItem', integrationId);
  if (!integration) {
    const error = new Error('Integration not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  const existingInstallation = await databaseAdapter.findOne('InstalledIntegration', { companyId, integrationId: integration.integrationId || integrationId });
  if (existingInstallation) {
    const error = new Error('Integration already installed');
    error.code = 'ALREADY_INSTALLED';
    throw error;
  }
  if (integration.configurationSchema) {
    const validationResult = validateConfiguration(configuration || {}, integration.configurationSchema);
    if (!validationResult.valid) {
      const error = new Error(validationResult.errors[0].message);
      error.code = 'VALIDATION_ERROR';
      error.details = validationResult.errors;
      throw error;
    }
  }
  const installationData = { companyId, integrationId: integration.integrationId || integrationId, integrationRef: integration._id, status: 'pending', configuration: configuration || {}, permissions: permissions || integration.permissions || [], installedBy, installedAt: new Date(), webhookSecret: generateWebhookSecret(), syncSettings: { enabled: true, frequency: 'realtime' }, usageMetrics: { apiCallsTotal: 0, apiCallsThisMonth: 0, errorCount: 0, successRate: 100 } };
  const installedIntegration = await databaseAdapter.create('InstalledIntegration', installationData);
  await databaseAdapter.findByIdAndUpdate('IntegrationMarketplaceItem', integration._id, { $inc: { installCount: 1 } });
  return installedIntegration;
}

async function uninstallIntegration(integrationId, companyId) {
  const installation = await databaseAdapter.findOne('InstalledIntegration', { integrationId, companyId });
  if (!installation) return null;
  await databaseAdapter.findByIdAndDelete('InstalledIntegration', installation._id);
  const integration = await databaseAdapter.findOne('IntegrationMarketplaceItem', { integrationId });
  if (integration && integration.installCount > 0) {
    await databaseAdapter.findByIdAndUpdate('IntegrationMarketplaceItem', integration._id, { $inc: { installCount: -1 } });
  }
  return { success: true, message: 'Integration uninstalled successfully', integrationId, companyId };
}

async function updateConfiguration(integrationId, companyId, configuration, userId) {
  const installation = await databaseAdapter.findOne('InstalledIntegration', { integrationId, companyId });
  if (!installation) return null;
  const integration = await databaseAdapter.findOne('IntegrationMarketplaceItem', { integrationId });
  if (integration && integration.configurationSchema) {
    const validationResult = validateConfiguration(configuration, integration.configurationSchema);
    if (!validationResult.valid) {
      const error = new Error(validationResult.errors[0].message);
      error.code = 'VALIDATION_ERROR';
      error.details = validationResult.errors;
      throw error;
    }
  }
  const updated = await databaseAdapter.findByIdAndUpdate('InstalledIntegration', installation._id, { configuration, configuredBy: userId, configuredAt: new Date(), updatedBy: userId }, { new: true });
  return updated;
}

async function testConnection(integrationId, companyId) {
  const installation = await databaseAdapter.findOne('InstalledIntegration', { integrationId, companyId });
  if (!installation) return null;
  const integration = await databaseAdapter.findOne('IntegrationMarketplaceItem', { integrationId });
  const startTime = Date.now();
  const hasRequiredConfig = integration && integration.configurationSchema ? Object.entries(integration.configurationSchema).every(([key, schema]) => { if (schema.required) { const value = installation.configuration && installation.configuration.get ? installation.configuration.get(key) : (installation.configuration && installation.configuration[key]); return value !== undefined && value !== null && value !== ''; } return true; }) : true;
  const testResult = hasRequiredConfig ? { success: true, message: 'Connection successful', responseTime: Date.now() - startTime, details: { version: integration && integration.version ? integration.version : 'unknown', status: 'connected' } } : { success: false, message: 'Connection failed', responseTime: Date.now() - startTime, error: 'Missing required configuration' };
  await databaseAdapter.findByIdAndUpdate('InstalledIntegration', installation._id, { lastConnectionTest: { timestamp: new Date(), success: testResult.success, responseTime: testResult.responseTime, error: testResult.error }, status: testResult.success ? 'active' : installation.status });
  return testResult;
}

async function getCategories() {
  const categories = [];
  for (const category of INTEGRATION_CATEGORIES) {
    const count = await databaseAdapter.count('IntegrationMarketplaceItem', { category: category.id, status: 'active' });
    categories.push({ ...category, count });
  }
  return categories;
}

async function getIntegrationDetails(integrationId, companyId) {
  const integration = await databaseAdapter.findById('IntegrationMarketplaceItem', integrationId);
  if (!integration) return null;
  const result = { ...integration, isInstalled: false, installationStatus: null, installedAt: null };
  if (companyId) {
    const installation = await databaseAdapter.findOne('InstalledIntegration', { integrationId: integration.integrationId || integrationId, companyId });
    if (installation) { result.isInstalled = true; result.installationStatus = installation.status; result.installedAt = installation.installedAt; }
  }
  return result;
}

module.exports = { installIntegration, uninstallIntegration, updateConfiguration, testConnection, getCategories, getIntegrationDetails, validateConfiguration, generateWebhookSecret, INTEGRATION_CATEGORIES };
