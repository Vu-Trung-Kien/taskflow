import type {
  Attachment,
  AttachmentUploadPayload,
  Comment,
  Project,
  ProjectMember,
  SessionPayload,
  Task,
  User,
} from './types';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
let accessToken: string | null = null;
let refreshPromise: Promise<SessionPayload | null> | null = null;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function errorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.filter((item) => typeof item === 'string').join(' ');
  }
  return fallback;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(errorMessage(payload, `Yêu cầu thất bại (${response.status}).`), response.status);
  }
  return payload as T;
}

async function refreshSession(): Promise<SessionPayload | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(parseResponse<SessionPayload>)
      .then((session) => {
        setAccessToken(session.accessToken);
        return session;
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          setAccessToken(null);
          return null;
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    allowRefresh &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/refresh')
  ) {
    const session = await refreshSession();
    if (session) return apiRequest<T>(path, options, false);
  }
  return parseResponse<T>(response);
}

export const authApi = {
  login(email: string, password: string) {
    return apiRequest<SessionPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);
  },
  register(name: string, email: string, password: string) {
    return apiRequest<SessionPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }, false);
  },
  async refresh() {
    return refreshSession();
  },
  logout() {
    return apiRequest<void>('/auth/logout', { method: 'POST' }, false);
  },
  me() {
    return apiRequest<User>('/auth/me');
  },
};

export const projectApi = {
  list(includeArchived = false) {
    return apiRequest<Project[]>(`/projects${includeArchived ? '?includeArchived=true' : ''}`);
  },
  get(projectId: string) {
    return apiRequest<Project & { members: ProjectMember[] }>(`/projects/${projectId}`);
  },
  create(input: { name: string; description?: string }) {
    return apiRequest<Project>('/projects', { method: 'POST', body: JSON.stringify(input) });
  },
  update(projectId: string, input: { name?: string; description?: string | null }) {
    return apiRequest<Project>(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  archive(projectId: string) {
    return apiRequest<Project>(`/projects/${projectId}`, { method: 'DELETE' });
  },
  restore(projectId: string) {
    return apiRequest<Project>(`/projects/${projectId}/restore`, { method: 'POST' });
  },
  members(projectId: string) {
    return apiRequest<ProjectMember[]>(`/projects/${projectId}/members`);
  },
  addMember(projectId: string, email: string, role: 'MEMBER' | 'VIEWER') {
    return apiRequest<ProjectMember>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },
  updateMember(projectId: string, userId: string, role: 'MEMBER' | 'VIEWER') {
    return apiRequest<ProjectMember>(`/projects/${projectId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  removeMember(projectId: string, userId: string) {
    return apiRequest<{ removed: boolean }>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
  },
  transferOwner(projectId: string, userId: string) {
    return apiRequest<ProjectMember[]>(`/projects/${projectId}/owner`, {
      method: 'PATCH',
      body: JSON.stringify({ userId }),
    });
  },
};

export const taskApi = {
  get(projectId: string, taskId: string) {
    return apiRequest<Task>(`/projects/${projectId}/tasks/${taskId}`);
  },
  list(projectId: string, filters: { status?: string; priority?: string; includeDeleted?: boolean } = {}) {
    const query = new URLSearchParams();
    if (filters.status) query.set('status', filters.status);
    if (filters.priority) query.set('priority', filters.priority);
    if (filters.includeDeleted) query.set('includeDeleted', 'true');
    const suffix = query.size ? `?${query.toString()}` : '';
    return apiRequest<Task[]>(`/projects/${projectId}/tasks${suffix}`);
  },
  create(projectId: string, input: Record<string, unknown>) {
    return apiRequest<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(input) });
  },
  update(projectId: string, taskId: string, input: Record<string, unknown>) {
    return apiRequest<Task>(`/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  delete(projectId: string, taskId: string) {
    return apiRequest<{ deleted: boolean }>(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
  },
  restore(projectId: string, taskId: string) {
    return apiRequest<Task>(`/projects/${projectId}/tasks/${taskId}/restore`, { method: 'POST' });
  },
};

export const collaborationApi = {
  comments(projectId: string, taskId: string) {
    return apiRequest<Comment[]>(`/projects/${projectId}/tasks/${taskId}/comments`);
  },
  createComment(projectId: string, taskId: string, body: string) {
    return apiRequest<Comment>(`/projects/${projectId}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  updateComment(projectId: string, taskId: string, commentId: string, body: string) {
    return apiRequest<Comment>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
  },
  deleteComment(projectId: string, taskId: string, commentId: string) {
    return apiRequest<{ deleted: boolean }>(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },
  attachments(projectId: string, taskId: string) {
    return apiRequest<Attachment[]>(`/projects/${projectId}/tasks/${taskId}/attachments`);
  },
  createAttachment(projectId: string, taskId: string, file: File) {
    return apiRequest<AttachmentUploadPayload>(`/projects/${projectId}/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
    });
  },
  completeAttachment(projectId: string, taskId: string, attachmentId: string) {
    return apiRequest<Attachment>(
      `/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/complete`,
      { method: 'POST' },
    );
  },
  downloadUrl(projectId: string, taskId: string, attachmentId: string) {
    return apiRequest<{ downloadUrl: string; expiresInSeconds: number }>(
      `/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/download`,
    );
  },
  deleteAttachment(projectId: string, taskId: string, attachmentId: string) {
    return apiRequest<{ deleted: boolean }>(`/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },
};

export async function uploadFile(url: string, file: File): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!response.ok) {
    throw new ApiError(`Tải tệp lên kho lưu trữ thất bại (${response.status}).`, response.status);
  }
}
