# Module: user
**Purpose**: Manages application users with secure password hashing and safe read responses.

## Scope
- In: create/list users, username uniqueness checks, safe user projection without password hash
- Out: password hashing delegated to `AuthService`, authentication delegated to global auth guard

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `User` | `id`, `username` (unique), `passwordHash`, `createdAt`, `updatedAt` | Postgres |

**Relationships**: currently standalone; no foreign-key relations in this module.

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| POST | `/api/users` | body: `username(3-30, [a-z0-9_])`, `password(min 6)` | safe user `{id, username, createdAt, updatedAt}` | `409 Username already taken`, `401/403` auth failures |
| GET | `/api/users` | none | safe user array | `401/403` auth failures |

## Core Flows (top 3)
### Create user
1. Validate `CreateUserDto` constraints.
2. Check existing user by username.
3. Throw `ConflictException` when username exists.
4. Hash password via `AuthService.hashPassword`.
5. Create user and return safe selected fields only.

### List users
1. Query Prisma for all users.
2. Apply fixed `SELECT_SAFE` projection.
3. Return list without `passwordHash`.

### Auth enforcement
1. Controller uses `JwtAuthGuard` (and app has global guard).
2. Request must include valid bearer token.
3. Unauthorized requests are rejected before service logic.

## Constraints
- Username regex: `^[a-z0-9_]+$`; length 3-30.
- Password minimum length: 6.
- Duplicate usernames are rejected with `409`.
- Password hashes are never exposed in API output.

## Dependencies
- Depends on: `PrismaService`, `AuthService` (from `AuthModule`), `JwtAuthGuard`
- Used by: admin/user management UI and any authenticated user listing flows
