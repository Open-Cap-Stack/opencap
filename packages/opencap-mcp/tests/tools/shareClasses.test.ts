import { shareClassTools } from '../../src/tools/shareClasses.js';
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

const listTool = shareClassTools.find((t) => t.name === 'list_share_classes')!;
const getTool = shareClassTools.find((t) => t.name === 'get_share_class')!;
const createTool = shareClassTools.find((t) => t.name === 'create_share_class')!;

describe('list_share_classes', () => {
  it('calls GET /api/v1/share-classes', async () => {
    const client = makeClient({
      get: jest.fn().mockResolvedValue({
        data: [{ id: 'sc-1', name: 'Common' }],
      }),
    });

    const result = await listTool.handler({}, client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/share-classes', { params: {} });
    expect(firstText(result)).toContain('Common');
  });

  it('unwraps the shareClasses envelope if present', async () => {
    const shareClasses = [{ id: 'sc-2', name: 'Series A Preferred' }];
    const client = makeClient({
      get: jest.fn().mockResolvedValue({ data: { shareClasses } }),
    });

    const result = await listTool.handler({}, client);
    expect(firstText(result)).toContain('Series A Preferred');
  });

  it('passes companyId and limit as params', async () => {
    const client = makeClient({
      get: jest.fn().mockResolvedValue({ data: [] }),
    });

    await listTool.handler({ companyId: 'co-abc', limit: 5 }, client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/share-classes', {
      params: { companyId: 'co-abc', limit: 5 },
    });
  });
});

describe('get_share_class', () => {
  it('calls GET /api/v1/share-classes/:id', async () => {
    const client = makeClient({
      get: jest.fn().mockResolvedValue({
        data: { id: 'sc-99', name: 'Series B Preferred' },
      }),
    });

    const result = await getTool.handler({ id: 'sc-99' }, client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/share-classes/sc-99');
    expect(firstText(result)).toContain('Series B Preferred');
  });
});

describe('create_share_class', () => {
  const validInput = {
    name: 'Series C Preferred',
    classType: 'preferred' as const,
    authorizedShares: 10_000_000,
    companyId: 'co-1',
  };

  it('posts to /api/v1/share-classes with the correct body', async () => {
    const client = makeClient({
      post: jest.fn().mockResolvedValue({ data: { id: 'sc-new', ...validInput } }),
    });

    const result = await createTool.handler(validInput, client);

    expect(client.post).toHaveBeenCalledWith('/api/v1/share-classes', validInput);
    expect(firstText(result)).toContain('Share class created');
    expect(firstText(result)).toContain('Series C Preferred');
  });

  it('validates that authorizedShares must be a positive integer', () => {
    const parsed = createTool.inputSchema.safeParse({
      ...validInput,
      authorizedShares: -100,
    });
    expect(parsed.success).toBe(false);
  });

  it('validates that classType must be one of the allowed values', () => {
    const parsed = createTool.inputSchema.safeParse({
      ...validInput,
      classType: 'convertible_note',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts optional fields like parValue and liquidationPreference', async () => {
    const client = makeClient({
      post: jest.fn().mockResolvedValue({ data: { id: 'sc-opt' } }),
    });

    const inputWithOptionals = {
      ...validInput,
      parValue: 0.0001,
      liquidationPreference: 1,
      participationRights: 'none' as const,
    };

    await createTool.handler(inputWithOptionals, client);

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/share-classes',
      inputWithOptionals
    );
  });
});
