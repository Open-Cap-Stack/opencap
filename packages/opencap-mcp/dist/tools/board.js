import { z } from 'zod';
export const boardTools = [
    {
        name: 'list_board_meetings',
        description: 'List all board meetings. Returns meeting details including date, type, agenda, and status.',
        inputSchema: z.object({}),
        handler: async (_input, client) => {
            const { data } = await client.get('/api/v1/board-meetings');
            const meetings = data.meetings ?? data;
            return {
                content: [{ type: 'text', text: JSON.stringify(meetings, null, 2) }],
            };
        },
    },
    {
        name: 'create_board_meeting',
        description: 'Create a new board meeting with title, date, type, location, agenda, and status.',
        inputSchema: z.object({
            title: z.string().describe('Title of the board meeting'),
            date: z.string().describe('Meeting date in ISO 8601 format (YYYY-MM-DDTHH:mm:ss)'),
            type: z
                .enum(['regular', 'special', 'annual', 'emergency'])
                .optional()
                .default('regular')
                .describe('Type of board meeting'),
            location: z.string().optional().describe('Meeting location or video call link'),
            agenda: z.string().optional().describe('Meeting agenda text'),
            status: z
                .enum(['scheduled', 'in_progress', 'completed', 'cancelled'])
                .optional()
                .default('scheduled')
                .describe('Meeting status'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post('/api/v1/board-meetings', input);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        },
    },
    {
        name: 'list_board_members',
        description: 'List all board members with their roles and contact information.',
        inputSchema: z.object({}),
        handler: async (_input, client) => {
            const { data } = await client.get('/api/v1/board-members');
            const members = data.members ?? data;
            return {
                content: [{ type: 'text', text: JSON.stringify(members, null, 2) }],
            };
        },
    },
    {
        name: 'create_board_member',
        description: 'Add a new board member with name, email, role, and board-specific role.',
        inputSchema: z.object({
            firstName: z.string().describe('First name of the board member'),
            lastName: z.string().describe('Last name of the board member'),
            email: z.string().describe('Email address of the board member'),
            role: z.string().optional().describe('Company role (e.g. "CEO", "CTO", "Investor")'),
            boardRole: z
                .enum(['chair', 'member', 'observer', 'secretary'])
                .optional()
                .default('member')
                .describe('Role on the board'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post('/api/v1/board-members', input);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        },
    },
    {
        name: 'list_board_resolutions',
        description: 'List all board resolutions with their status, type, and voting results.',
        inputSchema: z.object({}),
        handler: async (_input, client) => {
            const { data } = await client.get('/api/v1/board-resolutions');
            const resolutions = data.resolutions ?? data;
            return {
                content: [{ type: 'text', text: JSON.stringify(resolutions, null, 2) }],
            };
        },
    },
    {
        name: 'create_board_resolution',
        description: 'Create a new board resolution for voting or record-keeping.',
        inputSchema: z.object({
            title: z.string().describe('Title of the resolution'),
            description: z.string().describe('Full text or description of the resolution'),
            type: z
                .enum(['ordinary', 'special', 'written_consent', 'unanimous'])
                .optional()
                .default('ordinary')
                .describe('Type of resolution'),
            status: z
                .enum(['draft', 'proposed', 'approved', 'rejected', 'tabled'])
                .optional()
                .default('draft')
                .describe('Current status of the resolution'),
            category: z
                .string()
                .optional()
                .describe('Category (e.g. "equity", "compensation", "governance", "finance")'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post('/api/v1/board-resolutions', input);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        },
    },
];
//# sourceMappingURL=board.js.map