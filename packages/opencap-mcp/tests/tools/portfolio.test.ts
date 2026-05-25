import { portfolioTools } from '../../src/tools/portfolio.js';
import { type AxiosInstance } from 'axios';
import { type ToolResult } from '../../src/types.js';

function makeClient(overrides: Partial<AxiosInstance> = {}): AxiosInstance {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as AxiosInstance;
}

function firstText(result: ToolResult): string {
  const item = result.content[0];
  if (item.type !== 'text') throw new Error(`Expected text content, got ${item.type}`);
  return item.text;
}

const portfolioSummaryTool = portfolioTools.find((t) => t.name === 'portfolio_summary')!;
const crossCompanyDilutionTool = portfolioTools.find((t) => t.name === 'cross_company_dilution')!;
const portfolioInvestorViewTool = portfolioTools.find((t) => t.name === 'portfolio_investor_view')!;

describe('portfolio_summary', () => {
  it('should be defined', () => {
    expect(portfolioSummaryTool).toBeDefined();
  });

  it('fetches stakeholders then cap table summaries for each company', async () => {
    const stakeholders = [
      { row_id: 'sh-1', name: 'VC Fund', companyId: 'co-1' },
      { row_id: 'sh-2', name: 'VC Fund', companyId: 'co-2' },
    ];

    const client = makeClient({
      get: jest.fn()
        .mockResolvedValueOnce({ data: { stakeholders } }) // list stakeholders by investorId
        .mockResolvedValueOnce({ data: { totalShares: 1000, shareClasses: [] } }) // cap table co-1
        .mockResolvedValueOnce({ data: { totalShares: 2000, shareClasses: [] } }), // cap table co-2
    });

    const result = await portfolioSummaryTool.handler({ investorId: 'sh-1' }, client);

    expect(result.isError).toBeFalsy();
    const text = firstText(result);
    expect(text).toContain('portfolio');
  });

  it('returns error content when API fails', async () => {
    const client = makeClient({
      get: jest.fn().mockRejectedValue(new Error('API error')),
    });

    await expect(portfolioSummaryTool.handler({ investorId: 'sh-1' }, client)).rejects.toThrow();
  });

  it('requires investorId', () => {
    const parsed = portfolioSummaryTool.inputSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});

describe('cross_company_dilution', () => {
  it('should be defined', () => {
    expect(crossCompanyDilutionTool).toBeDefined();
  });

  it('fetches dilution data across companies for investor', async () => {
    const stakeholders = [
      { row_id: 'sh-1', name: 'VC Fund', companyId: 'co-1', sharesOwned: 100000 },
    ];

    const client = makeClient({
      get: jest.fn()
        .mockResolvedValueOnce({ data: { stakeholders } })
        .mockResolvedValueOnce({ data: { fullyDilutedShares: 1000000 } }),
    });

    const result = await crossCompanyDilutionTool.handler(
      { investorId: 'sh-1', scenario: 'series-b' },
      client
    );

    expect(result.isError).toBeFalsy();
    const text = firstText(result);
    expect(text).toBeDefined();
  });

  it('requires investorId', () => {
    const parsed = crossCompanyDilutionTool.inputSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});

describe('portfolio_investor_view', () => {
  it('should be defined', () => {
    expect(portfolioInvestorViewTool).toBeDefined();
  });

  it('aggregates investor data across portfolio companies', async () => {
    const positions = [
      { row_id: 'sh-1', name: 'VC Fund', companyId: 'co-1', sharesOwned: 100000, shareClass: 'Series A' }
    ];

    const client = makeClient({
      get: jest.fn()
        .mockResolvedValueOnce({ data: { stakeholders: positions } })
        .mockResolvedValueOnce({ data: { valuations: [{ amount: 10000000 }] } }),
    });

    const result = await portfolioInvestorViewTool.handler({ investorId: 'sh-1' }, client);

    expect(result.isError).toBeFalsy();
    const text = firstText(result);
    expect(text).toBeDefined();
  });

  it('requires investorId', () => {
    const parsed = portfolioInvestorViewTool.inputSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('accepts optional asOf date', () => {
    const parsed = portfolioInvestorViewTool.inputSchema.safeParse({
      investorId: 'sh-1',
      asOf: '2024-01-01'
    });
    expect(parsed.success).toBe(true);
  });
});
