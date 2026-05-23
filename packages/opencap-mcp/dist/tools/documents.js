import { z } from 'zod';
import { coerceInt } from '../schema.js';
/** Strip raw file content from document objects — only metadata should be returned in list/search */
function stripFileContent(doc) {
    const { fileContentBase64, fileContent, content, ...rest } = doc;
    void fileContentBase64;
    void fileContent;
    void content;
    return rest;
}
function stripDocList(docs) {
    if (Array.isArray(docs))
        return docs.map((d) => (d && typeof d === 'object' ? stripFileContent(d) : d));
    return docs;
}
export const documentTools = [
    {
        name: 'list_documents',
        description: 'List documents stored in OpenCap (shareholder agreements, option grants, board consents, formation docs, etc.). ' +
            'Returns metadata only — no file content. Use get_document to retrieve file content for a specific doc. ' +
            'The ID field to use in follow-up calls is `row_id`.',
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
            const documents = stripDocList(data?.data?.documents ?? data.documents ?? data);
            return {
                content: [{ type: 'text', text: JSON.stringify(documents, null, 2) }],
            };
        },
    },
    {
        name: 'get_document',
        description: 'Get metadata and details for a specific document by ID. ' +
            'Use the `row_id` field from `list_documents`, not the `_id` field.',
        inputSchema: z.object({
            id: z.string().describe('Document ID — use the `row_id` field from list_documents, not `_id`'),
        }),
        handler: async (input, client) => {
            const { data } = await client.get(`/api/v1/documents/${input.id}`);
            const doc = data?.data ?? data;
            return { content: [{ type: 'text', text: JSON.stringify(stripFileContent(doc), null, 2) }] };
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
            const { data } = await client.post('/api/v1/documents/search', input);
            const results = stripDocList(data?.results ?? data?.data ?? data);
            return {
                content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
            };
        },
    },
    // ── Data Room tools ────────────────────────────────────────────────────────
    {
        name: 'list_data_rooms',
        description: 'List all data rooms for the authenticated company. Data rooms are secure document vaults shared with investors or for internal organisation.',
        inputSchema: z.object({}),
        handler: async (_input, client) => {
            const { data } = await client.get('/api/v1/data-rooms');
            const rooms = Array.isArray(data) ? data : (data?.dataRooms ?? data?.data ?? []);
            return { content: [{ type: 'text', text: JSON.stringify(rooms, null, 2) }] };
        },
    },
    {
        name: 'create_data_room',
        description: 'Create a new data room to organise and share documents securely.',
        inputSchema: z.object({
            name: z.string().describe('Data room name, e.g. "Formation Documents" or "Series A Due Diligence"'),
            description: z.string().optional().describe('Optional description'),
            expiryDate: z.string().optional().describe('Optional ISO date after which the data room expires'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post('/api/v1/data-rooms', input);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'get_data_room',
        description: 'Get details of a specific data room including its document list.',
        inputSchema: z.object({
            id: z.string().describe('Data room ID from list_data_rooms'),
        }),
        handler: async (input, client) => {
            const { data } = await client.get(`/api/v1/data-rooms/${input.id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'add_document_to_data_room',
        description: 'Add an existing document to a data room. Use list_documents to get document IDs and list_data_rooms to get data room IDs.',
        inputSchema: z.object({
            dataRoomId: z.string().describe('Data room ID'),
            documentId: z.string().describe('Document ID to add (use row_id from list_documents)'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post(`/api/v1/data-rooms/${input.dataRoomId}/documents`, {
                documentId: input.documentId,
            });
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
];
//# sourceMappingURL=documents.js.map