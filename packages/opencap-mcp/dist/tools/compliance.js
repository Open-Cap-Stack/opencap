import { z } from 'zod';
export const complianceTools = [
    {
        name: 'get_83b_status',
        description: 'Check 83(b) election filing status for all equity grants. ' +
            'Shows deadlines, days remaining, and urgency level for each grant.',
        inputSchema: z.object({
            companyId: z.string().describe('Company ID to check 83(b) status for'),
        }),
        handler: async (input, client) => {
            const { data } = await client.get('/api/v1/compliance/83b-status', {
                params: { companyId: input.companyId },
            });
            const grants = data?.data ?? data?.grants ?? data;
            if (Array.isArray(grants) && grants.length > 0) {
                const header = 'Grant ID | Stakeholder | Status | Deadline | Days Left | Urgency';
                const separator = '--- | --- | --- | --- | --- | ---';
                const rows = grants.map((g) => {
                    const id = g.grantId ?? g.row_id ?? g._id ?? 'N/A';
                    const name = g.stakeholderName ?? g.name ?? 'N/A';
                    const status = g.filingStatus ?? g.status ?? 'unknown';
                    const deadline = g.deadline ?? g.filingDeadline ?? 'N/A';
                    const daysLeft = g.daysRemaining ?? g.daysLeft ?? 'N/A';
                    const urgency = g.urgency ?? g.urgencyLevel ?? 'N/A';
                    return `${id} | ${name} | ${status} | ${deadline} | ${daysLeft} | ${urgency}`;
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: `83(b) Election Status for company ${input.companyId}:\n\n${header}\n${separator}\n${rows.join('\n')}\n\nRaw data:\n${JSON.stringify(grants, null, 2)}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `83(b) Election Status for company ${input.companyId}:\n\n${JSON.stringify(grants, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'send_83b_reminder',
        description: 'Send an 83(b) deadline reminder email to a stakeholder. ' +
            'Optionally target a specific grant.',
        inputSchema: z.object({
            stakeholderId: z.string().describe('Stakeholder ID to send the reminder to'),
            grantId: z.string().optional().describe('Specific equity grant ID (optional — sends for all grants if omitted)'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post('/api/v1/compliance/83b-remind', input);
            const result = data?.data ?? data;
            return {
                content: [
                    {
                        type: 'text',
                        text: `83(b) reminder sent successfully to stakeholder ${input.stakeholderId}.\n${JSON.stringify(result, null, 2)}`,
                    },
                ],
            };
        },
    },
];
//# sourceMappingURL=compliance.js.map