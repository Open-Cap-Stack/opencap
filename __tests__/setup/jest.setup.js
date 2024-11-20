// __tests__/setup/jest.setup.js
// ... existing code ...

// Suppress deprecation warnings
const originalConsoleWarn = console.warn;
console.warn = function(msg) {
  if (msg.includes('collection.ensureIndex is deprecated')) return;
  originalConsoleWarn.apply(console, arguments);
};

// ... rest of the code ...