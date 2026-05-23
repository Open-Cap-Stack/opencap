import { z } from 'zod';
export const metaTools = [
    {
        name: 'whoami',
        description: 'Verify your API key is working and return your account details (email, role, companyId). ' +
            'Run this first to confirm your MCP setup is correct.',
        inputSchema: z.object({}),
        handler: async (_input, client) => {
            const { data } = await client.get('/api/v1/auth/me');
            return {
                content: [
                    {
                        type: 'text',
                        text: `Authenticated as:\n${JSON.stringify(data, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'list_workflows',
        description: 'Returns step-by-step workflow recipes for common cap table operations. ' +
            'Call this first when starting a new task.',
        inputSchema: z.object({}),
        handler: async () => {
            const workflows = {
                add_advisor_with_equity: {
                    description: 'Add an advisor and issue them an equity grant',
                    steps: [
                        {
                            step: 1,
                            tool: 'create_stakeholder',
                            notes: 'role: advisor. Save the returned row_id.',
                        },
                        {
                            step: 2,
                            tool: 'list_equity_plans',
                            notes: 'Find an existing equity plan, or use create_equity_plan. Save the row_id.',
                        },
                        {
                            step: 3,
                            tool: 'create_equity_grant',
                            notes: 'Use employeeId from step 1, equityPlanId from step 2.',
                        },
                    ],
                },
                record_safe_round: {
                    description: 'Record a SAFE investment from an investor',
                    steps: [
                        {
                            step: 1,
                            tool: 'create_stakeholder',
                            notes: 'role: investor. Save the returned row_id.',
                        },
                        {
                            step: 2,
                            tool: 'create_safe',
                            notes: 'Use stakeholderId from step 1.',
                        },
                    ],
                },
                request_409a_valuation: {
                    description: 'Request a 409A valuation',
                    steps: [
                        {
                            step: 1,
                            tool: 'create_valuation_request',
                            notes: 'Provide companyId and reason.',
                        },
                        {
                            step: 2,
                            tool: 'get_latest_valuation',
                            notes: 'Check status after AI processing completes.',
                        },
                    ],
                },
                set_up_share_classes: {
                    description: 'Define share classes for the company (common, preferred, etc.)',
                    steps: [
                        {
                            step: 1,
                            tool: 'create_share_class',
                            notes: 'Common stock first. classType: common, provide authorizedShares.',
                        },
                        {
                            step: 2,
                            tool: 'create_share_class',
                            notes: 'Preferred if needed. classType: preferred, provide authorizedShares.',
                        },
                    ],
                },
            };
            return {
                content: [{ type: 'text', text: JSON.stringify(workflows, null, 2) }],
            };
        },
    },
    {
        name: 'cap_table_summary',
        description: 'Get a quick overview of the current cap table state — stakeholder count, share classes, ' +
            'open SAFEs, active grants. Use this to understand what is already set up before starting workflows.',
        inputSchema: z.object({
            companyId: z.string().describe('Company ID'),
        }),
        handler: async (input, client) => {
            const params = { companyId: input.companyId, limit: 100 };
            const [stakeholdersRes, shareClassesRes, safesRes, equityPlansRes, grantsRes] = await Promise.allSettled([
                client.get('/api/v1/stakeholders', { params }),
                client.get('/api/v1/share-classes', { params }),
                client.get('/api/v1/safes', { params }),
                client.get('/api/v1/equity-plans', { params }),
                client.get('/api/v1/equity-grants', { params }),
            ]);
            const extract = (res, keys) => {
                if (res.status === 'rejected')
                    return [];
                const d = res.value.data;
                for (const k of keys) {
                    if (Array.isArray(d[k]))
                        return d[k];
                }
                return Array.isArray(d) ? d : [];
            };
            const stakeholders = extract(stakeholdersRes, ['stakeholders']);
            const shareClasses = extract(shareClassesRes, ['shareClasses']);
            const safes = extract(safesRes, ['safes']);
            const equityPlans = extract(equityPlansRes, ['equityPlans']);
            const grants = extract(grantsRes, ['grants']);
            const summary = {
                companyId: input.companyId,
                stakeholders: stakeholders.length,
                shareClasses: shareClasses.length,
                openSafes: safes.filter((s) => s.status === 'open' || s.status === 'draft').length,
                equityPlans: equityPlans.length,
                activeGrants: grants.filter((g) => g.status === 'active').length,
                unavailable: [
                    stakeholdersRes.status === 'rejected' ? 'stakeholders' : null,
                    shareClassesRes.status === 'rejected' ? 'share-classes' : null,
                    safesRes.status === 'rejected' ? 'safes' : null,
                    equityPlansRes.status === 'rejected' ? 'equity-plans' : null,
                    grantsRes.status === 'rejected' ? 'equity-grants' : null,
                ].filter(Boolean),
            };
            return {
                content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
            };
        },
    },
];
//# sourceMappingURL=meta.js.map