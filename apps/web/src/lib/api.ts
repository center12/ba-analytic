const BASE_URL = '/api';

export interface AIModelInfo {
  id: string;
  label: string;
}

export interface ProjectStepConfig {
  id: string;
  projectId: string;
  step: 1 | 2 | 3 | 4;
  provider: 'gemini' | 'claude' | 'openai';
  model: string | null;
}

export interface AIProviderInfo {
  provider: string;
  label: string;
  models: AIModelInfo[];
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

    getPipelineConfig: (projectId: string) =>
      request<ProjectStepConfig[]>(`/projects/${projectId}/pipeline-config`),

    upsertPipelineConfig: (projectId: string, configs: Array<{ step: number; provider: string; model?: string }>) =>
      request<ProjectStepConfig[]>(`/projects/${projectId}/pipeline-config`, {
        method: 'PUT',
        body: JSON.stringify({ configs }),
      }),

    deletePipelineConfigStep: (projectId: string, step: number) =>
      fetch(`${BASE_URL}/projects/${projectId}/pipeline-config/${step}`, { method: 'DELETE' }),
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
    generate: (featureId: string, provider?: string, model?: string) => {
      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (model) params.set('model', model);
      const qs = params.toString();
      return request<{ generated: number; testCases: TestCase[]; pipeline: { requirementsCount: number; scenariosCount: number } }>(
        `/test-cases/feature/${featureId}/generate${qs ? `?${qs}` : ''}`,
        { method: 'POST' },
      );
    },
    resume: (featureId: string, provider?: string, model?: string) => {
      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (model) params.set('model', model);
      const qs = params.toString();
      return request<{ generated: number; testCases: TestCase[]; pipeline: { requirementsCount: number; scenariosCount: number } }>(
        `/test-cases/feature/${featureId}/resume${qs ? `?${qs}` : ''}`,
        { method: 'POST' },
      );
    },
    runStep: (featureId: string, step: number, provider?: string, model?: string, override?: unknown) => {
      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (model) params.set('model', model);
      const qs = params.toString();
      return request<unknown>(
        `/test-cases/feature/${featureId}/run-step/${step}${qs ? `?${qs}` : ''}`,
        { method: 'POST', body: override ? JSON.stringify({ override }) : undefined },
      );
    },
    resumeStep1: (featureId: string, provider?: string, model?: string) => {
      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (model) params.set('model', model);
      const qs = params.toString();
      return request<unknown>(
        `/test-cases/feature/${featureId}/resume-step1${qs ? `?${qs}` : ''}`,
        { method: 'POST' },
      );
    },
    saveStepResults: (featureId: string, data: {
      step: 1 | 2 | 3 | 4;
      extractedRequirements?: ExtractedRequirements;
      extractedBehaviors?: ExtractedBehaviors;
      testScenarios?: TestScenario[];
      generatedTestCases?: GeneratedTestCase[];
      devPrompt?: DevPrompt;
    }) =>
      request<unknown>(
        `/test-cases/feature/${featureId}/step-results`,
        { method: 'PATCH', body: JSON.stringify(data) },
      ),
    getStepPrompt: (featureId: string, step: number) =>
      request<{ prompt: string }>(`/test-cases/feature/${featureId}/step-prompt/${step}`),
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

  devTasks: {
    list: (featureId: string) => request<DeveloperTask[]>(`/dev-tasks/feature/${featureId}`),
    remove: (id: string) => fetch(`${BASE_URL}/dev-tasks/${id}`, { method: 'DELETE' }),
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

export type ScenarioType = 'happy_path' | 'edge_case' | 'error' | 'boundary' | 'security';

/** Layer 1B — Behavior Extraction */
export interface ExtractedBehaviors {
  feature: string;
  actors: string[];
  actions: string[];
  rules: string[];
}

export interface ExtractedRequirements {
  features: string[];
  businessRules: string[];
  acceptanceCriteria: string[];
  entities: string[];
}

export interface TestScenario {
  title: string;
  type: ScenarioType;
  requirementRefs: string[];
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
  extractedRequirements?: ExtractedRequirements;
  extractedBehaviors?: ExtractedBehaviors;
  testScenarios?: TestScenario[];
  devPromptApi?: string;
  devPromptFrontend?: string;
  devPromptTesting?: string;
  pipelineStatus?: 'IDLE' | 'RUNNING' | 'FAILED' | 'COMPLETED';
  pipelineStep?: number | null;
  pipelineFailedAt?: number | null;
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

export interface GeneratedTestCase {
  title: string;
  description: string;
  preconditions: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  steps: TestCaseStep[];
}

export interface DevTaskItem {
  title: string;
  prompt: string;
}

export interface DevPrompt {
  api:      DevTaskItem[];
  frontend: DevTaskItem[];
  testing:  DevTaskItem[];
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

export type DevTaskCategory = 'API' | 'FRONTEND' | 'TESTING';

export interface DeveloperTask {
  id: string;
  featureId: string;
  category: DevTaskCategory;
  title: string;
  prompt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}
