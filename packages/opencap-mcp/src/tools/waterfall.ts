import { z } from 'zod';
import { type ToolDefinition } from '../types.js';

export const waterfallTools: ToolDefinition[] = [
  {
    name: 'run_waterfall_analysis',
    description:
      'Run a waterfall analysis to model how exit proceeds would be distributed among ' +
      'stakeholders given their liquidation preferences, participation rights, and ownership. ' +
      'Returns proceeds per stakeholder and per share class at the given exit amount.',
    inputSchema: z.object({
      companyId: z.string().describe('Company ID'),
      exitAmount: z
        .number()
        .positive()
        .describe('Total exit/acquisition proceeds in USD'),
      exitType: z
        .enum(['acquisition', 'ipo', 'dissolution'])
        .optional()
        .default('acquisition')
        .describe('Type of exit event'),
      deductTransactionCosts: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to deduct estimated transaction costs before distribution'),
      transactionCostsAmount: z
        .number()
        .optional()
        .describe('Transaction costs amount in USD (used if deductTransactionCosts is true)'),
      includeOptionPoolSweep: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include pre-exit option pool sweep'),
      asOfDate: z
        .string()
        .optional()
        .describe('Run analysis as of a specific date (ISO 8601 YYYY-MM-DD). Defaults to today.'),
    }),
    handler: async (input, client) => {
      const { data } = await client.post('/api/v1/waterfall/analyze', input);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  },
];
