import { z } from 'zod';
import { type ToolDefinition } from '../types.js';

export const metaTools: ToolDefinition[] = [
  {
    name: 'whoami',
    description:
      'Verify your API key is working and return your account details (email, role, companyId). ' +
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
    description:
      'Get step-by-step workflow guides for common cap table operations. ' +
      'Call this when you are unsure what tools to use or in what order.',
    inputSchema: z.object({}),
    handler: async () => {
      const workflows = {
        add_advisor_with_equity: [
          {
            step: 1,
            tool: 'create_stakeholder',
            required: ['name', 'email', 'role: advisor', 'companyId'],
          },
          {
            step: 2,
            tool: 'create_equity_plan',
            note: 'Skip if plan exists — use list_equity_plans first',
            required: ['name', 'planType: NSO', 'sharesReserved', 'companyId'],
          },
          {
            step: 3,
            tool: 'create_equity_grant',
            required: [
              'companyId',
              'employeeId: <stakeholder row_id>',
              'equityPlanId: <plan row_id>',
              'grantType: NSO',
              'numberOfShares',
              'grantDate',
            ],
          },
        ],
        record_safe_investment: [
          {
            step: 1,
            tool: 'create_stakeholder',
            note: 'Skip if investor exists — use list_stakeholders first',
            required: ['name', 'email', 'role: investor', 'companyId'],
          },
          {
            step: 2,
            tool: 'create_safe',
            required: [
              'investmentAmount',
              'safeType',
              'investorId: <stakeholder row_id>',
              'companyId',
              'investmentDate',
            ],
          },
        ],
        set_up_share_classes: [
          {
            step: 1,
            tool: 'create_share_class',
            note: 'Common stock first',
            required: ['name: Common', 'classType: common', 'authorizedShares', 'companyId'],
          },
          {
            step: 2,
            tool: 'create_share_class',
            note: 'Preferred if needed',
            required: [
              'name: Series A Preferred',
              'classType: preferred',
              'authorizedShares',
              'companyId',
            ],
          },
        ],
        record_409a_valuation: [
          {
            step: 1,
            tool: 'create_valuation_request',
            required: ['companyId', 'valuationType: 409A', 'valuationDate', 'commonStockFMV'],
          },
          {
            step: 2,
            tool: 'create_financial_report',
            note: 'Optional',
            required: ['companyId', 'reportType: 409A_report'],
          },
        ],
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(workflows, null, 2) }],
      };
    },
  },
  {
    name: 'cap_table_summary',
    description:
      'Get a quick overview of the current cap table state — stakeholder count, share classes, ' +
      'open SAFEs, active grants. Use this to understand what is already set up before starting workflows.',
    inputSchema: z.object({
      companyId: z.string().describe('Company ID'),
    }),
    handler: async (input, client) => {
      const params = { companyId: input.companyId, limit: 100 };
      const [stakeholdersRes, shareClassesRes, safesRes, equityPlansRes, grantsRes] =
        await Promise.allSettled([
          client.get('/api/v1/stakeholders', { params }),
          client.get('/api/v1/share-classes', { params }),
          client.get('/api/v1/safes', { params }),
          client.get('/api/v1/equity-plans', { params }),
          client.get('/api/v1/equity-grants', { params }),
        ]);

      const extract = (res: PromiseSettledResult<{ data: unknown }>, keys: string[]): unknown[] => {
        if (res.status === 'rejected') return [];
        const d = res.value.data as Record<string, unknown>;
        for (const k of keys) {
          if (Array.isArray(d[k])) return d[k] as unknown[];
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
        openSafes: (safes as { status?: string }[]).filter(
          (s) => s.status === 'open' || s.status === 'draft'
        ).length,
        equityPlans: equityPlans.length,
        activeGrants: (grants as { status?: string }[]).filter((g) => g.status === 'active').length,
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
