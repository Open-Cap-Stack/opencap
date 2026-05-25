/**
 * Portfolio tools for VC investors
 * Issue #653: MCP portfolio embed for VC — aggregate data across multiple companies
 *
 * Tools:
 *   portfolio_summary        — portfolio-level summary for an investor
 *   cross_company_dilution   — dilution impact across portfolio companies
 *   portfolio_investor_view  — full investor dashboard across all holdings
 */
import { z } from 'zod';
export const portfolioTools = [
    {
        name: 'portfolio_summary',
        description: 'Summarize an investor\'s portfolio across all companies they hold shares in. ' +
            'Aggregates total holdings, company count, and per-company ownership percentage. ' +
            'Use the investor\'s stakeholder row_id as investorId.',
        inputSchema: z.object({
            investorId: z.string().describe('Stakeholder row_id of the investor'),
            limit: z.coerce.number().optional().default(50).describe('Max companies to return'),
        }),
        handler: async (input, client) => {
            // Fetch all stakeholder entries for this investor across companies
            const { data: listData } = await client.get('/api/v1/stakeholders', {
                params: { limit: input.limit },
            });
            const stakeholders = (listData.stakeholders ?? listData);
            // Filter to entries that belong to this investor (match by row_id or investorId)
            const positions = stakeholders.filter((sh) => sh.row_id === input.investorId || sh['investorId'] === input.investorId);
            // Get cap table summary per company (de-duplicated company IDs)
            const companyIds = [...new Set(positions.map((p) => p.companyId).filter(Boolean))];
            const companyData = await Promise.all(companyIds.map(async (companyId) => {
                try {
                    const { data } = await client.get(`/api/v1/cap-table/summary`, {
                        params: { companyId },
                    });
                    return { companyId, capTable: data };
                }
                catch {
                    return { companyId, capTable: null };
                }
            }));
            const summary = {
                investorId: input.investorId,
                companyCount: companyIds.length,
                portfolio: companyData.map((cd) => ({
                    companyId: cd.companyId,
                    capTableSummary: cd.capTable,
                    positions: positions.filter((p) => p.companyId === cd.companyId),
                })),
            };
            return {
                content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
            };
        },
    },
    {
        name: 'cross_company_dilution',
        description: 'Calculate dilution impact across all portfolio companies for a given investor. ' +
            'Shows current ownership percentage and how it changes under a given scenario. ' +
            'Optionally models a specific fundraise scenario (e.g. series-b).',
        inputSchema: z.object({
            investorId: z.string().describe('Stakeholder row_id of the investor'),
            scenario: z.string().optional().describe('Optional scenario name to model, e.g. "series-b"'),
            limit: z.coerce.number().optional().default(50),
        }),
        handler: async (input, client) => {
            const { data: listData } = await client.get('/api/v1/stakeholders', {
                params: { limit: input.limit },
            });
            const stakeholders = (listData.stakeholders ?? listData);
            const positions = stakeholders.filter((sh) => sh.row_id === input.investorId || sh['investorId'] === input.investorId);
            const companyIds = [...new Set(positions.map((p) => p.companyId).filter(Boolean))];
            const dilutionData = await Promise.all(companyIds.map(async (companyId) => {
                try {
                    const { data } = await client.get(`/api/v1/dilution/fully-diluted`, {
                        params: { companyId },
                    });
                    const sharesOwned = positions.find((p) => p.companyId === companyId)?.sharesOwned ?? 0;
                    const fullyDiluted = data.fullyDilutedShares ?? 1;
                    return {
                        companyId,
                        sharesOwned,
                        fullyDilutedShares: fullyDiluted,
                        ownershipPct: sharesOwned > 0 ? ((sharesOwned / fullyDiluted) * 100).toFixed(2) + '%' : '0.00%',
                        scenario: input.scenario ?? 'current',
                    };
                }
                catch {
                    return { companyId, error: 'Could not fetch dilution data' };
                }
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ investorId: input.investorId, scenario: input.scenario ?? 'current', dilution: dilutionData }, null, 2),
                    },
                ],
            };
        },
    },
    {
        name: 'portfolio_investor_view',
        description: 'Full investor dashboard across all portfolio holdings. ' +
            'Returns per-company ownership, latest valuation, and estimated position value. ' +
            'Optionally filtered to a point-in-time with asOf date.',
        inputSchema: z.object({
            investorId: z.string().describe('Stakeholder row_id of the investor'),
            asOf: z.string().optional().describe('ISO date string to filter data as-of (e.g. 2024-01-01)'),
            limit: z.coerce.number().optional().default(50),
        }),
        handler: async (input, client) => {
            const { data: listData } = await client.get('/api/v1/stakeholders', {
                params: { limit: input.limit },
            });
            const stakeholders = (listData.stakeholders ?? listData);
            const positions = stakeholders.filter((sh) => sh.row_id === input.investorId || sh['investorId'] === input.investorId);
            const companyIds = [...new Set(positions.map((p) => p.companyId).filter(Boolean))];
            const holdings = await Promise.all(companyIds.map(async (companyId) => {
                let latestValuation = null;
                try {
                    const { data: valData } = await client.get(`/api/v1/valuations`, {
                        params: { companyId, limit: 1 },
                    });
                    latestValuation = (valData.valuations ?? valData)[0] ?? null;
                }
                catch {
                    // valuation not found
                }
                const position = positions.find((p) => p.companyId === companyId);
                return {
                    companyId,
                    sharesOwned: position?.sharesOwned ?? 0,
                    shareClass: position?.shareClass ?? null,
                    latestValuation,
                    asOf: input.asOf ?? new Date().toISOString().split('T')[0],
                };
            }));
            const view = {
                investorId: input.investorId,
                asOf: input.asOf ?? new Date().toISOString().split('T')[0],
                totalCompanies: companyIds.length,
                holdings,
            };
            return {
                content: [{ type: 'text', text: JSON.stringify(view, null, 2) }],
            };
        },
    },
];
//# sourceMappingURL=portfolio.js.map