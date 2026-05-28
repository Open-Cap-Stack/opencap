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
    // ── Document generation, upload & delete ──────────────────────────────────
    {
        name: 'generate_document',
        description: 'Generate a legal document (RSPA, stock certificate, or 83(b) election form) for a stakeholder. ' +
            'Returns the generated document ID and title.',
        inputSchema: z.object({
            templateType: z
                .enum(['rspa', 'stock_certificate', '83b_election'])
                .describe('Type of legal document template to generate'),
            stakeholderId: z.string().describe('Stakeholder ID to generate the document for'),
            companyId: z.string().describe('Company ID'),
            params: z.object({
                shares: z.number().describe('Number of shares'),
                pricePerShare: z.number().describe('Price per share in USD'),
                effectiveDate: z.string().describe('Effective date (ISO format, e.g. 2026-01-15)'),
                issuanceDate: z.string().describe('Issuance date (ISO format)'),
                certificateNumber: z.string().optional().describe('Certificate number (optional)'),
                vestingSchedule: z.string().optional().describe('Vesting schedule description (optional)'),
                vestingMonths: z.number().optional().describe('Total vesting period in months (optional)'),
                cliffMonths: z.number().optional().describe('Cliff period in months (optional)'),
            }).describe('Document generation parameters'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post('/api/v1/documents/generate', input);
            const doc = data?.data ?? data;
            const id = doc?.row_id ?? doc?._id ?? 'unknown';
            const title = doc?.title ?? doc?.name ?? input.templateType;
            return {
                content: [
                    {
                        type: 'text',
                        text: `Document generated successfully.\nID: ${id}\nTitle: ${title}\nTemplate: ${input.templateType}\n\nFull response:\n${JSON.stringify(doc, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'upload_document',
        description: 'Upload a document to the data room. Content should be base64-encoded. ' +
            'Returns the new document ID.',
        inputSchema: z.object({
            title: z.string().describe('Document title'),
            fileName: z.string().describe('File name with extension, e.g. "term_sheet.pdf"'),
            companyId: z.string().describe('Company ID'),
            category: z.string().describe('Document category, e.g. "formation", "financing", "employment"'),
            content: z.string().describe('Base64-encoded file content'),
            stakeholderId: z.string().optional().describe('Associated stakeholder ID (optional)'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post('/api/v1/documents', input);
            const doc = data?.data ?? data;
            const id = doc?.row_id ?? doc?._id ?? 'unknown';
            return {
                content: [
                    {
                        type: 'text',
                        text: `Document uploaded successfully.\nID: ${id}\nTitle: ${input.title}\nFile: ${input.fileName}\n\nFull response:\n${JSON.stringify(doc, null, 2)}`,
                    },
                ],
            };
        },
    },
    {
        name: 'delete_document',
        description: 'Delete a document from the data room. Use list_documents to find the document ID first.',
        inputSchema: z.object({
            id: z.string().describe('Document ID to delete — use the `row_id` field from list_documents'),
        }),
        handler: async (input, client) => {
            const { data } = await client.delete(`/api/v1/documents/${input.id}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Document ${input.id} deleted successfully.\n${JSON.stringify(data ?? { success: true }, null, 2)}`,
                    },
                ],
            };
        },
    },
];
//# sourceMappingURL=documents.js.map