import { create } from 'zustand';
import { api } from '@/lib/api';
import type { AuthState } from '@/features/auth/types/auth.types';
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  decodeTokenPayload,
} from '@/features/auth/helpers/auth.helpers';

function hydrateFromToken(token: string | null) {
  if (!token) return { user: null, isAuthenticated: false };
  const payload = decodeTokenPayload(token);
  if (!payload) return { user: null, isAuthenticated: false };
  return {
    user: { id: payload.sub, username: payload.username },
    isAuthenticated: true,
  };
}

const initialToken = getStoredToken();
const initialState = hydrateFromToken(initialToken);

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  ...initialState,

  login: async (credentials) => {
    const { accessToken } = await api.auth.login(credentials);
    const payload = decodeTokenPayload(accessToken);
    setStoredToken(accessToken);
    set({
      token: accessToken,
      user: payload ? { id: payload.sub, username: payload.username } : null,
      isAuthenticated: true,
    });
  },

  logout: () => {
    removeStoredToken();
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
