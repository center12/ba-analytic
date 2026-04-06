# Module: user
**Purpose**: Creates and lists application users, delegating password hashing to AuthService.

## API Routes
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/users` | `create` | Create a new user (username + hashed password) |
| GET | `/api/users` | `findAll` | List all users (no passwordHash in response) |

## Service Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `(dto: CreateUserDto) => Promise<SafeUser>` | Check uniqueness, hash password, persist user |
| `findAll` | `() => Promise<SafeUser[]>` | Return all users excluding passwordHash |

## DTOs
| Class | Fields |
|-------|--------|
| `CreateUserDto` | `username: string (3–30, lowercase/numbers/underscores)`, `password: string (min 6)` |

## NestJS Dependencies
- Imports: `AuthModule` (for `AuthService.hashPassword`), `PrismaService`
- Guards: `JwtAuthGuard` (inherited globally)
