// config/index.js
module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'test-secret',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/opencap_test',
  API_VERSION: 'v1',
  AUTH: {
    TOKEN_EXPIRATION: '24h',
    REFRESH_TOKEN_EXPIRATION: '7d',
    SALT_ROUNDS: 10
  },
  PERMISSIONS: {
    GET: 'read:reports',
    POST: 'create:reports',
    PUT: 'update:reports',
    PATCH: 'update:reports',
    DELETE: 'delete:reports'
  }
};