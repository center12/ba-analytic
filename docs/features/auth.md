# Feature: Auth

## Purpose
- Authenticate users with username/password and persist JWT-based session state.

---

## User Flow
1. Open `/login` and enter username/password.
2. Submit credentials to login API via auth store.
3. On success, persist token and navigate to `/projects`; on failure, show inline error.

---

## Screens
### LoginPage
- Elements:
  - Product heading and sign-in subtitle
  - `LoginForm` with loading and error states

---

## Components
- `LoginPage` — orchestrates login submit, loading/error handling, and redirect.
- `LoginForm` — controlled username/password form with submit button.

---

## State
- Local: `isLoading`, `error`, `username`, `password`
- Global (store): `token`, `user`, `isAuthenticated`, `login`, `logout` via `useAuthStore`

---

## Types
- `AuthUser`, `LoginCredentials`, `AuthState`

---

## API
### POST `/auth/login` — authenticate and return access token

---

## UX States
- Loading: submit button switches to signing-in state.
- Error: failed login shows message under fields.
- Success: token stored and route redirects to projects page.

---

## Routing
- `/login` -> `LoginPage`

---

## Dependencies
- API: `api.auth.login`
- Helpers: `getStoredToken`, `setStoredToken`, `removeStoredToken`, `decodeTokenPayload`
- Constants: `TOKEN_STORAGE_KEY`
