---
name: backend-module
description: Guides backend NestJS development by scanning for reusable services, guards, middleware, helpers, and providers before creating new files. Enforces module folder structure and kebab-case naming conventions. Triggered when creating modules, services, controllers, DTOs, guards, middleware, or decorators.
---

## When This Skill Applies

Any time you are about to create or modify a backend file — NestJS module, service, controller, DTO, guard, middleware, decorator, helper, or constant.

---

## Rule 1: Scan Before Creating

Before writing any new file, search for existing code that can be reused or imported.

### What to scan

**Shared providers (always check first):**
- `PrismaService` — declared locally per module; do NOT create a new one, just add it to the module's `providers` array
- `src/modules/auth/guards/` — `JwtAuthGuard`, `SseJwtAuthGuard`, `@Public()` decorator
- `src/modules/auth/decorators/` — custom decorators
- `src/modules/storage/` — `IStorageProvider`, `LocalStorageAdapter`
- `src/modules/ai/` — `AIProviderFactory`, `AIProvider`

**Per-module locations:**
- `src/modules/*/helpers/` — existing helper functions
- `src/modules/*/constants/` — existing constants
- `src/modules/*/guards/` — module-specific guards
- `src/modules/*/dto/` — existing DTOs (check before creating a duplicate)

### Decision logic

| Situation | Action |
|-----------|--------|
| Existing guard/service/helper covers the need | Import it via module `imports` or inject via constructor |
| Existing DTO partially matches | Extend it with `PartialType` or `IntersectionType` |
| Nothing suitable exists | Create a new file following Rule 2 |

---

## Rule 2: Follow the Module Folder Structure

```
src/modules/<module-name>/
  dto/                           # Request/response DTOs
  constants/                     # Module constants and enums
  helpers/                       # Pure helper/transform functions
  guards/                        # (optional) module-specific guards
  decorators/                    # (optional) custom decorators
  providers/                     # (optional) custom providers/adapters
  <module-name>.controller.ts    # HTTP endpoints
  <module-name>.service.ts       # Business logic
  <module-name>.module.ts        # NestJS module definition
```

---

## Rule 3: Naming Conventions

| File type | Pattern | Example |
|-----------|---------|---------|
| Module | `<domain>.module.ts` | `user.module.ts` |
| Controller | `<domain>.controller.ts` | `user.controller.ts` |
| Service | `<domain>.service.ts` | `user.service.ts` |
| Create DTO | `create-<domain>.dto.ts` | `create-user.dto.ts` |
| Update DTO | `update-<domain>.dto.ts` | `update-user.dto.ts` |
| Constants | `<domain>.constants.ts` | `user.constants.ts` |
| Helpers | `<domain>.helpers.ts` | `user.helpers.ts` |
| Guard | `<domain>.guard.ts` | `jwt-auth.guard.ts` |
| Decorator | `<domain>.decorator.ts` | `current-user.decorator.ts` |

**Class naming**: PascalCase — `UserService`, `CreateUserDto`, `JwtAuthGuard`

**Do not** create root-level `constants.ts`, `utils.ts`, or `helpers.ts` — always place inside the `constants/` or `helpers/` subdirectory with a domain-scoped filename.

---

## Rule 4: Module Registration

When creating a new module:
1. Add `PrismaService` to `providers` if DB access is needed
2. Import `AuthModule` if you need `JwtAuthGuard` or `AuthService`
3. Register the new module in `app.module.ts` `imports` array
4. Export services that other modules will need

---

## Rule 5: DTO Patterns

- Use `class-validator` decorators (`@IsString()`, `@IsNotEmpty()`, etc.)
- Update DTOs extend create DTOs via `PartialType(CreateXxxDto)`
- Use `@ApiProperty()` if Swagger is configured
- Keep DTOs flat — no nested logic

---

## Rule 6: Logging

Use NestJS `Logger` for structured, debuggable logs — never `console.log`.

### Setup

Declare a logger per class:

```ts
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)
  // ...
}
```

### What to log

| Level | When to use |
|-------|-------------|
| `this.logger.log()` | Successful operations (created, updated, deleted) |
| `this.logger.debug()` | Entry into a method, input params for tracing |
| `this.logger.warn()` | Expected but notable conditions (not found, skipped) |
| `this.logger.error()` | Caught exceptions and unexpected failures |

### Pattern

```ts
async create(dto: CreateUserDto) {
  this.logger.debug(`create: called with dto=${JSON.stringify(dto)}`)
  try {
    const user = await this.prisma.user.create({ data: dto })
    this.logger.log(`create: user created id=${user.id}`)
    return user
  } catch (err) {
    this.logger.error(`create: failed`, err instanceof Error ? err.stack : err)
    throw err
  }
}

async findOne(id: string) {
  this.logger.debug(`findOne: id=${id}`)
  const user = await this.prisma.user.findUnique({ where: { id } })
  if (!user) {
    this.logger.warn(`findOne: not found id=${id}`)
    throw new NotFoundException(`User ${id} not found`)
  }
  return user
}
```

### Rules
- Every service must declare `private readonly logger = new Logger(ClassName.name)`
- Log method entry at `debug` level with key input params
- Log successful mutations at `log` level with the resulting ID
- Log all caught errors at `error` level with the stack trace
- Do not log sensitive data (passwords, tokens, PII)
- Controllers do not log — delegate to the service layer

---

## Rule 7: Auth Conventions

- `JwtAuthGuard` is applied **globally** — all routes are protected by default
- Use `@Public()` decorator to opt a route out of auth
- For SSE routes, use `SseJwtAuthGuard` (reads token from `?token=` query param)
- Import `AuthModule` to access `JwtAuthGuard` and `AuthService`

---

## Checklist Before Creating Any File

- [ ] Searched `src/modules/*/` for existing similar services, guards, helpers
- [ ] Checked if `PrismaService`, `JwtAuthGuard`, or other shared providers apply
- [ ] Confirmed nothing reusable exists before creating a new file
- [ ] Used correct kebab-case file naming
- [ ] Placed files in correct subdirectory (`dto/`, `constants/`, `helpers/`)
- [ ] Registered module in `app.module.ts` (for new modules)
- [ ] Added `private readonly logger = new Logger(ClassName.name)` to every service
- [ ] Logged method entry (`debug`), success (`log`), not-found (`warn`), and errors (`error`)
