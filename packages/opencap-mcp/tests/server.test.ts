import { createServer, ALL_TOOLS } from '../src/server.js';
import { createClient } from '../src/client.js';

// Mock axios so createClient works without a real network
jest.mock('axios', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  const axios = {
    create: jest.fn(() => mockClient),
    default: { create: jest.fn(() => mockClient) },
  };
  return { ...axios, default: axios };
});

// Provide a fake API key so auth doesn't throw
process.env.OPENCAP_API_KEY = 'test-server-key';
process.env.OPENCAP_BASE_URL = 'https://api.opencapstack.com';

describe('ALL_TOOLS registry', () => {
  const toolNames = ALL_TOOLS.map((t) => t.name);

  it('contains all stakeholder tools', () => {
    expect(toolNames).toContain('list_stakeholders');
    expect(toolNames).toContain('get_stakeholder');
    expect(toolNames).toContain('create_stakeholder');
    expect(toolNames).toContain('update_stakeholder');
  });

  it('contains all share class tools', () => {
    expect(toolNames).toContain('list_share_classes');
    expect(toolNames).toContain('get_share_class');
    expect(toolNames).toContain('create_share_class');
  });

  it('contains all equity plan tools', () => {
    expect(toolNames).toContain('list_equity_plans');
    expect(toolNames).toContain('get_equity_plan');
    expect(toolNames).toContain('create_equity_plan');
  });

  it('contains all SAFE tools', () => {
    expect(toolNames).toContain('list_safes');
    expect(toolNames).toContain('get_safe');
    expect(toolNames).toContain('create_safe');
    expect(toolNames).toContain('update_safe');
  });

  it('contains all document tools', () => {
    expect(toolNames).toContain('list_documents');
    expect(toolNames).toContain('get_document');
    expect(toolNames).toContain('search_documents');
  });

  it('contains all valuation tools', () => {
    expect(toolNames).toContain('get_latest_valuation');
    expect(toolNames).toContain('get_valuation_history');
    expect(toolNames).toContain('create_valuation_request');
  });

  it('contains all dilution tools', () => {
    expect(toolNames).toContain('calculate_dilution');
    expect(toolNames).toContain('get_fully_diluted_shares');
  });

  it('contains the waterfall tool', () => {
    expect(toolNames).toContain('run_waterfall_analysis');
  });

  it('contains all financial report tools', () => {
    expect(toolNames).toContain('list_financial_reports');
    expect(toolNames).toContain('get_financial_report');
    expect(toolNames).toContain('create_financial_report');
  });

  it('contains all meta tools', () => {
    expect(toolNames).toContain('whoami');
    expect(toolNames).toContain('list_workflows');
    expect(toolNames).toContain('cap_table_summary');
  });

  it('contains all equity grant tools', () => {
    expect(toolNames).toContain('list_equity_grants');
    expect(toolNames).toContain('get_equity_grant');
    expect(toolNames).toContain('create_equity_grant');
    expect(toolNames).toContain('update_equity_grant');
    expect(toolNames).toContain('get_vesting_schedule');
  });

  it('has no duplicate tool names', () => {
    const unique = new Set(toolNames);
    expect(unique.size).toBe(toolNames.length);
  });
});

describe('list_workflows tool', () => {
  it('returns workflow recipes with description and steps', async () => {
    const tool = ALL_TOOLS.find((t) => t.name === 'list_workflows')!;
    const result = await tool.handler({}, {} as any);
    const text = result.content[0].type === 'text' ? result.content[0].text : '';
    const workflows = JSON.parse(text);

    expect(workflows.add_advisor_with_equity).toBeDefined();
    expect(workflows.add_advisor_with_equity.description).toBeTruthy();
    expect(workflows.add_advisor_with_equity.steps).toHaveLength(3);
    expect(workflows.add_advisor_with_equity.steps[0].tool).toBe('create_stakeholder');
    expect(workflows.add_advisor_with_equity.steps[0].notes).toBeTruthy();

    expect(workflows.record_safe_round).toBeDefined();
    expect(workflows.record_safe_round.description).toBeTruthy();
    expect(workflows.record_safe_round.steps).toHaveLength(2);

    expect(workflows.request_409a_valuation).toBeDefined();
    expect(workflows.request_409a_valuation.description).toBeTruthy();
    expect(workflows.request_409a_valuation.steps).toHaveLength(2);
  });
});

describe('createServer', () => {
  it('returns a server instance', () => {
    const client = createClient('test-key');
    const server = createServer(client);
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe('function');
  });
});
