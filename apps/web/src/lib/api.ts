const BASE_URL = '/api';

export interface AIProviderInfo {
  provider: string;
  label: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Projects ──────────────────────────────────────────────────────────────

export const api = {
  projects: {
    list: () => request<Project[]>('/projects'),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; description: string }>) =>
      request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetch(`${BASE_URL}/projects/${id}`, { method: 'DELETE' }),
  },

  features: {
    list: (projectId: string) => request<Feature[]>(`/projects/${projectId}/features`),
    get: (featureId: string) => request<Feature>(`/projects/features/${featureId}`),
    create: (projectId: string, data: { name: string; description?: string }) =>
      request<Feature>(`/projects/${projectId}/features`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (featureId: string) =>
      fetch(`${BASE_URL}/projects/features/${featureId}`, { method: 'DELETE' }),

    uploadBADocument: (featureId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<BADocument>(`/projects/features/${featureId}/upload/ba-document`, {
        method: 'POST',
        headers: {},
        body: form,
      });
    },

    uploadScreenshot: (featureId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<Screenshot>(`/projects/features/${featureId}/upload/screenshot`, {
        method: 'POST',
        headers: {},
        body: form,
      });
    },
  },

  testCases: {
    list: (featureId: string) => request<TestCase[]>(`/test-cases/feature/${featureId}`),
    get: (id: string) => request<TestCase>(`/test-cases/${id}`),
    update: (id: string, data: Partial<TestCase>) =>
      request<TestCase>(`/test-cases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetch(`${BASE_URL}/test-cases/${id}`, { method: 'DELETE' }),
    generate: (featureId: string, provider?: string) =>
      request<{ generated: number; testCases: TestCase[] }>(
        `/test-cases/feature/${featureId}/generate${provider ? `?provider=${provider}` : ''}`,
        { method: 'POST' },
      ),
  },

  chat: {
    createSession: (featureId: string, title?: string) =>
      request<ChatSession>('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({ featureId, title }),
      }),
    listSessions: (featureId: string) =>
      request<ChatSession[]>(`/chat/sessions/feature/${featureId}`),
    listMessages: (sessionId: string) =>
      request<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`),
    deleteSession: (sessionId: string) =>
      fetch(`${BASE_URL}/chat/sessions/${sessionId}`, { method: 'DELETE' }),

    /** Returns an EventSource for SSE streaming. */
    stream: (sessionId: string, message: string, provider?: string): EventSource => {
      const params = new URLSearchParams({ message });
      if (provider) params.set('provider', provider);
      return new EventSource(`${BASE_URL}/chat/sessions/${sessionId}/stream?${params}`);
    },
  },

  ai: {
    getProviders: () => request<AIProviderInfo[]>('/ai/providers'),
  },
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { features: number };
}

export interface Feature {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  baDocument?: BADocument;
  screenshots?: Screenshot[];
}

export interface BADocument {
  id: string;
  featureId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  uploadedAt: string;
}

export interface Screenshot {
  id: string;
  featureId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  uploadedAt: string;
}

export interface TestCaseStep {
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  featureId: string;
  title: string;
  description?: string;
  preconditions?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'DRAFT' | 'APPROVED' | 'DEPRECATED';
  steps: TestCaseStep[];
  aiProvider: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  featureId: string;
  title: string;
  createdAt: string;
  _count?: { messages: number };
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}
