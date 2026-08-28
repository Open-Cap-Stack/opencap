import { z } from 'zod';
import { coerceInt, coerceFloat } from '../schema.js';
export const vestingScheduleTools = [
    {
        name: 'list_vesting_schedules',
        description: 'List all vesting schedules. Returns schedule IDs, stakeholder links, and vesting parameters.',
        inputSchema: z.object({
            companyId: z.string().optional().describe('Filter by company ID'),
            limit: coerceInt('Max results to return').optional().default(50),
        }),
        handler: async (input, client) => {
            const { data } = await client.get('/api/v1/vesting-schedules', { params: input });
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'get_vesting_schedule_details',
        description: 'Get full details for a specific vesting schedule by ID, including all vesting events.',
        inputSchema: z.object({
            id: z.string().describe('Vesting schedule ID'),
        }),
        handler: async (input, client) => {
            const { data } = await client.get(`/api/v1/vesting-schedules/${input.id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'create_vesting_schedule',
        description: 'Create a new vesting schedule for a stakeholder.',
        inputSchema: z.object({
            stakeholderId: z.string().describe('Stakeholder ID this schedule belongs to'),
            companyId: z.string().describe('Company ID'),
            totalShares: coerceInt('Total number of shares in this schedule'),
            vestingPeriodMonths: coerceInt('Total vesting period in months (e.g. 48)'),
            cliffMonths: coerceInt('Cliff period in months (e.g. 12)'),
            vestingFrequency: z.enum(['monthly', 'quarterly', 'annually']).describe('How often shares vest after the cliff'),
            startDate: z.string().describe('Vesting start date (YYYY-MM-DD)'),
            accelerationClause: z.string().optional().describe('Acceleration terms (e.g. single-trigger, double-trigger)'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post('/api/v1/vesting-schedules', input);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'update_vesting_schedule',
        description: 'Update an existing vesting schedule.',
        inputSchema: z.object({
            id: z.string().describe('Vesting schedule ID'),
            totalShares: coerceInt('Total number of shares').optional(),
            vestingPeriodMonths: coerceInt('Total vesting period in months').optional(),
            cliffMonths: coerceInt('Cliff period in months').optional(),
            vestingFrequency: z.enum(['monthly', 'quarterly', 'annually']).optional(),
            startDate: z.string().optional().describe('Vesting start date (YYYY-MM-DD)'),
            accelerationClause: z.string().optional().describe('Acceleration terms'),
        }),
        handler: async (input, client) => {
            const { id, ...body } = input;
            await client.put(`/api/v1/vesting-schedules/${id}`, body);
            const { data } = await client.get(`/api/v1/vesting-schedules/${id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'calculate_vesting',
        description: 'Calculate current vesting status for a schedule — how many shares have vested, ' +
            'next vesting date, and cliff status.',
        inputSchema: z.object({
            id: z.string().describe('Vesting schedule ID'),
        }),
        handler: async (input, client) => {
            const { data } = await client.get(`/api/v1/vesting-schedules/${input.id}/calculate`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'get_vesting_timeline',
        description: 'Get the full vesting timeline with all future vesting events.',
        inputSchema: z.object({
            id: z.string().describe('Vesting schedule ID'),
        }),
        handler: async (input, client) => {
            const { data } = await client.get(`/api/v1/vesting-schedules/${input.id}/timeline`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'accelerate_vesting',
        description: 'Apply acceleration to a vesting schedule (e.g. single-trigger on acquisition). ' +
            'This immediately vests a percentage of unvested shares.',
        inputSchema: z.object({
            id: z.string().describe('Vesting schedule ID'),
            percentage: coerceFloat('Percentage of unvested shares to accelerate (e.g. 100 for full acceleration)'),
            reason: z.string().describe('Reason for acceleration (e.g. "acquisition", "termination without cause")'),
            effectiveDate: z.string().optional().describe('Effective date (YYYY-MM-DD). Defaults to today.'),
        }),
        handler: async (input, client) => {
            const { id, ...body } = input;
            const { data } = await client.post(`/api/v1/vesting-schedules/${id}/accelerate`, body);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'pause_vesting',
        description: 'Pause a vesting schedule (e.g. during a leave of absence).',
        inputSchema: z.object({
            id: z.string().describe('Vesting schedule ID'),
            reason: z.string().optional().describe('Reason for pausing'),
        }),
        handler: async (input, client) => {
            const { id, ...body } = input;
            const { data } = await client.post(`/api/v1/vesting-schedules/${id}/pause`, body);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'resume_vesting',
        description: 'Resume a previously paused vesting schedule.',
        inputSchema: z.object({
            id: z.string().describe('Vesting schedule ID'),
        }),
        handler: async (input, client) => {
            const { data } = await client.post(`/api/v1/vesting-schedules/${input.id}/resume`, {});
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
    {
        name: 'terminate_vesting',
        description: 'Terminate a vesting schedule (e.g. when a stakeholder leaves the company).',
        inputSchema: z.object({
            id: z.string().describe('Vesting schedule ID'),
            reason: z.string().optional().describe('Reason for termination'),
        }),
        handler: async (input, client) => {
            const { id, ...body } = input;
            const { data } = await client.post(`/api/v1/vesting-schedules/${id}/terminate`, body);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        },
    },
];
//# sourceMappingURL=vestingSchedules.js.map