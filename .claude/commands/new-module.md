Scaffold a new NestJS backend module with boilerplate controller, service, and module files.

## Arguments
$ARGUMENTS must be a module name in kebab-case (e.g. `user`, `dev-task`, `test-case`).

If $ARGUMENTS is empty, ask the user for the module name before proceeding.

## Step 1 — Validate

- Module name: `$ARGUMENTS`
- Target root: `src/modules/$ARGUMENTS/`

Check if `src/modules/$ARGUMENTS/` already exists. If it does, stop and inform the user.

Detect the backend root by looking for `src/modules/` relative to the current working directory.
Common locations: `src/modules/`, `apps/api/src/modules/`. Use whichever exists.

Convert `$ARGUMENTS` to PascalCase for class names (e.g. `dev-task` → `DevTask`).
Use `$PascalName` below to mean this PascalCase form.

## Step 2 — Create folder structure and files

Create the following:

```
src/modules/$ARGUMENTS/
  dto/
    create-$ARGUMENTS.dto.ts
    update-$ARGUMENTS.dto.ts
  constants/
    $ARGUMENTS.constants.ts
  helpers/
    $ARGUMENTS.helpers.ts
  $ARGUMENTS.controller.ts
  $ARGUMENTS.service.ts
  $ARGUMENTS.module.ts
```

### Content for `$ARGUMENTS.module.ts`
```ts
import { Module } from '@nestjs/common'
import { $PascalNameController } from './$ARGUMENTS.controller'
import { $PascalNameService } from './$ARGUMENTS.service'
import { PrismaService } from '../../prisma/prisma.service'

@Module({
  controllers: [$PascalNameController],
  providers: [$PascalNameService, PrismaService],
  exports: [$PascalNameService],
})
export class $PascalNameModule {}
```

### Content for `$ARGUMENTS.service.ts`
```ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Create$PascalNameDto } from './dto/create-$ARGUMENTS.dto'
import { Update$PascalNameDto } from './dto/update-$ARGUMENTS.dto'

@Injectable()
export class $PascalNameService {
  private readonly logger = new Logger($PascalNameService.name)

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    this.logger.debug('findAll: called')
    // TODO: implement
    return []
  }

  async findOne(id: string) {
    this.logger.debug(`findOne: id=${id}`)
    // TODO: implement
    const item = null
    if (!item) {
      this.logger.warn(`findOne: not found id=${id}`)
      throw new NotFoundException(`$PascalName ${id} not found`)
    }
    return item
  }

  async create(dto: Create$PascalNameDto) {
    this.logger.debug(`create: called`, dto)
    try {
      // TODO: implement
      this.logger.log(`create: success`)
    } catch (err) {
      this.logger.error(`create: failed`, err instanceof Error ? err.stack : err)
      throw err
    }
  }

  async update(id: string, dto: Update$PascalNameDto) {
    this.logger.debug(`update: id=${id}`, dto)
    try {
      // TODO: implement
      this.logger.log(`update: success id=${id}`)
    } catch (err) {
      this.logger.error(`update: failed id=${id}`, err instanceof Error ? err.stack : err)
      throw err
    }
  }

  async remove(id: string) {
    this.logger.debug(`remove: id=${id}`)
    try {
      // TODO: implement
      this.logger.log(`remove: success id=${id}`)
    } catch (err) {
      this.logger.error(`remove: failed id=${id}`, err instanceof Error ? err.stack : err)
      throw err
    }
  }
}
```

### Content for `$ARGUMENTS.controller.ts`
```ts
import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common'
import { $PascalNameService } from './$ARGUMENTS.service'
import { Create$PascalNameDto } from './dto/create-$ARGUMENTS.dto'
import { Update$PascalNameDto } from './dto/update-$ARGUMENTS.dto'

@Controller('$ARGUMENTS')
export class $PascalNameController {
  constructor(private readonly $camelNameService: $PascalNameService) {}

  @Get()
  findAll() {
    return this.$camelNameService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.$camelNameService.findOne(id)
  }

  @Post()
  create(@Body() dto: Create$PascalNameDto) {
    return this.$camelNameService.create(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Update$PascalNameDto) {
    return this.$camelNameService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.$camelNameService.remove(id)
  }
}
```
(Replace `$camelNameService` with camelCase of the service, e.g. `devTaskService`)

### Content for `dto/create-$ARGUMENTS.dto.ts`
```ts
import { IsString, IsNotEmpty } from 'class-validator'

export class Create$PascalNameDto {
  @IsString()
  @IsNotEmpty()
  // TODO: add fields
}
```

### Content for `dto/update-$ARGUMENTS.dto.ts`
```ts
import { PartialType } from '@nestjs/mapped-types'
import { Create$PascalNameDto } from './create-$ARGUMENTS.dto'

export class Update$PascalNameDto extends PartialType(Create$PascalNameDto) {}
```

### Content for `constants/$ARGUMENTS.constants.ts`
```ts
// Constants for the $ARGUMENTS module

```

### Content for `helpers/$ARGUMENTS.helpers.ts`
```ts
// Helpers for the $ARGUMENTS module

```

## Step 3 — Extract module docs

Run the `extract-modules` command with `$ARGUMENTS` as the argument to generate the initial doc for the new module.

Wait for completion. Note the path of the doc file written (e.g. `docs/modules/$ARGUMENTS.md`).

## Step 4 — Print summary

After all files and docs are created, output:

```
Module scaffolded: src/modules/$ARGUMENTS/

Files created:
  $ARGUMENTS.module.ts
  $ARGUMENTS.controller.ts
  $ARGUMENTS.service.ts
  dto/create-$ARGUMENTS.dto.ts
  dto/update-$ARGUMENTS.dto.ts
  constants/$ARGUMENTS.constants.ts
  helpers/$ARGUMENTS.helpers.ts

Docs generated:
  docs/modules/$ARGUMENTS.md

Next steps:
  1. Add $PascalNameModule to the imports array in app.module.ts
  2. Add your Prisma model to schema.prisma and run pnpm db:migrate
  3. Fill in the service methods with actual Prisma queries
  4. Add DTO fields and class-validator decorators
  5. Run /sync-docs any time to keep docs up to date
```
