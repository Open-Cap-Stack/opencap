import { z } from 'zod';
export const exportTools = [
    {
        name: 'export_cap_table',
        description: 'Export the full cap table as CSV or JSON data. Combines cap table summary, stakeholders, ' +
            'and share classes into a single export. Useful for reporting and analysis.',
        inputSchema: z.object({
            companyId: z.string().describe('Company ID to export the cap table for'),
            format: z
                .enum(['csv', 'json'])
                .optional()
                .default('json')
                .describe('Export format — csv or json (default: json)'),
        }),
        handler: async (input, client) => {
            // Fetch all three data sources in parallel
            const [summaryRes, stakeholdersRes, shareClassesRes] = await Promise.all([
                client.get('/api/v1/exports/cap-table', { params: { companyId: input.companyId } }),
                client.get('/api/v1/stakeholders', { params: { companyId: input.companyId } }),
                client.get('/api/v1/share-classes', { params: { companyId: input.companyId } }),
            ]);
            const summary = summaryRes.data?.data ?? summaryRes.data;
            const stakeholders = stakeholdersRes.data?.stakeholders ?? stakeholdersRes.data?.data ?? stakeholdersRes.data ?? [];
            const shareClasses = shareClassesRes.data?.shareClasses ?? shareClassesRes.data?.data ?? shareClassesRes.data ?? [];
            const capTable = {
                companyId: input.companyId,
                exportedAt: new Date().toISOString(),
                summary,
                stakeholders: Array.isArray(stakeholders) ? stakeholders : [],
                shareClasses: Array.isArray(shareClasses) ? shareClasses : [],
            };
            if (input.format === 'csv') {
                const stk = capTable.stakeholders;
                if (stk.length === 0) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'No stakeholders found for this company. Nothing to export as CSV.',
                            },
                        ],
                    };
                }
                // Build CSV from stakeholder data
                const headers = [
                    'row_id', 'name', 'email', 'role', 'shares', 'ownershipPercentage',
                    'shareClass', 'vestingStatus',
                ];
                const csvHeader = headers.join(',');
                const csvRows = stk.map((s) => headers
                    .map((h) => {
                    const val = s[h];
                    if (val === undefined || val === null)
                        return '';
                    const str = String(val);
                    // Escape commas and quotes in CSV values
                    return str.includes(',') || str.includes('"')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                })
                    .join(','));
                const csv = [csvHeader, ...csvRows].join('\n');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Cap table exported as CSV (${stk.length} stakeholders):\n\n${csv}\n\nShare classes:\n${JSON.stringify(capTable.shareClasses, null, 2)}`,
                        },
                    ],
                };
            }
            // JSON format (default)
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(capTable, null, 2),
                    },
                ],
            };
        },
    },
];
//# sourceMappingURL=export.js.map