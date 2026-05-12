import { z } from 'zod';
import { coerceInt } from '../schema.js';
import { type ToolDefinition } from '../types.js';

export const stakeholderTools: ToolDefinition[] = [
  {
    name: 'list_stakeholders',
    description:
      'List all stakeholders in the cap table. Returns name, email, role, and ownership details.',
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
        .enum(['founder', 'investor', 'employee', 'advisor', 'other'])
        .describe('Stakeholder role'),
      companyId: z.string().describe('Company ID to add the stakeholder to'),
    }),
    handler: async (input, client) => {
      const { data: created } = await client.post('/api/v1/stakeholders', input);
      const id = created.row_id ?? created._id;
      try {
        const { data: confirmed } = await client.get(`/api/v1/stakeholders/${id}`);
        return {
          content: [
            {
              type: 'text',
              text: `Stakeholder created:\n${JSON.stringify(confirmed, null, 2)}\n\nID for follow-up operations: ${id}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `Stakeholder created (could not confirm persisted state — verify with get_stakeholder):\n${JSON.stringify(created, null, 2)}`,
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
        .enum(['founder', 'investor', 'employee', 'advisor', 'other'])
        .optional()
        .describe('Stakeholder role'),
    }),
    handler: async (input, client) => {
      const { id, ...body } = input;
      const { data: updated } = await client.put(`/api/v1/stakeholders/${id}`, body);
      try {
        const { data: confirmed } = await client.get(`/api/v1/stakeholders/${id}`);
        return {
          content: [
            {
              type: 'text',
              text: `Stakeholder updated:\n${JSON.stringify(confirmed, null, 2)}\n\nID for follow-up operations: ${id}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `Stakeholder updated (could not confirm persisted state — verify with get_stakeholder):\n${JSON.stringify(updated, null, 2)}`,
            },
          ],
        };
      }
    },
  },
];
