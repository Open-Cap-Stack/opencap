module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000, // Increase default timeout to 10 seconds
  runInBand: true, // Run tests sequentially
  transformIgnorePatterns: ['<roodDir>/node_modules/(?!@swish)'],
};
