# Feature: User

## Purpose
- Provide admin UI to create users and browse existing user accounts.

---

## User Flow
1. Open `/users` from project screen.
2. Create a user with username/password in `CreateUserForm`.
3. Refresh and display user list from API.

---

## Screens
### UserManagementPage
- Elements:
  - Back button to projects page
  - `CreateUserForm`
  - `UserList`

---

## Components
- `UserManagementPage` — page composition and navigation shell.
- `CreateUserForm` — toggled create form with validation-friendly hints and mutation handling.
- `UserList` — query-backed user list cards with loading/empty states.

---

## API
### GET `/users` — list users
### POST `/users` — create user

---

## UX States
- Loading: user list shows loading text while query runs.
- Error: create mutation error is shown inline in form.
- Empty: list shows "No users yet." when no data.
- Success: create invalidates `['users']` and resets form.

---

## Routing
- `/users` -> `UserManagementPage`

---

## Dependencies
- Query key: `['users']`
- API: `api.users.list`, `api.users.create`
