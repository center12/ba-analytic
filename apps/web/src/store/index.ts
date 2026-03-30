import { create } from 'zustand';
import type { Project, Feature, ChatSession } from '@/lib/api';

interface AppState {
  selectedProject: Project | null;
  selectedFeature: Feature | null;
  selectedChatSession: ChatSession | null;
  activeProvider: 'gemini' | 'claude' | 'openai';
  activeModel: string | undefined;

  setSelectedProject: (project: Project | null) => void;
  setSelectedFeature: (feature: Feature | null) => void;
  setSelectedChatSession: (session: ChatSession | null) => void;
  setActiveProvider: (provider: 'gemini' | 'claude' | 'openai') => void;
  setActiveModel: (model: string | undefined) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedProject: null,
  selectedFeature: null,
  selectedChatSession: null,
  activeProvider: 'openai',
  activeModel: undefined,

  setSelectedProject: (project) =>
    set({ selectedProject: project, selectedFeature: null, selectedChatSession: null }),
  setSelectedFeature: (feature) =>
    set({ selectedFeature: feature, selectedChatSession: null }),
  setSelectedChatSession: (session) => set({ selectedChatSession: session }),
  setActiveProvider: (provider) => set({ activeProvider: provider, activeModel: undefined }),
  setActiveModel: (model) => set({ activeModel: model }),
}));
