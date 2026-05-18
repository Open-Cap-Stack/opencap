import { formatMcpError } from '../src/errors.js';
import { ZodError, ZodIssue } from 'zod';

describe('formatMcpError', () => {
  it('formats 401 errors with auth guidance', () => {
    const err = {
      response: { status: 401, data: { message: 'Unauthorized' } },
    };
    const result = formatMcpError(err);
    expect(result).toContain('Access denied');
    expect(result).toContain('whoami');
    expect(result).toContain('Unauthorized');
  });

  it('formats 403 errors with auth guidance', () => {
    const err = {
      response: { status: 403, data: { error: 'Forbidden' } },
    };
    const result = formatMcpError(err);
    expect(result).toContain('Access denied');
    expect(result).toContain('companyId');
    expect(result).toContain('Forbidden');
  });

  it('formats 404 errors with ID guidance', () => {
    const err = {
      response: { status: 404, data: { message: 'Not found' } },
    };
    const result = formatMcpError(err);
    expect(result).toContain('Record not found');
    expect(result).toContain('domain ID');
    expect(result).toContain('list_*');
  });

  it('formats 400 errors with field guidance', () => {
    const err = {
      response: { status: 400, data: { message: 'companyId is required' } },
    };
    const result = formatMcpError(err);
    expect(result).toContain('Invalid request');
    expect(result).toContain('companyId is required');
    expect(result).toContain('required fields');
  });

  it('formats 500 errors with retry guidance', () => {
    const err = {
      response: { status: 500, data: { error: 'Internal error' } },
    };
    const result = formatMcpError(err);
    expect(result).toContain('could not save');
    expect(result).toContain('Try again');
    expect(result).toContain('Internal error');
  });

  it('formats unknown status errors', () => {
    const err = {
      response: { status: 502, data: { message: 'Bad gateway' } },
    };
    const result = formatMcpError(err);
    expect(result).toContain('502');
    expect(result).toContain('Bad gateway');
  });

  it('formats errors without response', () => {
    const err = new Error('Network timeout');
    const result = formatMcpError(err);
    expect(result).toContain('Network timeout');
  });

  it('formats ZodError with field paths', () => {
    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['companyId'],
        message: 'Required',
      },
      {
        code: 'invalid_type',
        expected: 'number',
        received: 'string',
        path: ['investmentAmount'],
        message: 'Expected number, received string',
      },
    ];
    const err = new ZodError(issues);
    const result = formatMcpError(err);
    expect(result).toContain('Invalid input');
    expect(result).toContain('companyId: Required');
    expect(result).toContain('investmentAmount: Expected number');
  });

  it('formats non-Error objects', () => {
    const result = formatMcpError('something broke');
    expect(result).toContain('something broke');
  });
});
