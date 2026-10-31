import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, projectApi, taskApi, setAccessToken } from './api';

describe('apiRequest', () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  it('sends authenticated requests with credentials and parses JSON', async () => {
    setAccessToken('access-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await expect(apiRequest<{ ok: boolean }>('/projects')).resolves.toEqual({ ok: true });
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.credentials).toBe('include');
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer access-token');
  });

  it('exposes backend validation errors instead of hiding them', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: ['Email must be valid.'] }), { status: 400 }),
    );

    await expect(apiRequest('/auth/login', { method: 'POST' }, false)).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Email must be valid.',
      status: 400,
    } satisfies Partial<ApiError>);
  });

  it('refreshes the access token after an authenticated request expires', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'refreshed', user: { id: 'u1', email: 'a@b.test', name: null } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: 1 }), { status: 200 }));

    await expect(apiRequest<{ data: number }>('/projects')).resolves.toEqual({ data: 1 });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/auth/refresh', expect.objectContaining({ credentials: 'include' }));
    const [, retryOptions] = fetchMock.mock.calls[2];
    expect(new Headers(retryOptions?.headers).get('Authorization')).toBe('Bearer refreshed');
  });

  it('fetches project metrics successfully', async () => {
    setAccessToken('access-token');
    const mockMetrics = {
      tasks: {
        total: 10,
        byStatus: { TODO: 4, IN_PROGRESS: 3, DONE: 2, BLOCKED: 1 },
        byPriority: { LOW: 2, MEDIUM: 5, HIGH: 2, URGENT: 1 },
        overdue: 1,
        dueSoon: 2,
        completionRate: 20,
      },
      members: { total: 2, breakdown: [] },
      activity: { totalComments: 5, totalAttachments: 3 },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockMetrics), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    const result = await projectApi.metrics('proj-123');
    expect(result).toEqual(mockMetrics);
  });

  it('downloads task CSV export as a Blob', async () => {
    setAccessToken('access-token');
    const csvContent = '\uFEFFMã công việc,Tiêu đề\n1,Task 1';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(csvContent, { status: 200, headers: { 'Content-Type': 'text/csv' } }),
    );

    const blob = await taskApi.exportCsv('proj-123', { status: 'DONE' });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
