---
name: sync-docs
description: Documentation sync agent. Re-extracts frontend feature docs and backend module docs into docs/. Optionally schedules a cron-based remote trigger to keep docs automatically in sync. Supported intervals: 1h, 6h, daily, weekly.
---

Sync project documentation by re-running feature and module extraction.

## Arguments
$ARGUMENTS options:
- Empty → run extraction once now
- `--cron <interval>` → schedule automatic sync (intervals: `1h`, `6h`, `daily`, `weekly`)
- `--list` → list existing scheduled syncs
- `--cancel <id>` → cancel a scheduled sync by cron ID

## Step 1 — Parse Arguments

Check $ARGUMENTS:
- If empty → proceed to **Run Now** (Step 2)
- If starts with `--cron` → extract interval, proceed to **Schedule** (Step 3)
- If `--list` → proceed to **List Schedules** (Step 4)
- If `--cancel <id>` → proceed to **Cancel Schedule** (Step 5)

## Step 2 — Run Now

Extract docs for the current project.

### 2a — Extract frontend features

Run the `extract-features` command with no arguments (extracts all features).

Wait for completion. Note the list of files written.

### 2b — Extract backend modules

Run the `extract-modules` command with no arguments (extracts all modules).

Wait for completion. Note the list of files written.

### 2c — Print summary

```
Docs synced successfully.

Frontend docs updated:
  docs/features/<name>.md
  ...

Backend docs updated:
  docs/modules/<name>.md
  ...

docs/INDEX.md updated.

Total: <N> files written.
Tip: Run /sync-docs --cron daily to keep docs in sync automatically.
```

## Step 3 — Schedule Automatic Sync

Map the interval to a cron expression:
| Interval | Cron expression |
|----------|----------------|
| `1h`     | `0 * * * *`    |
| `6h`     | `0 */6 * * *`  |
| `daily`  | `0 9 * * *`    |
| `weekly` | `0 9 * * 1`    |

Use `CronCreate` to create a scheduled remote trigger with:
- Cron expression from table above
- Prompt: "Run /extract-features then /extract-modules to sync project documentation."

After creating, print:

```
Scheduled sync created.

ID:       <cron-id>
Schedule: <interval> (<cron expression>)
Next run: <next scheduled time>

The agent will automatically re-extract docs on this schedule.

Manage:
  /sync-docs --list           → view all scheduled syncs
  /sync-docs --cancel <id>    → cancel this sync
```

## Step 4 — List Schedules

Use `CronList` to list all existing scheduled triggers.

Filter for triggers whose prompt contains "extract-features" or "sync" or "docs".

Print:

```
Scheduled doc syncs:

| ID | Schedule | Next Run | Status |
|----|----------|----------|--------|
| <id> | daily (0 9 * * *) | <date> | active |

Run /sync-docs --cancel <id> to remove a schedule.
```

If none found, print: "No scheduled doc syncs found. Run `/sync-docs --cron daily` to create one."

## Step 5 — Cancel Schedule

Use `CronDelete` with the ID from $ARGUMENTS.

Print:

```
Scheduled sync <id> cancelled.
Docs will no longer be updated automatically.
Run /sync-docs --cron <interval> to reschedule.
```
