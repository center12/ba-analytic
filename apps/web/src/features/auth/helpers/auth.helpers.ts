import { TOKEN_STORAGE_KEY } from '../constants/auth.constants';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function decodeTokenPayload(
  token: string,
): { sub: string; username: string } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}
