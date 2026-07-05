import { z } from 'zod';
import { coerceInt } from '../schema.js';
import { type ToolDefinition } from '../types.js';

export const stakeholderTools: ToolDefinition[] = [
  {
    name: 'list_stakeholders',
    description:
      'List all stakeholders in the cap table. Returns name, email, role, and ownership details. ' +
      'The ID field to use in follow-up get/update calls is `row_id`.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      limit: coerceInt('Max results to return').optional().default(50),
    }),
    handler: async (input, client) => {
      const { data } = await client.get('/api/v1/stakeholders', { params: input });
      const stakeholders = data.stakeholders ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(stakeholders, null, 2) }],
      };
    },
  },
  {
    name: 'get_stakeholder',
    description:
      'Get details for a specific stakeholder by ID. Use the `row_id` field from `list_stakeholders`.',
    inputSchema: z.object({
      id: z.string().describe('Stakeholder ID — use the `row_id` field from list_stakeholders'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get(`/api/v1/stakeholders/${input.id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  },
  {
    name: 'create_stakeholder',
    description: 'Add a new stakeholder to the cap table.',
    inputSchema: z.object({
      name: z.string().describe('Full name'),
      email: z.string().email().describe('Email address'),
      role: z
        .enum(['founder', 'co_founder', 'employee', 'advisor', 'consultant', 'investor', 'board_member', 'service_provider', 'engineer', 'manager', 'venture_capitalist'])
        .describe('Stakeholder role'),
      companyId: z.string().describe('Company ID to add the stakeholder to'),
      title: z.string().optional().describe("Job title or role title, e.g. 'Director of Developer Relations', 'Lead Advisor'"),
    }),
    handler: async (input, client) => {
      const { data: created } = await client.post('/api/v1/stakeholders', input);
      const id = created?.data?.row_id ?? created?.row_id ?? created?._id;
      try {
        const { data: confirmed } = await client.get(`/api/v1/stakeholders/${id}`);
        const record = confirmed?.data ?? confirmed;
        return {
          content: [
            {
              type: 'text',
              text: `Stakeholder created and confirmed:\nrow_id: ${record.row_id ?? id}\nname: ${record.name ?? input.name}\nrole: ${record.role ?? input.role}\ncompanyId: ${record.companyId ?? input.companyId}\n\nFull record:\n${JSON.stringify(record, null, 2)}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `Stakeholder created (note: could not confirm persisted state — verify with get_stakeholder):\n${JSON.stringify(created?.data ?? created, null, 2)}`,
            },
          ],
        };
      }
    },
  },
  {
    name: 'update_stakeholder',
    description:
      'Update an existing stakeholder by ID. Use the `row_id` field from `list_stakeholders`.',
    inputSchema: z.object({
      id: z.string().describe('Stakeholder ID — use the `row_id` field from list_stakeholders'),
      name: z.string().optional().describe('Full name'),
      email: z.string().email().optional().describe('Email address'),
      role: z
        .enum(['founder', 'co_founder', 'employee', 'advisor', 'consultant', 'investor', 'board_member', 'service_provider', 'engineer', 'manager', 'venture_capitalist'])
        .optional()
        .describe('Stakeholder role'),
      title: z.string().optional().describe("Job title or role title, e.g. 'Director of Developer Relations', 'Lead Advisor'"),
    }),
    handler: async (input, client) => {
      const { id, ...body } = input;
      await client.put(`/api/v1/stakeholders/${id}`, body);
      try {
        const { data: confirmed } = await client.get(`/api/v1/stakeholders/${id}`);
        const record = confirmed?.data ?? confirmed;
        return {
          content: [
            {
              type: 'text',
              text: `Stakeholder updated and confirmed:\nrow_id: ${record.row_id ?? id}\nname: ${record.name ?? 'unknown'}\nrole: ${record.role ?? 'unknown'}\ncompanyId: ${record.companyId ?? 'unknown'}\n\nFull record:\n${JSON.stringify(record, null, 2)}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `Stakeholder updated (note: could not confirm persisted state — verify with get_stakeholder):\nID: ${id}`,
            },
          ],
        };
      }
    },
  },
];
