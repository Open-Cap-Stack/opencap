import { z } from 'zod';
import { type ToolDefinition } from '../types.js';

export const valuationTools: ToolDefinition[] = [
  {
    name: 'get_latest_valuation',
    description:
      'Get the most recent 409A or board-approved valuation for the company.',
    inputSchema: z.object({
      companyId: z.string().describe('Company ID'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get(
        `/api/v1/valuations/latest`,
        { params: { companyId: input.companyId } }
      );
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  },
  {
    name: 'get_valuation_history',
    description: 'Get the historical valuation timeline for the company.',
    inputSchema: z.object({
      companyId: z.string().describe('Company ID'),
      limit: z.number().optional().default(20).describe('Max results to return'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get('/api/v1/valuations', { params: input });
      const valuations = data.valuations ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(valuations, null, 2) }],
      };
    },
  },
  {
    name: 'create_valuation_request',
    description:
      'Submit a new 409A valuation request or record a board-approved valuation.',
    inputSchema: z.object({
      companyId: z.string().describe('Company ID'),
      valuationType: z
        .enum(['409A', 'board_approved', 'preferred_round', 'other'])
        .describe('Type of valuation'),
      valuationDate: z.string().describe('Effective date in ISO 8601 format (YYYY-MM-DD)'),
      commonStockFMV: z
        .number()
        .positive()
        .describe('Fair market value per common share in USD'),
      postMoneyValuation: z
        .number()
        .positive()
        .optional()
        .describe('Total post-money company valuation in USD'),
      provider: z
        .string()
        .optional()
        .describe('Name of the 409A valuation provider or firm'),
      reportUrl: z
        .string()
        .url()
        .optional()
        .describe('URL to the valuation report document'),
    }),
    handler: async (input, client) => {
      const { data } = await client.post('/api/v1/valuations', input);
      return {
        content: [
          { type: 'text', text: `Valuation recorded: ${JSON.stringify(data, null, 2)}` },
        ],
      };
    },
  },
];
