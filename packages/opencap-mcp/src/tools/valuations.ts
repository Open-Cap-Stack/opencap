import { z } from 'zod';
import { coerceInt, coerceFloat } from '../schema.js';
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
      const { data } = await client.get('/api/v1/valuations/latest', {
        params: { companyId: input.companyId },
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  },
  {
    name: 'get_valuation_history',
    description:
      'Get the historical valuation timeline for the company. ' +
      'The ID field to use in follow-up calls is `row_id`.',
    inputSchema: z.object({
      companyId: z.string().describe('Company ID'),
      limit: coerceInt('Max results to return').optional().default(20),
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
      commonStockFMV: coerceFloat('Fair market value per common share in USD'),
      postMoneyValuation: coerceFloat('Total post-money company valuation in USD').optional(),
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
      const { data: created } = await client.post('/api/v1/valuations', input);
      const id = created.row_id ?? created._id;
      try {
        const { data: confirmed } = await client.get(`/api/v1/valuations/${id}`);
        return {
          content: [
            {
              type: 'text',
              text: `Valuation recorded:\n${JSON.stringify(confirmed, null, 2)}\n\nID for follow-up operations: ${id}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `Valuation recorded (could not confirm persisted state — verify with get_valuation_history):\n${JSON.stringify(created, null, 2)}`,
            },
          ],
        };
      }
    },
  },
];
