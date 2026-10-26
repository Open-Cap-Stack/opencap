/**
 * NLWeb /ask Route Tests
 *
 * Verifies the public, no-auth conversational search endpoint: real
 * keyword retrieval against llms-full.txt, not a canned response.
 */

const request = require('supertest');
const express = require('express');

jest.mock('../../../middleware/rateLimiter', () => ({
  createEndpointRateLimiter: () => (req, res, next) => next(),
}));

const FIXTURE_CONTEXT = `# Test Context

## Product Overview

OpenCap Stack is a cap table platform.

## Core Data Model

### SAFENote

Simple Agreement for Future Equity instrument. Has investment_amount and valuation_cap fields.

### ShareClass

Defines a class of stock such as common or preferred.

## Rate Limits

Requests are limited to 1000 per 15 minutes per authenticated user.
`;

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
}));

describe('nlwebAskRoutes', () => {
  let app;
  let fs;

  beforeEach(() => {
    jest.resetModules();
    fs = require('fs');
    fs.readFileSync.mockReturnValue(FIXTURE_CONTEXT);
    const nlwebAskRoutes = require('../../../routes/nlwebAskRoutes');
    app = express();
    app.use('/', nlwebAskRoutes);
  });

  it('requires a query parameter', async () => {
    const res = await request(app).get('/ask');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_QUERY');
  });

  it('rejects an empty query parameter', async () => {
    const res = await request(app).get('/ask?q=');
    expect(res.status).toBe(400);
  });

  it('retrieves the SAFENote subsection for a SAFE note question, not an unrelated section', async () => {
    const res = await request(app).get('/ask?q=' + encodeURIComponent('what is a SAFE note'));
    expect(res.status).toBe(200);
    expect(res.body.sources[0].heading).toBe('SAFENote');
    expect(res.body.answer).toMatch(/Simple Agreement for Future Equity/);
  });

  it('matches camelCase/PascalCase compound headings against separate query words', async () => {
    // Regression: tokenizer previously treated "ShareClass" as one token,
    // so a query for "share class" (two words) never matched it at all.
    const res = await request(app).get('/ask?q=' + encodeURIComponent('what is a share class'));
    expect(res.status).toBe(200);
    expect(res.body.sources[0].heading).toBe('ShareClass');
  });

  it('returns no match (not a fabricated answer) for an unrelated query', async () => {
    const res = await request(app).get('/ask?q=xyzzyplughquux');
    expect(res.status).toBe(200);
    expect(res.body.answer).toBeNull();
    expect(res.body.sources).toEqual([]);
  });

  it('includes a pointer to the full context document', async () => {
    const res = await request(app).get('/ask?q=' + encodeURIComponent('rate limits'));
    expect(res.status).toBe(200);
    expect(res.body.full_context).toBe('https://opencapstack.com/llms-full.txt');
  });

  it('returns a graceful empty-match response if the context file is unreadable', async () => {
    jest.resetModules();
    const brokenFs = require('fs');
    brokenFs.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const brokenRoutes = require('../../../routes/nlwebAskRoutes');
    const brokenApp = express();
    brokenApp.use('/', brokenRoutes);

    const res = await request(brokenApp).get('/ask?q=anything');
    expect(res.status).toBe(200);
    expect(res.body.answer).toBeNull();
  });
});
