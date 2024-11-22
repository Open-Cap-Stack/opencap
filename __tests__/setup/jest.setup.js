// __tests__/setup/jest.setup.js
// ... existing code ...

// Suppress deprecation warnings
const originalConsoleWarn = console.warn;
console.warn = function(msg) {
  if (msg.includes('collection.ensureIndex is deprecated')) return;
  originalConsoleWarn.apply(console, arguments);
};

// ... rest of the code ...

// jest.setup.js
jest.setTimeout(30000);

beforeAll(() => {
  // Suppress console logs during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console
  jest.restoreAllMocks();
});