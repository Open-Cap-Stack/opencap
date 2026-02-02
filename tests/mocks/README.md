# Test Mocks

This directory contains mock implementations of external services and dependencies for unit testing.

## Available Mocks

### ZeroDB Mock (`zerodbMock.js`)

Mocks all ZeroDB operations:
- Table operations (query, insert, update, delete)
- Vector operations (upsert, search)
- Event streaming (create, list)
- File storage (upload, download)
- Memory operations (store, search)
- Analytics (get analytics)
- Project info (get project details)

### Anthropic Mock (`anthropicMock.js`)

Mocks Anthropic/Claude API:
- Message creation
- Streaming responses

### OpenAI Mock (`openaiMock.js`)

Mocks OpenAI API:
- Embeddings generation
- Chat completions

## Usage

### Import Individual Mocks

```javascript
const { zerodbMock } = require('../mocks');
const { anthropicMock } = require('../mocks');
const { openaiMock } = require('../mocks');
```

### Import All Mocks

```javascript
const { zerodbMock, anthropicMock, openaiMock, resetAllMocks, clearAllMocks } = require('../mocks');
```

### Reset Mocks Before Each Test

```javascript
beforeEach(() => {
  zerodbMock.reset();
  anthropicMock.reset();
  openaiMock.reset();

  // Or use the helper
  resetAllMocks();
});
```

### Configure Mock Responses

```javascript
it('should handle custom response', async () => {
  // Configure mock response
  zerodbMock.query.mockResolvedValue({
    success: true,
    data: [{ id: '1', name: 'Test Item' }],
  });

  // Test code here
});
```

### Clear Mock History

```javascript
afterEach(() => {
  // Clear call history but keep implementations
  zerodbMock.clear();

  // Or use the helper
  clearAllMocks();
});
```

## Best Practices

1. **Always reset mocks** between tests to avoid test pollution
2. **Use specific mock values** that make sense for your test
3. **Verify mock calls** using Jest assertions:
   ```javascript
   expect(zerodbMock.query).toHaveBeenCalledWith(expectedArgs);
   expect(zerodbMock.query).toHaveBeenCalledTimes(1);
   ```
4. **Mock only what you need** - don't over-mock
5. **Keep mocks simple** - complex logic should be in the real implementation

## Adding New Mocks

When adding a new mock:

1. Create a new file in this directory (e.g., `newServiceMock.js`)
2. Follow the pattern of existing mocks
3. Export the mock object
4. Add reset() and clear() functions
5. Update `index.js` to export the new mock
6. Update this README

## Example Test

```javascript
const { zerodbMock } = require('../mocks');
const myService = require('../../services/myService');

describe('MyService', () => {
  beforeEach(() => {
    zerodbMock.reset();
  });

  afterEach(() => {
    zerodbMock.clear();
  });

  it('should query data from ZeroDB', async () => {
    // Arrange
    const mockData = [{ id: '1', name: 'Test' }];
    zerodbMock.query.mockResolvedValue({
      success: true,
      data: mockData,
    });

    // Act
    const result = await myService.getData();

    // Assert
    expect(result).toEqual(mockData);
    expect(zerodbMock.query).toHaveBeenCalledWith(/* expected args */);
  });

  it('should handle errors', async () => {
    // Arrange
    zerodbMock.query.mockRejectedValue(new Error('Connection failed'));

    // Act & Assert
    await expect(myService.getData()).rejects.toThrow('Connection failed');
  });
});
```

## Troubleshooting

### Mock Not Working

1. Ensure the mock is imported before the service under test
2. Check that you're calling the correct mock method
3. Verify the mock is reset between tests
4. Check console for any errors

### Mock Response Not Matching

1. Verify the mock return value structure
2. Check if the service expects a different format
3. Use `mockResolvedValue` for promises
4. Use `mockImplementation` for custom logic

### Test Pollution

1. Always reset mocks in `beforeEach`
2. Clear mocks in `afterEach`
3. Use `jest.clearAllMocks()` globally if needed

## Maintenance

These mocks should be updated when:
- External API contracts change
- New API methods are added
- Response formats are updated
- New services are integrated

Keep mocks synchronized with actual API interfaces to ensure tests remain valid.
