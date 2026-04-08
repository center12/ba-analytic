# Module: auth
**Purpose**: Authenticates users with JWT, enforces route protection, and seeds the initial admin account.

## Scope
- In: login endpoint, password hashing, JWT validation strategies/guards, admin bootstrap seeding
- Out: user persistence to Prisma `User`, global guard wiring in application bootstrap

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `User` | `id`, `username` (unique), `passwordHash` | Postgres |

**Relationships**: `User` is referenced by JWT payload (`sub`) for auth checks.

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| POST | `/api/auth/login` | body: `username`, `password(min 6)` | `{ accessToken: string }` | `401 Invalid username or password` |

## Core Flows (top 3)
### Login and token issue
1. Validate login DTO.
2. Load user by username from Prisma.
3. Compare bcrypt hash; throw `UnauthorizedException` on mismatch.
4. Sign JWT `{ sub, username }` and return `accessToken`.

### JWT request guard
1. Global `JwtAuthGuard` checks `isPublic` metadata.
2. If public, bypass auth; else use Passport `jwt` strategy.
3. Strategy verifies signature/expiry and resolves user by `payload.sub`.
4. Throw `UnauthorizedException` when token invalid or user missing.

### Admin bootstrap seeding
1. Read `ADMIN_USERNAME`/`ADMIN_PASSWORD` from config on app bootstrap.
2. Skip when env vars missing or username already exists.
3. Hash password via `AuthService.hashPassword`.
4. Create admin user in Prisma.

## Constraints
- `LoginDto.password` minimum length is 6.
- JWT secret key from `JWT_SECRET`, expiry fixed at `7d`.
- Bcrypt cost factor fixed at `10`.
- SSE auth uses query token (`?token=`) and rejects missing/invalid token with `401`.

## Dependencies
- Depends on: `PrismaService`, `JwtModule`, `PassportModule`, `ConfigModule`, `Reflector`
- Used by: `UserModule` (password hashing), global app guard (`JwtAuthGuard`), `ChatModule` (`SseJwtAuthGuard`)
