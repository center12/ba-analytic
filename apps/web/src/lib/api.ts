import { getStoredToken, removeStoredToken } from '@/features/auth/helpers/auth.helpers';

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
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    removeStoredToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Request failed: ${res.status}`);
  }

  // 204 No Content — return undefined cast to T
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Projects ──────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (data: { username: string; password: string }) =>
      request<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  users: {
    list: () => request<User[]>('/users'),
    create: (data: { username: string; password: string }) =>
      request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  },

  projects: {
    list: () => request<Project[]>('/projects'),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; description: string }>) =>
      request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/projects/${id}`, { method: 'DELETE' }),

    getPipelineConfig: (projectId: string) =>
      request<ProjectStepConfig[]>(`/projects/${projectId}/pipeline-config`),

    upsertPipelineConfig: (projectId: string, configs: Array<{ step: number; provider: string; model?: string }>) =>
      request<ProjectStepConfig[]>(`/projects/${projectId}/pipeline-config`, {
        method: 'PUT',
        body: JSON.stringify({ configs }),
      }),

    deletePipelineConfigStep: (projectId: string, step: number) =>
      request<void>(`/projects/${projectId}/pipeline-config/${step}`, { method: 'DELETE' }),
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
      request<void>(`/projects/features/${featureId}`, { method: 'DELETE' }),

    uploadBADocument: (featureId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<BADocument>(`/projects/features/${featureId}/upload/ba-document`, {
        method: 'POST',
        body: form,
      });
    },

    uploadScreenshot: (featureId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<Screenshot>(`/projects/features/${featureId}/upload/screenshot`, {
        method: 'POST',
        body: form,
      });
    },
  },

  testCases: {
    list: (featureId: string) => request<TestCase[]>(`/test-cases/feature/${featureId}`),
    get: (id: string) => request<TestCase>(`/test-cases/${id}`),
    update: (id: string, data: Partial<TestCase>) =>
      request<TestCase>(`/test-cases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/test-cases/${id}`, { method: 'DELETE' }),
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
    runStep4Section: (
      featureId: string,
      section: 'workflow-backend' | 'frontend' | 'testing' | 'testing-backend' | 'testing-frontend',
      provider?: string,
      model?: string,
    ) => {
      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (model) params.set('model', model);
      const qs = params.toString();
      return request<unknown>(
        `/test-cases/feature/${featureId}/run-step-4-section/${section}${qs ? `?${qs}` : ''}`,
        { method: 'POST' },
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
      step: 1 | 2 | 3 | 4 | 5;
      extractedRequirements?: ExtractedRequirements;
      extractedBehaviors?: ExtractedBehaviors;
      testScenarios?: TestScenario[];
      generatedTestCases?: GeneratedTestCase[];
      devPlan?: DevPlan;
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
      request<void>(`/chat/sessions/${sessionId}`, { method: 'DELETE' }),

    /** Returns an EventSource for SSE streaming. Token is passed as a query param
     *  because EventSource does not support custom headers. */
    stream: (sessionId: string, message: string, provider?: string): EventSource => {
      const params = new URLSearchParams({ message });
      if (provider) params.set('provider', provider);
      const token = getStoredToken();
      if (token) params.set('token', token);
      return new EventSource(`${BASE_URL}/chat/sessions/${sessionId}/stream?${params}`);
    },
  },

  ai: {
    getProviders: () => request<AIProviderInfo[]>('/ai/providers'),
  },

  devTasks: {
    list: (featureId: string) => request<DeveloperTask[]>(`/dev-tasks/feature/${featureId}`),
    remove: (id: string) => request<void>(`/dev-tasks/${id}`, { method: 'DELETE' }),
  },
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

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
  devPlanWorkflow?: string;
  devPlanBackend?: string;
  devPlanFrontend?: string;
  devPlanTesting?: string;
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

// ── Step 4 — Development Plan types ──────────────────────────────────────────

export interface WorkflowStep {
  order: number;
  title: string;
  description: string;
  actor: string;
}

export interface DatabaseField {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  description?: string;
}

export interface DatabaseEntity {
  name: string;
  tableName: string;
  fields: DatabaseField[];
  indexes?: string[];
  constraints?: string[];
  softDelete?: boolean;
}

export interface ApiParam {
  name: string;
  in: 'path' | 'query' | 'body';
  type: string;
  required: boolean;
}

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  params: ApiParam[];
  jsonResponse: string;
  requestBody?: string;
  errorCases?: string[];
}

export interface QueryDesign {
  name: string;
  sql: string;
  isPaginated: boolean;
}

export interface TransactionBoundary {
  where: string;
  why: string;
}

export interface CacheEntry {
  key: string;
  ttl: string;
  description: string;
}

export interface BackendTask {
  title: string;
  description: string;
}

export interface BackendPlan {
  database: { entities: DatabaseEntity[]; relationships: string[] };
  apiRoutes: ApiRoute[];
  folderStructure: string[];
  featureOverview?: string;
  businessLogicFlow?: string[];
  queryDesign?: QueryDesign[];
  transactions?: TransactionBoundary[];
  cachingStrategy?: CacheEntry[];
  validationRules?: string[];
  security?: string[];
  backendTasks?: BackendTask[];
}

export interface FrontendTask {
  id: string;
  title: string;
  description: string;
}

export interface StateManagement {
  local: string[];
  global: string[];
  tool: string;
}

export interface ApiIntegration {
  services: string[];
  apiMapping: string[];
  errorMapping: string[];
}

export interface FrontendPlan {
  components: string[];
  pages: string[];
  store: string[];
  hooks: string[];
  utils: string[];
  services: string[];
  stateManagement?: StateManagement;
  apiIntegration?: ApiIntegration;
  validation?: string[];
  uxStates?: string[];
  routing?: string[];
  errorHandling?: string[];
  frontendTasks?: FrontendTask[];
}

export interface TestingTask {
  id: string;
  title: string;
  description: string;
}

export interface ApiTestScenario {
  name: string;
  steps: string[];
  expectedResponse: string;
  expectedStatus: number;
}

export interface ApiEndpointTests {
  endpoint: string;
  scenarios: ApiTestScenario[];
}

export interface UiTestScenario {
  name: string;
  steps: string[];
  expectedBehavior: string;
}

export interface UiScreenTests {
  screen: string;
  scenarios: UiTestScenario[];
}

export interface BackendTestingPlan {
  testScenarios: string[];
  apiTestCases: ApiEndpointTests[];
  databaseTesting: string[];
  businessLogicTesting: string[];
  paginationQueryTesting: string[];
  performanceTesting: string[];
  securityTesting: string[];
  errorHandlingTesting: string[];
  tasks: TestingTask[];
}

export interface FrontendTestingPlan {
  testScenarios: string[];
  uiTestCases: UiScreenTests[];
  validationTesting: string[];
  uxStateTesting: string[];
  apiIntegrationTesting: string[];
  routingNavigationTesting: string[];
  crossBrowserTesting: string[];
  edgeCases: string[];
  tasks: TestingTask[];
}

export interface TestingPlan {
  backend: BackendTestingPlan;
  frontend: FrontendTestingPlan;
}

export interface DevPlan {
  workflow:  WorkflowStep[];
  backend:   BackendPlan;
  frontend:  FrontendPlan;
  testing:   TestingPlan;
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
