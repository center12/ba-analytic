# Feature: user
**Purpose**: Admin interface for creating and listing application users.

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|
| `UserManagementPage.tsx` | `UserManagementPage` | Page that composes user creation form and user list |

## Components
| File | Purpose |
|------|---------|
| `components/CreateUserForm.tsx` | Togglable form to create a new user via API |
| `components/UserList.tsx` | Fetches and renders all users as cards |

## TanStack Query Keys
- `['users']`

## Dependencies
- **API calls**: `api.users.create`, `api.users.list`
