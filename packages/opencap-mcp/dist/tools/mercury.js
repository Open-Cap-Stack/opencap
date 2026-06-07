import { z } from 'zod';
import { coerceFloat, coerceInt } from '../schema.js';
export const mercuryTools = [
    {
        name: 'mercury_balance',
        description: 'Get Mercury bank account balance, burn rate, and runway months. ' +
            'Useful for quick financial health checks and investor updates.',
        inputSchema: z.object({}),
        handler: async (_input, client) => {
            const { data } = await client.get('/api/v1/integrations/mercury/balance');
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        },
    },
    {
        name: 'mercury_activity',
        description: 'Get Mercury transaction activity feed. Supports pagination and date filtering.',
        inputSchema: z.object({
            limit: coerceInt('Maximum number of transactions to return').optional().default(25),
            offset: coerceInt('Number of transactions to skip for pagination').optional().default(0),
            startDate: z
                .string()
                .optional()
                .describe('Start date filter in ISO 8601 format (YYYY-MM-DD)'),
            endDate: z
                .string()
                .optional()
                .describe('End date filter in ISO 8601 format (YYYY-MM-DD)'),
        }),
        handler: async (input, client) => {
            const { data } = await client.get('/api/v1/integrations/mercury/activity', {
                params: input,
            });
            const transactions = data.transactions ?? data;
            return {
                content: [{ type: 'text', text: JSON.stringify(transactions, null, 2) }],
            };
        },
    },
    {
        name: 'mercury_recipients',
        description: 'List Mercury payment recipients configured for your account.',
        inputSchema: z.object({}),
        handler: async (_input, client) => {
            const { data } = await client.get('/api/v1/integrations/mercury/recipients');
            const recipients = data.recipients ?? data;
            return {
                content: [{ type: 'text', text: JSON.stringify(recipients, null, 2) }],
            };
        },
    },
    {
        name: 'mercury_send_payment',
        description: 'Send a payment through Mercury. Requires a recipient ID, amount, and payment method.',
        inputSchema: z.object({
            recipientId: z.string().describe('ID of the payment recipient'),
            amount: coerceFloat('Payment amount in USD'),
            paymentMethod: z
                .enum(['ach', 'wire', 'check'])
                .optional()
                .default('ach')
                .describe('Payment method (defaults to ACH)'),
            note: z.string().optional().describe('Optional memo or note for the payment'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post('/api/v1/integrations/mercury/payments', input);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        },
    },
    {
        name: 'mercury_financial_summary',
        description: 'Get a financial metrics summary from Mercury suitable for investor updates. ' +
            'Includes revenue, expenses, burn rate, runway, and key financial ratios.',
        inputSchema: z.object({}),
        handler: async (_input, client) => {
            const { data } = await client.get('/api/v1/integrations/mercury/financial-summary');
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        },
    },
];
//# sourceMappingURL=mercury.js.map