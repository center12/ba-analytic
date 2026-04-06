# Feature: auth
**Purpose**: Provides login/logout functionality and JWT token management for authenticating users.

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|
| `LoginPage.tsx` | `LoginPage` | Full-page login form that authenticates and redirects to `/projects` |

## Components
| File | Purpose |
|------|---------|
| `components/LoginForm.tsx` | Controlled form with username/password fields and error display |

## Types
```ts
export interface AuthUser { id: string; username: string; }
export interface LoginCredentials { username: string; password: string; }
export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}
```

## Exported Helpers
| Function | Signature |
|----------|-----------|
| `getStoredToken` | `() => string \| null` |
| `setStoredToken` | `(token: string) => void` |
| `removeStoredToken` | `() => void` |
| `decodeTokenPayload` | `(token: string) => { sub: string; username: string } \| null` |

## Constants
| Name | Value / Notes |
|------|---------------|
| `TOKEN_STORAGE_KEY` | `'ba_auth_token'` — localStorage key for JWT |

## Dependencies
- **API calls**: `api.auth.login` (via `auth.store.ts`)
- **State**: `useAuthStore` — `login`, `logout`, `user`, `isAuthenticated`
