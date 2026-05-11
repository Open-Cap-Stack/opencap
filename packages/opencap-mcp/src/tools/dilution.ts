import { z } from 'zod';
import { type ToolDefinition } from '../types.js';

export const dilutionTools: ToolDefinition[] = [
  {
    name: 'calculate_dilution',
    description:
      'Calculate dilution impact for a hypothetical new funding round or equity issuance. ' +
      'Returns pre- and post-dilution ownership percentages for each stakeholder.',
    inputSchema: z.object({
      companyId: z.string().describe('Company ID'),
      newSharesIssued: z
        .number()
        .int()
        .positive()
        .describe('Number of new shares to be issued in the scenario'),
      includeOptionPool: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include unissued option pool shares in the denominator'),
      includeSafes: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include SAFEs in conversion when calculating dilution'),
    }),
    handler: async (input, client) => {
      const { data } = await client.post('/api/v1/dilution/calculate', input);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  },
  {
    name: 'get_fully_diluted_shares',
    description:
      'Get the current fully diluted share count including outstanding shares, ' +
      'options (granted and reserved), warrants, and convertible instruments.',
    inputSchema: z.object({
      companyId: z.string().describe('Company ID'),
      asOfDate: z
        .string()
        .optional()
        .describe('Calculate as of a specific date (ISO 8601 YYYY-MM-DD). Defaults to today.'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get('/api/v1/dilution/fully-diluted', {
        params: input,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  },
];
