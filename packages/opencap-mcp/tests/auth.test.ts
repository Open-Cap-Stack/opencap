import { getApiKey, getBaseUrl } from '../src/auth.js';

describe('getApiKey', () => {
  const ORIGINAL = process.env.OPENCAP_API_KEY;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.OPENCAP_API_KEY;
    } else {
      process.env.OPENCAP_API_KEY = ORIGINAL;
    }
  });

  it('throws a helpful error when OPENCAP_API_KEY is not set', () => {
    delete process.env.OPENCAP_API_KEY;
    expect(() => getApiKey()).toThrow(
      'Set OPENCAP_API_KEY to your OpenCap JWT token.'
    );
  });

  it('throws an error that includes the login URL', () => {
    delete process.env.OPENCAP_API_KEY;
    expect(() => getApiKey()).toThrow(
      'https://api.opencapstack.com/api/v1/auth/login'
    );
  });

  it('returns the key when OPENCAP_API_KEY is set', () => {
    process.env.OPENCAP_API_KEY = 'test-api-key-abc123';
    expect(getApiKey()).toBe('test-api-key-abc123');
  });
});

describe('getBaseUrl', () => {
  const ORIGINAL = process.env.OPENCAP_BASE_URL;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.OPENCAP_BASE_URL;
    } else {
      process.env.OPENCAP_BASE_URL = ORIGINAL;
    }
  });

  it('defaults to https://api.opencapstack.com when OPENCAP_BASE_URL is not set', () => {
    delete process.env.OPENCAP_BASE_URL;
    expect(getBaseUrl()).toBe('https://api.opencapstack.com');
  });

  it('returns the custom base URL when OPENCAP_BASE_URL is set', () => {
    process.env.OPENCAP_BASE_URL = 'https://self-hosted.example.com';
    expect(getBaseUrl()).toBe('https://self-hosted.example.com');
  });
});
