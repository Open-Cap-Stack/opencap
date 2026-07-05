import { z } from 'zod';
import { coerceInt, coerceFloat } from '../schema.js';
export const dilutionTools = [
    {
        name: 'calculate_dilution',
        description: 'Calculate dilution impact for a hypothetical new funding round or equity issuance. ' +
            'Returns pre- and post-dilution ownership percentages for each stakeholder.',
        inputSchema: z.object({
            companyId: z.string().describe('Company ID'),
            preMoney: coerceFloat('Pre-money valuation in USD'),
            newInvestment: coerceFloat('New investment amount in USD'),
            existingShares: coerceInt('Current number of existing shares'),
            sharePrice: coerceFloat('Price per share in USD (defaults to preMoney / existingShares)')
                .optional(),
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
        description: 'Get the current fully diluted share count including outstanding shares, ' +
            'options (granted and reserved), warrants, and convertible instruments.',
        inputSchema: z.object({
            companyId: z.string().describe('Company ID'),
            asOfDate: z
                .string()
                .optional()
                .describe('Calculate as of a specific date (ISO 8601 YYYY-MM-DD). Defaults to today.'),
        }),
        handler: async (input, client) => {
            const { companyId, ...params } = input;
            const { data } = await client.get(`/api/v1/dilution/fully-diluted/${companyId}`, {
                params,
            });
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
];
//# sourceMappingURL=dilution.js.map