import { z } from 'zod';
import { type ToolDefinition } from '../types.js';

export const equityPlanTools: ToolDefinition[] = [
  {
    name: 'list_equity_plans',
    description:
      'List all equity plans (stock option plans, RSU plans, etc.) in the company.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      limit: z.number().optional().default(50).describe('Max results to return'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get('/api/v1/equity-plans', { params: input });
      const plans = data.equityPlans ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(plans, null, 2) }],
      };
    },
  },
  {
    name: 'get_equity_plan',
    description: 'Get details for a specific equity plan by ID.',
    inputSchema: z.object({
      id: z.string().describe('Equity plan ID'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get(`/api/v1/equity-plans/${input.id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  },
  {
    name: 'create_equity_plan',
    description: 'Create a new equity incentive plan for employees or advisors.',
    inputSchema: z.object({
      name: z.string().describe('Plan name, e.g. "2024 Stock Option Plan"'),
      planType: z
        .enum(['ISO', 'NSO', 'RSA', 'RSU', 'SAR', 'other'])
        .describe('Type of equity plan'),
      sharesReserved: z
        .number()
        .int()
        .positive()
        .describe('Number of shares reserved for this plan'),
      companyId: z.string().describe('Company ID this plan belongs to'),
      expirationDate: z
        .string()
        .optional()
        .describe('Plan expiration date in ISO 8601 format (YYYY-MM-DD)'),
      defaultVestingSchedule: z
        .object({
          totalMonths: z.number().int().positive().describe('Total vesting period in months'),
          cliffMonths: z.number().int().min(0).describe('Cliff period in months'),
        })
        .optional()
        .describe('Default vesting schedule for grants under this plan'),
    }),
    handler: async (input, client) => {
      const { data } = await client.post('/api/v1/equity-plans', input);
      return {
        content: [
          { type: 'text', text: `Equity plan created: ${JSON.stringify(data, null, 2)}` },
        ],
      };
    },
  },
];
