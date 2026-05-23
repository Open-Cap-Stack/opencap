import { z } from 'zod';
import { coerceInt, coerceFloat } from '../schema.js';
export const shareClassTools = [
    {
        name: 'list_share_classes',
        description: 'List all share classes defined in the cap table (e.g. Common, Series A Preferred). ' +
            'The ID field to use in follow-up get calls is `row_id`.',
        inputSchema: z.object({
            companyId: z.string().optional().describe('Filter by company ID'),
            limit: coerceInt('Max results to return').optional().default(50),
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
        description: 'Get details for a specific share class by ID. Use the `row_id` field from `list_share_classes`.',
        inputSchema: z.object({
            id: z.string().describe('Share class ID — use the `row_id` field from list_share_classes'),
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
            authorizedShares: coerceInt('Total number of authorized shares').refine((v) => v > 0, { message: 'authorizedShares must be a positive integer' }),
            parValue: coerceFloat('Par value per share in USD').optional(),
            companyId: z.string().describe('Company ID this share class belongs to'),
            liquidationPreference: coerceFloat('Liquidation preference multiplier (e.g. 1 for 1x)')
                .optional(),
            participationRights: z
                .enum(['none', 'full', 'capped'])
                .optional()
                .describe('Participation rights type'),
        }),
        handler: async (input, client) => {
            const { data: created } = await client.post('/api/v1/share-classes', input);
            const id = created?.data?.row_id ?? created?.row_id ?? created?._id;
            try {
                const { data: confirmed } = await client.get(`/api/v1/share-classes/${id}`);
                const record = confirmed?.data ?? confirmed;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Share class created and confirmed:\nrow_id: ${record.row_id ?? id}\nname: ${record.name ?? input.name}\nclassType: ${record.classType ?? input.classType}\ncompanyId: ${record.companyId ?? input.companyId}\n\nFull record:\n${JSON.stringify(record, null, 2)}`,
                        },
                    ],
                };
            }
            catch {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Share class created (note: could not confirm persisted state — verify with get_share_class):\n${JSON.stringify(created?.data ?? created, null, 2)}`,
                        },
                    ],
                };
            }
        },
    },
];
//# sourceMappingURL=shareClasses.js.map