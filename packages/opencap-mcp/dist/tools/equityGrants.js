import { z } from 'zod';
import { coerceInt, coerceFloat } from '../schema.js';
export const equityGrantTools = [
    {
        name: 'list_equity_grants',
        description: 'List all equity grants (options, RSAs, RSUs, etc.) for a company. ' +
            'The ID field to use in follow-up get/update calls is `grantId`, not `_id`.',
        inputSchema: z.object({
            companyId: z.string().describe('Company ID'),
            limit: coerceInt('Max results to return').optional().default(50),
        }),
        handler: async (input, client) => {
            const { data } = await client.get('/api/v1/equity-grants', { params: input });
            const grants = data.grants ?? data;
            return {
                content: [{ type: 'text', text: JSON.stringify(grants, null, 2) }],
            };
        },
    },
    {
        name: 'get_equity_grant',
        description: 'Get details for a specific equity grant by ID. ' +
            'Use the `grantId` field from `list_equity_grants`, not the `_id` field.',
        inputSchema: z.object({
            id: z
                .string()
                .describe('Grant ID — use the `grantId` field from list_equity_grants, not `_id`'),
        }),
        handler: async (input, client) => {
            const { data } = await client.get(`/api/v1/equity-grants/${input.id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'create_equity_grant',
        description: 'Create a new equity grant for an employee or advisor. ' +
            'Use the `grantId` field from list_equity_grants for follow-up operations, not the `_id` field.',
        inputSchema: z.object({
            companyId: z.string().describe('Company ID'),
            employeeId: z
                .string()
                .describe('Stakeholder ID of the grantee — use the `row_id` from list_stakeholders'),
            equityPlanId: z
                .string()
                .describe('Equity plan ID — use the `row_id` from list_equity_plans'),
            grantType: z
                .enum(['ISO', 'NSO', 'RSA', 'RSU', 'SAR', 'phantom'])
                .describe('Type of equity grant'),
            numberOfShares: coerceInt('Number of shares in this grant'),
            grantDate: z.string().describe('Grant date in ISO 8601 format (YYYY-MM-DD)'),
            vestingStartDate: z
                .string()
                .optional()
                .describe('Vesting start date in ISO 8601 format (YYYY-MM-DD). Defaults to grantDate.'),
            strikePrice: coerceFloat('Exercise/strike price per share in USD (required for options)').optional(),
            vestingSchedule: z
                .object({
                totalMonths: coerceInt('Total vesting period in months'),
                cliffMonths: coerceInt('Cliff period in months'),
            })
                .optional()
                .describe('Vesting schedule for this grant. Overrides the equity plan default.'),
            notes: z.string().optional().describe('Free-text notes about this grant'),
        }),
        handler: async (input, client) => {
            const { data: created } = await client.post('/api/v1/equity-grants', input);
            const id = created?.data?.grantId ?? created?.grantId ?? created?.data?.row_id ?? created?.row_id ?? created?._id;
            try {
                const { data: confirmed } = await client.get(`/api/v1/equity-grants/${id}`);
                const record = confirmed?.data ?? confirmed;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Equity grant created and confirmed:\ngrantId: ${record.grantId ?? id}\nstatus: ${record.status ?? 'unknown'}\ncompanyId: ${record.companyId ?? input.companyId}\nemployeeId: ${record.employeeId ?? input.employeeId}\n\nFull record:\n${JSON.stringify(record, null, 2)}`,
                        },
                    ],
                };
            }
            catch {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Equity grant created (note: could not confirm persisted state — verify with get_equity_grant):\n${JSON.stringify(created?.data ?? created, null, 2)}`,
                        },
                    ],
                };
            }
        },
    },
    {
        name: 'update_equity_grant',
        description: 'Update an equity grant — change status, fix linkage, adjust shares, or add notes. ' +
            'Use the `grantId` field from `list_equity_grants`, not the `_id` field. ' +
            'When `status` is provided, uses the dedicated status-transition endpoint. ' +
            'Other fields use the generic PUT endpoint.',
        inputSchema: z.object({
            id: z
                .string()
                .describe('Grant ID — use the `grantId` field from list_equity_grants, not `_id`'),
            status: z
                .enum(['pending', 'approved', 'active', 'exercised', 'cancelled', 'expired'])
                .optional()
                .describe('New status for the grant (uses dedicated status-transition endpoint)'),
            employeeId: z
                .string()
                .optional()
                .describe('Stakeholder row_id to link this grant to'),
            numberOfShares: coerceInt('Number of shares in this grant').optional(),
            strikePrice: coerceFloat('Exercise/strike price per share in USD').optional(),
            grantDate: z.string().optional().describe('Grant date in ISO 8601 format (YYYY-MM-DD)'),
            expirationDate: z.string().optional().describe('Expiration date in ISO 8601 format (YYYY-MM-DD)'),
            vestingSchedule: z
                .object({
                totalShares: coerceInt('Total shares in vesting schedule').optional(),
                vestingPeriodMonths: coerceInt('Total vesting period in months').optional(),
                cliffMonths: coerceInt('Cliff period in months').optional(),
                vestingFrequency: z.enum(['monthly', 'quarterly', 'annually']).optional(),
                startDate: z.string().optional().describe('Vesting start date (YYYY-MM-DD)'),
            })
                .optional()
                .describe('Vesting schedule for this grant'),
            notes: z.string().optional().describe('Free-text notes about this grant'),
        }),
        handler: async (input, client) => {
            const { id, status, ...rest } = input;
            if (status) {
                await client.patch(`/api/v1/equity-grants/${id}/status`, { status });
            }
            const hasOtherFields = Object.keys(rest).length > 0;
            if (hasOtherFields) {
                await client.put(`/api/v1/equity-grants/${id}`, rest);
            }
            try {
                const { data: confirmed } = await client.get(`/api/v1/equity-grants/${id}`);
                const record = confirmed?.data ?? confirmed;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Equity grant updated and confirmed:\ngrantId: ${record.grantId ?? id}\nstatus: ${record.status ?? status ?? 'unchanged'}\ncompanyId: ${record.companyId ?? 'unknown'}\n\nFull record:\n${JSON.stringify(record, null, 2)}`,
                        },
                    ],
                };
            }
            catch {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Equity grant updated (note: could not confirm persisted state — verify with get_equity_grant):\nID: ${id}`,
                        },
                    ],
                };
            }
        },
    },
    {
        name: 'get_vesting_schedule',
        description: 'Get the full vesting schedule for a specific equity grant — shows each vesting event, ' +
            'cliff date, and cumulative shares vested over time. ' +
            'Use the `grantId` field from `list_equity_grants`, not the `_id` field.',
        inputSchema: z.object({
            id: z
                .string()
                .describe('Grant ID — use the `grantId` field from list_equity_grants, not `_id`'),
        }),
        handler: async (input, client) => {
            const { data } = await client.get(`/api/v1/equity-grants/${input.id}/vesting`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
];
//# sourceMappingURL=equityGrants.js.map