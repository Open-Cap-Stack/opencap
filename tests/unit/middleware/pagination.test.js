const { parsePagination, MAX_LIMIT, DEFAULT_LIMIT } = require('../../../middleware/pagination');

describe('parsePagination', () => {
  test('returns defaults when no query params', () => {
    const result = parsePagination({});
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  test('respects valid limit', () => {
    const result = parsePagination({ limit: '50' });
    expect(result.limit).toBe(50);
  });

  test('caps limit at MAX_LIMIT', () => {
    const result = parsePagination({ limit: '999999' });
    expect(result.limit).toBe(100);
  });

  test('enforces minimum limit of 1', () => {
    const result = parsePagination({ limit: '-5' });
    expect(result.limit).toBe(1);
  });

  test('handles non-numeric limit', () => {
    const result = parsePagination({ limit: 'abc' });
    expect(result.limit).toBe(20);
  });

  test('handles negative skip', () => {
    const result = parsePagination({ skip: '-10' });
    expect(result.skip).toBe(0);
  });

  test('supports page parameter', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result.skip).toBe(20); // (3-1) * 10
  });

  test('skip takes precedence over page when skip is non-zero', () => {
    const result = parsePagination({ skip: '5', page: '3', limit: '10' });
    expect(result.skip).toBe(5);
  });

  test('page defaults to 1 when not provided', () => {
    const result = parsePagination({ limit: '10' });
    expect(result.skip).toBe(0); // (1-1) * 10
  });

  test('page minimum is 1 even if negative provided', () => {
    const result = parsePagination({ page: '-1', limit: '10' });
    expect(result.skip).toBe(0); // (1-1) * 10
  });

  test('handles zero limit by falling back to default', () => {
    const result = parsePagination({ limit: '0' });
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  test('handles valid skip value', () => {
    const result = parsePagination({ skip: '25' });
    expect(result.skip).toBe(25);
  });

  test('MAX_LIMIT is 100', () => {
    expect(MAX_LIMIT).toBe(100);
  });

  test('DEFAULT_LIMIT is 20', () => {
    expect(DEFAULT_LIMIT).toBe(20);
  });
});
