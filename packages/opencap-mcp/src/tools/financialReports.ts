import { z } from 'zod';
import { coerceInt, coerceBool } from '../schema.js';
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
      limit: coerceInt('Max results to return').optional().default(20),
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
    description:
      'Get the full contents of a specific financial report by ID. Use the `row_id` field from `list_financial_reports`.',
    inputSchema: z.object({
      id: z
        .string()
        .describe('Financial report ID — use the `row_id` field from list_financial_reports'),
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
      includeConvertibles: coerceBool(
        'Include convertible instruments (SAFEs, notes) in the report'
      )
        .optional()
        .default(true),
      includeOptionPool: coerceBool(
        'Include option pool (granted and unissued) in the report'
      )
        .optional()
        .default(true),
      title: z.string().optional().describe('Custom report title'),
    }),
    handler: async (input, client) => {
      const { data: created } = await client.post('/api/v1/financial-reports', input);
      const id = created.row_id ?? created._id;
      try {
        const { data: confirmed } = await client.get(`/api/v1/financial-reports/${id}`);
        return {
          content: [
            {
              type: 'text',
              text: `Financial report created:\n${JSON.stringify(confirmed, null, 2)}\n\nID for follow-up operations: ${id}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `Financial report created (could not confirm persisted state — verify with get_financial_report):\n${JSON.stringify(created, null, 2)}`,
            },
          ],
        };
      }
    },
  },
];
