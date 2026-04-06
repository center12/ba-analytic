# Module: auth
**Purpose**: Handles JWT-based authentication, password hashing, and admin account seeding.

## API Routes
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/auth/login` | `login` | Validate credentials and return a JWT access token (public route) |

## Service Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| `login` | `(dto: LoginDto) => Promise<{ accessToken: string }>` | Verify username/password, sign JWT |
| `hashPassword` | `(plain: string) => Promise<string>` | Bcrypt hash — used by UserService and AdminSeeder |

## DTOs
| Class | Fields |
|-------|--------|
| `LoginDto` | `username: string`, `password: string (min 6)` |

## Constants
| Name | Value |
|------|-------|
| `JWT_SECRET_KEY` | `'JWT_SECRET'` (env var name) |
| `JWT_EXPIRES_IN` | `'7d'` |
| `BCRYPT_ROUNDS` | `10` |

## Extra Files
| File | Responsibility |
|------|----------------|
| `jwt.strategy.ts` | Passport JWT strategy — extracts `sub`/`username` from Bearer token |
| `jwt-auth.guard.ts` | Global guard; skips routes decorated with `@Public()` |
| `guards/sse-jwt-auth.guard.ts` | Validates JWT from `?token=` query param (for SSE routes) |
| `decorators/public.decorator.ts` | `@Public()` — sets `isPublic` metadata to bypass `JwtAuthGuard` |
| `admin.seeder.ts` | `OnApplicationBootstrap` hook — creates admin from `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars |

## NestJS Dependencies
- Imports: `JwtModule`, `PassportModule`, `ConfigModule`, `PrismaService`
- Guards: `JwtAuthGuard` registered globally in `main.ts`
