import { z } from 'zod';
import { type ToolDefinition } from '../types.js';

export const safeTools: ToolDefinition[] = [
  {
    name: 'list_safes',
    description:
      'List all SAFE (Simple Agreement for Future Equity) instruments in the cap table.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      investorId: z.string().optional().describe('Filter by investor stakeholder ID'),
      limit: z.number().optional().default(50).describe('Max results to return'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get('/api/v1/safes', { params: input });
      const safes = data.safes ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(safes, null, 2) }],
      };
    },
  },
  {
    name: 'get_safe',
    description: 'Get details for a specific SAFE instrument by ID.',
    inputSchema: z.object({
      id: z.string().describe('SAFE ID'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get(`/api/v1/safes/${input.id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  },
  {
    name: 'create_safe',
    description: 'Record a new SAFE instrument (e.g. post-money SAFE from a YC-style round).',
    inputSchema: z.object({
      investmentAmount: z.number().positive().describe('Investment amount in USD'),
      valuationCap: z
        .number()
        .positive()
        .optional()
        .describe('Valuation cap in USD (for valuation cap SAFEs)'),
      discountRate: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Discount rate percentage (e.g. 20 for 20%)'),
      safeType: z
        .enum(['valuation_cap', 'discount', 'mfn', 'valuation_cap_and_discount'])
        .describe('Type of SAFE'),
      investorId: z.string().describe('Stakeholder ID of the investor'),
      companyId: z.string().describe('Company ID'),
      investmentDate: z.string().describe('Investment date in ISO 8601 format (YYYY-MM-DD)'),
      proRataRights: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the investor has pro-rata rights'),
    }),
    handler: async (input, client) => {
      const { data } = await client.post('/api/v1/safes', input);
      return {
        content: [
          { type: 'text', text: `SAFE created: ${JSON.stringify(data, null, 2)}` },
        ],
      };
    },
  },
  {
    name: 'update_safe',
    description: 'Update an existing SAFE instrument (e.g. record conversion).',
    inputSchema: z.object({
      id: z.string().describe('SAFE ID'),
      status: z
        .enum(['open', 'converted', 'cancelled'])
        .optional()
        .describe('Current status of the SAFE'),
      conversionDate: z
        .string()
        .optional()
        .describe('Conversion date in ISO 8601 format (YYYY-MM-DD)'),
      convertedShareClassId: z
        .string()
        .optional()
        .describe('Share class ID that this SAFE converted into'),
      convertedShares: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of shares issued upon conversion'),
    }),
    handler: async (input, client) => {
      const { id, ...body } = input;
      const { data } = await client.put(`/api/v1/safes/${id}`, body);
      return {
        content: [
          { type: 'text', text: `SAFE updated: ${JSON.stringify(data, null, 2)}` },
        ],
      };
    },
  },
];
