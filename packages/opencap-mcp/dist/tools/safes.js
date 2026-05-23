import { z } from 'zod';
import { coerceFloat, coerceBool, coerceInt } from '../schema.js';
export const safeTools = [
    {
        name: 'list_safes',
        description: 'List all SAFE (Simple Agreement for Future Equity) instruments in the cap table. ' +
            'The ID field to use in follow-up get/update calls is `safeId` (e.g. `safe_xxx`), not `_id`.',
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
        description: 'Get details for a specific SAFE instrument by ID. Use the `safeId` field (e.g. `safe_xxx`) from `list_safes`, not the `_id` field.',
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
            const id = created?.data?.safeId ?? created?.safeId ?? created?.data?.row_id ?? created?.row_id ?? created?._id;
            try {
                const { data: confirmed } = await client.get(`/api/v1/safes/${id}`);
                const record = confirmed?.data ?? confirmed;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `SAFE created and confirmed:\nsafeId: ${record.safeId ?? id}\nstatus: ${record.status ?? 'unknown'}\ncompanyId: ${record.companyId ?? input.companyId}\n\nFull record:\n${JSON.stringify(record, null, 2)}`,
                        },
                    ],
                };
            }
            catch {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `SAFE created (note: could not confirm persisted state — verify with get_safe):\n${JSON.stringify(created?.data ?? created, null, 2)}`,
                        },
                    ],
                };
            }
        },
    },
    {
        name: 'update_safe',
        description: 'Update an existing SAFE instrument (e.g. change status, record conversion). ' +
            'Use the `safeId` field (e.g. `safe_xxx`) from `list_safes`, not the `_id` field. ' +
            'When `status` is provided, uses the dedicated status-transition endpoint (PATCH /safes/:id/status). ' +
            'Non-status fields use the generic PUT endpoint.',
        inputSchema: z.object({
            id: z.string().describe('SAFE ID — use the `safeId` field from list_safes, not `_id`'),
            status: z
                .enum(['draft', 'sent', 'fully_signed', 'funded', 'converted', 'cancelled', 'expired'])
                .optional()
                .describe('New status for the SAFE (uses dedicated status-transition endpoint)'),
            reason: z
                .string()
                .optional()
                .describe('Reason for the status change (used only when status is provided)'),
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
            const { id, status, reason, ...rest } = input;
            // If status is provided, use the dedicated status-transition endpoint
            if (status) {
                await client.patch(`/api/v1/safes/${id}/status`, { status, reason });
            }
            // If there are non-status fields to update, use the generic PUT endpoint
            const hasNonStatusFields = Object.keys(rest).length > 0;
            if (hasNonStatusFields) {
                await client.put(`/api/v1/safes/${id}`, rest);
            }
            // Always re-fetch to return confirmed persisted state
            try {
                const { data: confirmed } = await client.get(`/api/v1/safes/${id}`);
                const record = confirmed?.data ?? confirmed;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `SAFE updated and confirmed:\nsafeId: ${record.safeId ?? id}\nstatus: ${record.status ?? 'unknown'}\ncompanyId: ${record.companyId ?? 'unknown'}\n\nFull record:\n${JSON.stringify(record, null, 2)}`,
                        },
                    ],
                };
            }
            catch {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `SAFE updated (note: could not confirm persisted state — verify with get_safe):\nID: ${id}`,
                        },
                    ],
                };
            }
        },
    },
];
//# sourceMappingURL=safes.js.map