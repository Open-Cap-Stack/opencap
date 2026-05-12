import { z } from 'zod';
import { coerceInt } from '../schema.js';
import { type ToolDefinition } from '../types.js';

export const documentTools: ToolDefinition[] = [
  {
    name: 'list_documents',
    description:
      'List documents stored in OpenCap (shareholder agreements, option grants, board consents, etc.).',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      documentType: z
        .enum([
          'shareholder_agreement',
          'option_grant',
          'board_consent',
          'safe',
          'certificate',
          'other',
        ])
        .optional()
        .describe('Filter by document type'),
      stakeholderId: z
        .string()
        .optional()
        .describe('Filter documents associated with a stakeholder'),
      limit: coerceInt('Max results to return').optional().default(50),
    }),
    handler: async (input, client) => {
      const { data } = await client.get('/api/v1/documents', { params: input });
      const documents = data.documents ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(documents, null, 2) }],
      };
    },
  },
  {
    name: 'get_document',
    description: 'Get metadata and details for a specific document by ID.',
    inputSchema: z.object({
      id: z.string().describe('Document ID'),
    }),
    handler: async (input, client) => {
      const { data } = await client.get(`/api/v1/documents/${input.id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    },
  },
  {
    name: 'search_documents',
    description: 'Search documents by keyword or metadata across all company documents.',
    inputSchema: z.object({
      query: z.string().describe('Search query string'),
      companyId: z.string().optional().describe('Limit search to a specific company'),
      documentType: z
        .enum([
          'shareholder_agreement',
          'option_grant',
          'board_consent',
          'safe',
          'certificate',
          'other',
        ])
        .optional()
        .describe('Filter by document type'),
      limit: coerceInt('Max results to return').optional().default(20),
    }),
    handler: async (input, client) => {
      const { data } = await client.get('/api/v1/documents/search', { params: input });
      const results = data.results ?? data;
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    },
  },
];
