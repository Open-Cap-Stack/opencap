import { z } from 'zod';
import { type ToolDefinition } from '../types.js';

export const stakeholderTools: ToolDefinition[] = [
  {
    name: 'list_stakeholders',
    description:
      'List all stakeholders in the cap table. Returns name, email, role, and ownership details.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      limit: z.number().optional().default(50).describe('Max results to return'),
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
    description: 'Get details for a specific stakeholder by ID.',
    inputSchema: z.object({
      id: z.string().describe('Stakeholder ID'),
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
      const { data } = await client.post('/api/v1/stakeholders', input);
      return {
        content: [
          { type: 'text', text: `Stakeholder created: ${JSON.stringify(data, null, 2)}` },
        ],
      };
    },
  },
  {
    name: 'update_stakeholder',
    description: 'Update an existing stakeholder by ID.',
    inputSchema: z.object({
      id: z.string().describe('Stakeholder ID'),
      name: z.string().optional().describe('Full name'),
      email: z.string().email().optional().describe('Email address'),
      role: z
        .enum(['founder', 'investor', 'employee', 'advisor', 'other'])
        .optional()
        .describe('Stakeholder role'),
    }),
    handler: async (input, client) => {
      const { id, ...body } = input;
      const { data } = await client.put(`/api/v1/stakeholders/${id}`, body);
      return {
        content: [
          { type: 'text', text: `Stakeholder updated: ${JSON.stringify(data, null, 2)}` },
        ],
      };
    },
  },
];
