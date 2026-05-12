import { z } from 'zod';
import { coerceFloat, coerceBool, coerceInt } from '../schema.js';
import { type ToolDefinition } from '../types.js';

export const safeTools: ToolDefinition[] = [
  {
    name: 'list_safes',
    description:
      'List all SAFE (Simple Agreement for Future Equity) instruments in the cap table.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      investorId: z.string().optional().describe('Filter by investor stakeholder ID'),
      limit: coerceInt('Max results to return').optional().default(50),
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
    description:
      'Get details for a specific SAFE instrument by ID. Use the `safeId` field (e.g. `safe_xxx`) from `list_safes`, not the `_id` field.',
    inputSchema: z.object({
      id: z.string().describe('SAFE ID — use the `safeId` field from list_safes, not `_id`'),
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
      investmentAmount: coerceFloat('Investment amount in USD'),
      valuationCap: coerceFloat('Valuation cap in USD (for valuation cap SAFEs)')
        .optional(),
      discountRate: coerceFloat('Discount rate percentage (e.g. 20 for 20%)')
        .optional(),
      safeType: z
        .enum(['valuation_cap', 'discount', 'mfn', 'valuation_cap_and_discount'])
        .describe('Type of SAFE'),
      investorId: z.string().describe('Stakeholder ID of the investor'),
      companyId: z.string().describe('Company ID'),
      investmentDate: z.string().describe('Investment date in ISO 8601 format (YYYY-MM-DD)'),
      proRataRights: coerceBool('Whether the investor has pro-rata rights')
        .optional()
        .default(false),
    }),
    handler: async (input, client) => {
      const { data: created } = await client.post('/api/v1/safes', input);
      const id = created.safeId ?? created.row_id ?? created._id;
      try {
        const { data: confirmed } = await client.get(`/api/v1/safes/${id}`);
        return {
          content: [
            {
              type: 'text',
              text: `SAFE created:\n${JSON.stringify(confirmed, null, 2)}\n\nID for follow-up operations: ${id}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `SAFE created (could not confirm persisted state — verify with get_safe):\n${JSON.stringify(created, null, 2)}`,
            },
          ],
        };
      }
    },
  },
  {
    name: 'update_safe',
    description:
      'Update an existing SAFE instrument (e.g. record conversion). Use the `safeId` field (e.g. `safe_xxx`) from `list_safes`, not the `_id` field.',
    inputSchema: z.object({
      id: z.string().describe('SAFE ID — use the `safeId` field from list_safes, not `_id`'),
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
      convertedShares: coerceInt('Number of shares issued upon conversion').optional(),
    }),
    handler: async (input, client) => {
      const { id, ...body } = input;
      const { data: updated } = await client.put(`/api/v1/safes/${id}`, body);
      try {
        const { data: confirmed } = await client.get(`/api/v1/safes/${id}`);
        return {
          content: [
            {
              type: 'text',
              text: `SAFE updated:\n${JSON.stringify(confirmed, null, 2)}\n\nID for follow-up operations: ${id}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `SAFE updated (could not confirm persisted state — verify with get_safe):\n${JSON.stringify(updated, null, 2)}`,
            },
          ],
        };
      }
    },
  },
];
