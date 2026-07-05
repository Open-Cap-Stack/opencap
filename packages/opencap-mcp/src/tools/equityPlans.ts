import { z } from 'zod';
import { coerceInt } from '../schema.js';
import { type ToolDefinition } from '../types.js';

export const equityPlanTools: ToolDefinition[] = [
  {
    name: 'list_equity_plans',
    description:
      'List all equity plans (stock option plans, RSU plans, etc.) in the company. ' +
      'The ID field to use in follow-up get calls is `row_id`.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      limit: coerceInt('Max results to return').optional().default(50),
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
    description:
      'Get details for a specific equity plan by ID. Use the `row_id` field from `list_equity_plans`.',
    inputSchema: z.object({
      id: z.string().describe('Equity plan ID — use the `row_id` field from list_equity_plans'),
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
      PlanType: z
        .enum(['Stock Option Plan', 'Restricted Stock Plan'])
        .describe('Type of equity plan'),
      sharesReserved: coerceInt('Number of shares reserved for this plan'),
      companyId: z.string().describe('Company ID this plan belongs to'),
      expirationDate: z
        .string()
        .optional()
        .describe('Plan expiration date in ISO 8601 format (YYYY-MM-DD)'),
      defaultVestingSchedule: z
        .object({
          totalMonths: coerceInt('Total vesting period in months'),
          cliffMonths: coerceInt('Cliff period in months'),
        })
        .optional()
        .describe('Default vesting schedule for grants under this plan'),
    }),
    handler: async (input, client) => {
      const { data: created } = await client.post('/api/v1/equity-plans', input);
      const id = created?.data?.row_id ?? created?.row_id ?? created?._id;
      try {
        const { data: confirmed } = await client.get(`/api/v1/equity-plans/${id}`);
        const record = confirmed?.data ?? confirmed;
        return {
          content: [
            {
              type: 'text',
              text: `Equity plan created and confirmed:\nrow_id: ${record.row_id ?? id}\nname: ${record.name ?? input.name}\nPlanType: ${record.PlanType ?? input.PlanType}\ncompanyId: ${record.companyId ?? input.companyId}\n\nFull record:\n${JSON.stringify(record, null, 2)}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `Equity plan created (note: could not confirm persisted state — verify with get_equity_plan):\n${JSON.stringify(created?.data ?? created, null, 2)}`,
            },
          ],
        };
      }
    },
  },
];
