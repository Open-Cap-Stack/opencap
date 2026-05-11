import { z } from 'zod';
import { type ToolDefinition } from '../types.js';

export const shareClassTools: ToolDefinition[] = [
  {
    name: 'list_share_classes',
    description:
      'List all share classes defined in the cap table (e.g. Common, Series A Preferred).',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      limit: z.number().optional().default(50).describe('Max results to return'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get('/api/v1/share-classes', { params: input });
      const shareClasses = data.shareClasses ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(shareClasses, null, 2) }],
      };
    },
  },
  {
    name: 'get_share_class',
    description: 'Get details for a specific share class by ID.',
    inputSchema: z.object({
      id: z.string().describe('Share class ID'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get(`/api/v1/share-classes/${input.id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  },
  {
    name: 'create_share_class',
    description: 'Create a new share class (e.g. Series B Preferred).',
    inputSchema: z.object({
      name: z.string().describe('Share class name, e.g. "Series A Preferred"'),
      classType: z
        .enum(['common', 'preferred', 'warrant', 'option'])
        .describe('Type of share class'),
      authorizedShares: z
        .number()
        .int()
        .positive()
        .describe('Total number of authorized shares'),
      parValue: z.number().optional().describe('Par value per share in USD'),
      companyId: z.string().describe('Company ID this share class belongs to'),
      liquidationPreference: z
        .number()
        .optional()
        .describe('Liquidation preference multiplier (e.g. 1 for 1x)'),
      participationRights: z
        .enum(['none', 'full', 'capped'])
        .optional()
        .describe('Participation rights type'),
    }),
    handler: async (input, client) => {
      const { data } = await client.post('/api/v1/share-classes', input);
      return {
        content: [
          { type: 'text', text: `Share class created: ${JSON.stringify(data, null, 2)}` },
        ],
      };
    },
  },
];
