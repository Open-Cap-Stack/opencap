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
                .enum(['ISO', 'NSO', 'RSA', 'RSU', 'SAR', 'other'])
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
        description: 'Update the status of an equity grant (e.g. approve, cancel, mark as exercised). ' +
            'Use the `grantId` field from `list_equity_grants`, not the `_id` field.',
        inputSchema: z.object({
            id: z
                .string()
                .describe('Grant ID — use the `grantId` field from list_equity_grants, not `_id`'),
            status: z
                .enum(['pending', 'approved', 'active', 'exercised', 'cancelled', 'expired'])
                .describe('New status for the grant'),
        }),
        handler: async (input, client) => {
            const { id, ...body } = input;
            await client.patch(`/api/v1/equity-grants/${id}/status`, body);
            try {
                const { data: confirmed } = await client.get(`/api/v1/equity-grants/${id}`);
                const record = confirmed?.data ?? confirmed;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Equity grant updated and confirmed:\ngrantId: ${record.grantId ?? id}\nstatus: ${record.status ?? input.status}\ncompanyId: ${record.companyId ?? 'unknown'}\n\nFull record:\n${JSON.stringify(record, null, 2)}`,
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