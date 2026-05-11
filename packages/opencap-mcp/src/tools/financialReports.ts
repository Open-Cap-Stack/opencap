import { z } from 'zod';
import { type ToolDefinition } from '../types.js';

export const financialReportTools: ToolDefinition[] = [
  {
    name: 'list_financial_reports',
    description:
      'List all financial reports (equity summaries, cap table snapshots, tax reports, etc.).',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      reportType: z
        .enum([
          'cap_table_summary',
          'equity_summary',
          'tax_report',
          '409A_report',
          'custom',
        ])
        .optional()
        .describe('Filter by report type'),
      limit: z.number().optional().default(20).describe('Max results to return'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get('/api/v1/financial-reports', { params: input });
      const reports = data.reports ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }],
      };
    },
  },
  {
    name: 'get_financial_report',
    description: 'Get the full contents of a specific financial report by ID.',
    inputSchema: z.object({
      id: z.string().describe('Financial report ID'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get(`/api/v1/financial-reports/${input.id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  },
  {
    name: 'create_financial_report',
    description:
      'Generate a new financial report or cap table snapshot for the company.',
    inputSchema: z.object({
      companyId: z.string().describe('Company ID'),
      reportType: z
        .enum([
          'cap_table_summary',
          'equity_summary',
          'tax_report',
          '409A_report',
          'custom',
        ])
        .describe('Type of report to generate'),
      asOfDate: z
        .string()
        .optional()
        .describe('Generate the report as of this date (ISO 8601 YYYY-MM-DD). Defaults to today.'),
      includeConvertibles: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include convertible instruments (SAFEs, notes) in the report'),
      includeOptionPool: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include option pool (granted and unissued) in the report'),
      title: z.string().optional().describe('Custom report title'),
    }),
    handler: async (input, client) => {
      const { data } = await client.post('/api/v1/financial-reports', input);
      return {
        content: [
          { type: 'text', text: `Financial report created: ${JSON.stringify(data, null, 2)}` },
        ],
      };
    },
  },
];
