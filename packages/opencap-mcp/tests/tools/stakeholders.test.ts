import { stakeholderTools } from '../../src/tools/stakeholders.js';
import { type AxiosInstance } from 'axios';
import { type ToolResult } from '../../src/types.js';

function makeClient(overrides: Partial<AxiosInstance> = {}): AxiosInstance {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as AxiosInstance;
}

/** Narrow the first content item to a text block and return its text. */
function firstText(result: ToolResult): string {
  const item = result.content[0];
  if (item.type !== 'text') throw new Error(`Expected text content, got ${item.type}`);
  return item.text;
}

const listTool = stakeholderTools.find((t) => t.name === 'list_stakeholders')!;
const getTool = stakeholderTools.find((t) => t.name === 'get_stakeholder')!;
const createTool = stakeholderTools.find((t) => t.name === 'create_stakeholder')!;
const updateTool = stakeholderTools.find((t) => t.name === 'update_stakeholder')!;

describe('list_stakeholders', () => {
  it('calls GET /api/v1/stakeholders', async () => {
    const client = makeClient({
      get: jest.fn().mockResolvedValue({ data: [{ id: '1', name: 'Alice' }] }),
    });

    const result = await listTool.handler({}, client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/stakeholders', { params: {} });
    expect(result.content[0].type).toBe('text');
    expect(firstText(result)).toContain('Alice');
  });

  it('passes companyId and limit as query params', async () => {
    const client = makeClient({
      get: jest.fn().mockResolvedValue({ data: { stakeholders: [] } }),
    });

    await listTool.handler({ companyId: 'co-123', limit: 10 }, client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/stakeholders', {
      params: { companyId: 'co-123', limit: 10 },
    });
  });

  it('handles the stakeholders envelope', async () => {
    const stakeholders = [{ id: '2', name: 'Bob' }];
    const client = makeClient({
      get: jest.fn().mockResolvedValue({ data: { stakeholders } }),
    });

    const result = await listTool.handler({}, client);
    expect(firstText(result)).toContain('Bob');
  });

  it('returns an error content when the API throws', async () => {
    const client = makeClient({
      get: jest.fn().mockRejectedValue(new Error('Network error')),
    });

    await expect(listTool.handler({}, client)).rejects.toThrow('Network error');
  });
});

describe('get_stakeholder', () => {
  it('calls GET /api/v1/stakeholders/:id', async () => {
    const client = makeClient({
      get: jest.fn().mockResolvedValue({ data: { id: '42', name: 'Carol' } }),
    });

    const result = await getTool.handler({ id: '42' }, client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/stakeholders/42');
    expect(firstText(result)).toContain('Carol');
  });
});

describe('create_stakeholder', () => {
  it('posts the correct body to /api/v1/stakeholders', async () => {
    const newStakeholder = {
      id: 'new-1',
      name: 'Dave',
      email: 'dave@example.com',
      role: 'investor',
      companyId: 'co-1',
    };
    const client = makeClient({
      post: jest.fn().mockResolvedValue({ data: newStakeholder }),
    });

    const input = {
      name: 'Dave',
      email: 'dave@example.com',
      role: 'investor' as const,
      companyId: 'co-1',
    };
    const result = await createTool.handler(input, client);

    expect(client.post).toHaveBeenCalledWith('/api/v1/stakeholders', input);
    expect(firstText(result)).toContain('Stakeholder created');
    expect(firstText(result)).toContain('Dave');
  });

  it('validates that email must be a valid email address', () => {
    const parsed = createTool.inputSchema.safeParse({
      name: 'Eve',
      email: 'not-an-email',
      role: 'founder',
      companyId: 'co-1',
    });
    expect(parsed.success).toBe(false);
  });

  it('validates that role must be one of the allowed values', () => {
    const parsed = createTool.inputSchema.safeParse({
      name: 'Frank',
      email: 'frank@example.com',
      role: 'ceo',
      companyId: 'co-1',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('update_stakeholder', () => {
  it('calls PUT /api/v1/stakeholders/:id with the update body', async () => {
    const client = makeClient({
      put: jest.fn().mockResolvedValue({ data: { id: '99', name: 'Updated Name' } }),
    });

    const result = await updateTool.handler(
      { id: '99', name: 'Updated Name' },
      client
    );

    expect(client.put).toHaveBeenCalledWith('/api/v1/stakeholders/99', {
      name: 'Updated Name',
    });
    expect(firstText(result)).toContain('Stakeholder updated');
  });
});
