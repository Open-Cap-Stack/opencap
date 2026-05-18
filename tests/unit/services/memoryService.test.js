/**
 * Unit Tests for MemoryService
 *
 * Tests session management, workflow state, form data, navigation history,
 * caching, preferences, and analytics — all ZeroDB calls are mocked.
 */

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  storeMemory: jest.fn(),
  listMemory: jest.fn(),
  projectId: 'mock-project-id'
}));

// uuid is used inside the service — let it run but keep it deterministic where needed
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-1234')
}));

const zerodbService = require('../../../services/zerodbService');
const { v4: uuidv4 } = require('uuid');

// Require service AFTER mocks are registered
const memoryService = require('../../../services/memoryService');

describe('MemoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.storeMemory.mockResolvedValue({ id: 'mem-1' });
    zerodbService.listMemory.mockResolvedValue([]);
  });

  // ---------------------------------------------------------------------------
  // Constructor / initial state
  // ---------------------------------------------------------------------------
  describe('constructor', () => {
    it('sets sessionTimeoutMs to 30 minutes', () => {
      expect(memoryService.sessionTimeoutMs).toBe(30 * 60 * 1000);
    });

    it('sets maxMemoryPerSession to 1000', () => {
      expect(memoryService.maxMemoryPerSession).toBe(1000);
    });

    it('exposes contextTypes with expected keys', () => {
      const types = memoryService.contextTypes;
      expect(types.USER_SESSION).toBe('user_session');
      expect(types.WORKFLOW_STATE).toBe('workflow_state');
      expect(types.FORM_DATA).toBe('form_data');
      expect(types.NAVIGATION).toBe('navigation');
      expect(types.PREFERENCES).toBe('preferences');
      expect(types.CACHE).toBe('cache');
    });
  });

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------
  describe('initialize', () => {
    it('calls zerodbService.initialize with the provided token', async () => {
      zerodbService.initialize.mockResolvedValue(undefined);
      await memoryService.initialize('my-jwt-token');

      expect(zerodbService.initialize).toHaveBeenCalledWith('my-jwt-token');
    });

    it('rethrows errors from zerodbService.initialize', async () => {
      zerodbService.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(memoryService.initialize('bad-token')).rejects.toThrow('Init failed');
    });
  });

  // ---------------------------------------------------------------------------
  // createSession
  // ---------------------------------------------------------------------------
  describe('createSession', () => {
    it('calls storeMemory with session: prefix and USER_SESSION type', async () => {
      const sessionId = await memoryService.createSession('user-1', {
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1'
      });

      expect(sessionId).toBe('mock-uuid-1234');
      expect(zerodbService.storeMemory).toHaveBeenCalledWith(
        'session:mock-uuid-1234',
        'mock-uuid-1234',
        'system',
        expect.stringContaining('session_id'),
        expect.objectContaining({ type: 'user_session', user_id: 'user-1' })
      );
    });

    it('stores serialized session JSON including user_id', async () => {
      await memoryService.createSession('user-42', {});

      const storedContent = zerodbService.storeMemory.mock.calls[0][3];
      const parsed = JSON.parse(storedContent);
      expect(parsed.user_id).toBe('user-42');
      expect(parsed.session_id).toBe('mock-uuid-1234');
    });

    it('includes expires_at in stored metadata', async () => {
      await memoryService.createSession('user-1', {});

      const metadata = zerodbService.storeMemory.mock.calls[0][4];
      expect(metadata.expires_at).toBeDefined();
    });

    it('rethrows errors from storeMemory', async () => {
      zerodbService.storeMemory.mockRejectedValue(new Error('Storage error'));

      await expect(memoryService.createSession('user-1', {})).rejects.toThrow('Storage error');
    });
  });

  // ---------------------------------------------------------------------------
  // getSession
  // ---------------------------------------------------------------------------
  describe('getSession', () => {
    it('returns null when listMemory returns empty array', async () => {
      zerodbService.listMemory.mockResolvedValue([]);

      const result = await memoryService.getSession('session-abc');
      expect(result).toBeNull();
    });

    it('returns null when session is expired', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      zerodbService.listMemory.mockResolvedValue([{
        content: JSON.stringify({ session_id: 'session-abc', user_id: 'user-1' }),
        memory_metadata: { expires_at: pastDate }
      }]);

      const result = await memoryService.getSession('session-abc');
      expect(result).toBeNull();
    });

    it('returns session data when session is valid', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const sessionData = { session_id: 'session-abc', user_id: 'user-1' };
      zerodbService.listMemory.mockResolvedValue([{
        content: JSON.stringify(sessionData),
        memory_metadata: { expires_at: futureDate }
      }]);

      const result = await memoryService.getSession('session-abc');
      expect(result.session_id).toBe('session-abc');
      expect(result.user_id).toBe('user-1');
    });

    it('rethrows errors from listMemory', async () => {
      zerodbService.listMemory.mockRejectedValue(new Error('List failed'));

      await expect(memoryService.getSession('session-abc')).rejects.toThrow('List failed');
    });
  });

  // ---------------------------------------------------------------------------
  // updateSessionActivity
  // ---------------------------------------------------------------------------
  describe('updateSessionActivity', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const validSession = {
      content: JSON.stringify({ session_id: 's1', user_id: 'u1', activity_count: 0 }),
      memory_metadata: { expires_at: futureDate }
    };

    it('throws when session is not found', async () => {
      zerodbService.listMemory.mockResolvedValue([]);

      await expect(
        memoryService.updateSessionActivity('session-missing', { page: '/home' })
      ).rejects.toThrow('Session not found or expired');
    });

    it('updates activity_count and stores updated session', async () => {
      zerodbService.listMemory.mockResolvedValue([validSession]);

      await memoryService.updateSessionActivity('s1', { page: '/dashboard' });

      const storedContent = zerodbService.storeMemory.mock.calls[0][3];
      const parsed = JSON.parse(storedContent);
      expect(parsed.activity_count).toBe(1);
      expect(parsed.current_page).toBe('/dashboard');
    });

    it('updates last_feature when activity has a feature property', async () => {
      zerodbService.listMemory.mockResolvedValue([validSession]);

      await memoryService.updateSessionActivity('s1', { feature: 'equity-grants' });

      const storedContent = zerodbService.storeMemory.mock.calls[0][3];
      const parsed = JSON.parse(storedContent);
      expect(parsed.last_feature).toBe('equity-grants');
    });
  });

  // ---------------------------------------------------------------------------
  // storeWorkflowState
  // ---------------------------------------------------------------------------
  describe('storeWorkflowState', () => {
    it('calls storeMemory with workflow: prefix', async () => {
      await memoryService.storeWorkflowState(
        'workflow-1', 'session-1', 'step_2',
        { formData: { name: 'Test' } },
        { userId: 'user-1' }
      );

      expect(zerodbService.storeMemory).toHaveBeenCalledWith(
        'workflow:workflow-1',
        'session-1',
        'system',
        expect.stringContaining('workflow_id'),
        expect.objectContaining({
          type: 'workflow_state',
          workflow_id: 'workflow-1',
          current_state: 'step_2'
        })
      );
    });

    it('stores current_state in serialized content', async () => {
      await memoryService.storeWorkflowState('wf-2', 'sess-2', 'completed', {}, {});

      const content = JSON.parse(zerodbService.storeMemory.mock.calls[0][3]);
      expect(content.current_state).toBe('completed');
    });

    it('rethrows errors from storeMemory', async () => {
      zerodbService.storeMemory.mockRejectedValue(new Error('Store failed'));

      await expect(
        memoryService.storeWorkflowState('wf', 'sess', 'start', {}, {})
      ).rejects.toThrow('Store failed');
    });
  });

  // ---------------------------------------------------------------------------
  // getWorkflowState
  // ---------------------------------------------------------------------------
  describe('getWorkflowState', () => {
    it('returns null when no memories found', async () => {
      zerodbService.listMemory.mockResolvedValue([]);

      const result = await memoryService.getWorkflowState('wf-1', 'sess-1');
      expect(result).toBeNull();
    });

    it('returns parsed workflow state when found', async () => {
      const stateData = { workflow_id: 'wf-1', current_state: 'step_3', state_data: {} };
      zerodbService.listMemory.mockResolvedValue([{
        content: JSON.stringify(stateData)
      }]);

      const result = await memoryService.getWorkflowState('wf-1', 'sess-1');
      expect(result.workflow_id).toBe('wf-1');
      expect(result.current_state).toBe('step_3');
    });
  });

  // ---------------------------------------------------------------------------
  // storeFormData
  // ---------------------------------------------------------------------------
  describe('storeFormData', () => {
    it('calls storeMemory with form: prefix and FORM_DATA type', async () => {
      await memoryService.storeFormData('form-1', 'session-1', { name: 'John', age: 30 });

      expect(zerodbService.storeMemory).toHaveBeenCalledWith(
        'form:form-1',
        'session-1',
        'user',
        expect.stringContaining('form_id'),
        expect.objectContaining({ type: 'form_data', form_id: 'form-1', field_count: 2 })
      );
    });

    it('records correct field_count in metadata', async () => {
      await memoryService.storeFormData('form-2', 'session-2', { a: 1, b: 2, c: 3, d: 4 });

      const metadata = zerodbService.storeMemory.mock.calls[0][4];
      expect(metadata.field_count).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // getFormData
  // ---------------------------------------------------------------------------
  describe('getFormData', () => {
    it('returns null when no form data found', async () => {
      zerodbService.listMemory.mockResolvedValue([]);

      const result = await memoryService.getFormData('form-1', 'session-1');
      expect(result).toBeNull();
    });

    it('returns parsed form data when found', async () => {
      const formRecord = { form_id: 'form-1', form_data: { name: 'Alice' } };
      zerodbService.listMemory.mockResolvedValue([{
        content: JSON.stringify(formRecord)
      }]);

      const result = await memoryService.getFormData('form-1', 'session-1');
      expect(result.form_data.name).toBe('Alice');
    });
  });

  // ---------------------------------------------------------------------------
  // storeUserPreferences
  // ---------------------------------------------------------------------------
  describe('storeUserPreferences', () => {
    it('calls storeMemory with preferences: prefix', async () => {
      await memoryService.storeUserPreferences('user-1', { theme: 'dark', language: 'en' });

      expect(zerodbService.storeMemory).toHaveBeenCalledWith(
        'preferences:user-1',
        expect.any(String),
        'system',
        expect.stringContaining('user_id'),
        expect.objectContaining({ type: 'preferences', user_id: 'user-1', preference_count: 2 })
      );
    });

    it('rethrows errors from storeMemory', async () => {
      zerodbService.storeMemory.mockRejectedValue(new Error('Pref store failed'));

      await expect(
        memoryService.storeUserPreferences('user-1', {})
      ).rejects.toThrow('Pref store failed');
    });
  });

  // ---------------------------------------------------------------------------
  // getUserPreferences
  // ---------------------------------------------------------------------------
  describe('getUserPreferences', () => {
    it('returns empty object when no preferences found', async () => {
      zerodbService.listMemory.mockResolvedValue([]);

      const result = await memoryService.getUserPreferences('user-1');
      expect(result).toEqual({});
    });

    it('returns preferences object from stored memory', async () => {
      const prefsData = { user_id: 'user-1', preferences: { theme: 'dark', fontSize: 14 } };
      zerodbService.listMemory.mockResolvedValue([{
        content: JSON.stringify(prefsData)
      }]);

      const result = await memoryService.getUserPreferences('user-1');
      expect(result.theme).toBe('dark');
      expect(result.fontSize).toBe(14);
    });
  });

  // ---------------------------------------------------------------------------
  // storeNavigationHistory
  // ---------------------------------------------------------------------------
  describe('storeNavigationHistory', () => {
    it('calls storeMemory with navigation: prefix and NAVIGATION type', async () => {
      await memoryService.storeNavigationHistory('session-1', '/home', '/dashboard', {});

      expect(zerodbService.storeMemory).toHaveBeenCalledWith(
        'navigation:session-1',
        'session-1',
        'system',
        expect.stringContaining('from_page'),
        expect.objectContaining({ type: 'navigation', from_page: '/home', to_page: '/dashboard' })
      );
    });

    it('rethrows errors from storeMemory', async () => {
      zerodbService.storeMemory.mockRejectedValue(new Error('Nav store failed'));

      await expect(
        memoryService.storeNavigationHistory('s1', '/a', '/b')
      ).rejects.toThrow('Nav store failed');
    });
  });

  // ---------------------------------------------------------------------------
  // getNavigationHistory
  // ---------------------------------------------------------------------------
  describe('getNavigationHistory', () => {
    it('returns empty array when no history found', async () => {
      zerodbService.listMemory.mockResolvedValue([]);

      const result = await memoryService.getNavigationHistory('session-1');
      expect(result).toEqual([]);
    });

    it('parses and returns each navigation record', async () => {
      const navEntries = [
        { content: JSON.stringify({ from_page: '/home', to_page: '/dashboard' }) },
        { content: JSON.stringify({ from_page: '/dashboard', to_page: '/equity' }) }
      ];
      zerodbService.listMemory.mockResolvedValue(navEntries);

      const result = await memoryService.getNavigationHistory('session-1', 50);
      expect(result).toHaveLength(2);
      expect(result[0].from_page).toBe('/home');
      expect(result[1].to_page).toBe('/equity');
    });

    it('passes limit parameter to listMemory', async () => {
      zerodbService.listMemory.mockResolvedValue([]);

      await memoryService.getNavigationHistory('session-1', 25);

      expect(zerodbService.listMemory).toHaveBeenCalledWith(
        'navigation:session-1', 'session-1', 'system', 0, 25
      );
    });
  });

  // ---------------------------------------------------------------------------
  // cacheData
  // ---------------------------------------------------------------------------
  describe('cacheData', () => {
    it('calls storeMemory with cache: prefix and CACHE type', async () => {
      await memoryService.cacheData('my-cache-key', { result: 42 });

      expect(zerodbService.storeMemory).toHaveBeenCalledWith(
        'cache:my-cache-key',
        expect.any(String),
        'system',
        expect.stringContaining('"key":"my-cache-key"'),
        expect.objectContaining({ type: 'cache', cache_key: 'my-cache-key' })
      );
    });

    it('stores expires_at based on ttlMs', async () => {
      const before = Date.now();
      const ttl = 10 * 60 * 1000; // 10 minutes
      await memoryService.cacheData('key-1', 'value', ttl);

      const metadata = zerodbService.storeMemory.mock.calls[0][4];
      const expiresAt = new Date(metadata.expires_at).getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(before + ttl - 100);
    });

    it('rethrows errors from storeMemory', async () => {
      zerodbService.storeMemory.mockRejectedValue(new Error('Cache write failed'));

      await expect(memoryService.cacheData('key', 'val')).rejects.toThrow('Cache write failed');
    });
  });

  // ---------------------------------------------------------------------------
  // getCachedData
  // ---------------------------------------------------------------------------
  describe('getCachedData', () => {
    it('returns null when no cache entry found', async () => {
      zerodbService.listMemory.mockResolvedValue([]);

      const result = await memoryService.getCachedData('missing-key');
      expect(result).toBeNull();
    });

    it('returns null when cache entry is expired', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      zerodbService.listMemory.mockResolvedValue([{
        content: JSON.stringify({ key: 'k', data: 'cached', expires_at: pastDate })
      }]);

      const result = await memoryService.getCachedData('k');
      expect(result).toBeNull();
    });

    it('returns cached data when not expired', async () => {
      const futureDate = new Date(Date.now() + 60000).toISOString();
      zerodbService.listMemory.mockResolvedValue([{
        content: JSON.stringify({ key: 'k', data: { value: 99 }, expires_at: futureDate })
      }]);

      const result = await memoryService.getCachedData('k');
      expect(result).toEqual({ value: 99 });
    });

    it('returns null (not throws) when listMemory rejects', async () => {
      zerodbService.listMemory.mockRejectedValue(new Error('List error'));

      const result = await memoryService.getCachedData('k');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // expireSession
  // ---------------------------------------------------------------------------
  describe('expireSession', () => {
    it('resolves without error (stub implementation)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(memoryService.expireSession('session-1')).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // getMemoryAnalytics
  // ---------------------------------------------------------------------------
  describe('getMemoryAnalytics', () => {
    it('returns analytics object with correct type', async () => {
      zerodbService.listMemory.mockResolvedValue([
        {
          memory_metadata: { type: 'user_session' },
          content: 'some content',
          created_at: new Date().toISOString()
        },
        {
          memory_metadata: { type: 'user_session' },
          content: 'more content',
          created_at: new Date().toISOString()
        }
      ]);

      const result = await memoryService.getMemoryAnalytics('user_session');

      expect(result.type).toBe('user_session');
      expect(result.total_records).toBe(2);
      expect(result.memory_usage).toBeGreaterThan(0);
    });

    it('returns zero counts when no matching memories', async () => {
      zerodbService.listMemory.mockResolvedValue([
        { memory_metadata: { type: 'other_type' }, content: '', created_at: null }
      ]);

      const result = await memoryService.getMemoryAnalytics('user_session');

      expect(result.total_records).toBe(0);
      expect(result.memory_usage).toBe(0);
      expect(result.oldest_record).toBeNull();
      expect(result.newest_record).toBeNull();
    });

    it('rethrows errors from listMemory', async () => {
      zerodbService.listMemory.mockRejectedValue(new Error('Analytics failed'));

      await expect(memoryService.getMemoryAnalytics('user_session')).rejects.toThrow('Analytics failed');
    });
  });

  // ---------------------------------------------------------------------------
  // cleanupExpiredMemories
  // ---------------------------------------------------------------------------
  describe('cleanupExpiredMemories', () => {
    it('resolves without error (stub implementation)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(memoryService.cleanupExpiredMemories()).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });
  });
});
