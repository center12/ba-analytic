# Feature: Project

## Purpose
- Manage projects and their features (FEATURE and SSR types), edit feature content/screenshots, and configure per-step AI pipeline defaults.

---

## User Flow
1. View all projects on `/projects`; create or delete projects.
2. Navigate into a project; create features of type `FEATURE` or `SSR Document`.
3. Expand a feature row to edit its content in `FeatureContentEditor` (inline markdown editor + screenshot upload).
4. Click **Publish** to snapshot content, bump version, and trigger AI pipeline re-run; view version history via `FeatureChangelogPanel`.
5. For SSR features, after publish the `SSRSyncWarningDialog` appears listing OUT_OF_SYNC extracted children; resolve each via update/keep/remove.
6. For SSR features, use `SSRExtractModal` to AI-extract sub-features from the SSR document.
7. Edit the project overview via `ProjectOverview` (inline markdown editor).
8. Configure per-step AI provider/model defaults via `PipelineConfigEditor`.
9. Click a feature name to navigate to the feature detail (pipeline) page.

---

## Screens
### ProjectsPage
- Elements:
  - Project list with feature counts
  - New project form toggle (name + description)
  - Navigation buttons: Feedback list, User management, logout

### ProjectDetailPage
- Elements:
  - Project name/description header with `AppFeedbackDialog`
  - `ProjectOverview` — editable project overview with markdown preview
  - Pipeline AI Configuration collapsible (`PipelineConfigEditor`)
  - New Feature form: type toggle (`FEATURE` / `SSR`), name, description
  - Feature list with type badges (`FEA-xxx` / `SSR-xxx` codes), screenshot/analysis counts
  - Per-feature expand: `FeatureContentEditor` with save/upload/preview, Publish button, related features multi-select, Layer 1 rule/story counts badge, `FeatureChangelogPanel`
  - Per-SSR-feature: "Extract Sub-Features" button → `SSRExtractModal`
  - Delete confirmation dialog
  - `SSRSyncWarningDialog` — shown automatically after publishing an SSR feature that has OUT_OF_SYNC extracted children

---

## Components
- `ProjectsPage` — top-level project CRUD list and auth shortcuts
- `ProjectDetailPage` — feature CRUD, content editing, pipeline config, and SSR sync resolution within one project
- `ProjectOverview` — edit/preview project `overview` markdown field; template provided
- `FeatureContentEditor` — inline content editor with markdown preview, screenshot upload/delete, related feature multi-select, Publish button, Layer 1 rule/story count badge, and `FeatureChangelogPanel`
- `FeatureChangelogPanel` — lazy-loaded collapsible showing all publish versions with AI-generated diff summaries
- `SSRExtractModal` — AI-powered extraction of sub-features from an SSR document; shows extracted user stories and creates new FEATURE records on confirmation
- `SSRSyncWarningDialog` — modal listing OUT_OF_SYNC extracted features after an SSR publish; supports per-feature update/keep/remove resolution
- `PipelineConfigEditor` — edit/save per-step (1–5) provider-model overrides for the project
- `ImageLightbox` — full-screen viewer for uploaded screenshots

---

## State
### Local (ProjectDetailPage):
- `name`, `description`, `featureType` — new feature form fields
- `showForm` — toggle new feature form
- `expandedFeatureId` — which feature row is expanded (shows `FeatureContentEditor`)
- `ssrExtractFeatureId` — which SSR feature has the extract modal open
- `ssrSyncWarningId` — SSR feature ID whose sync warnings dialog is open (set by `onPublish` callback)
- `featureToDelete` — feature pending delete confirmation

---

## Types
- `FeatureType` — `'FEATURE' | 'SSR'`

---

## API
### GET `/projects` — list projects (query key: `['projects']`)
### POST `/projects` — create project
### DELETE `/projects/:id` — delete project
### GET `/projects/:id` — load project detail (query key: `['projects', projectId]`)
### PUT `/projects/:id` — update project overview
### GET `/projects/:projectId/features` — list features (query key: `['features', projectId]`)
### POST `/projects/:projectId/features` — create feature (`name`, `description`, `featureType`)
### PUT `/projects/features/:featureId` — update feature content/name/relatedFeatureIds
### DELETE `/projects/features/:featureId` — delete feature
### POST `/projects/features/:featureId/upload/screenshot` — upload screenshot
### DELETE `/projects/features/:featureId/screenshots/:screenshotId` — delete screenshot
### GET `/projects/:projectId/pipeline-config` — load step configs (query key: `['project-pipeline-config', projectId]`)
### PUT `/projects/:projectId/pipeline-config` — upsert step configs
### DELETE `/projects/:projectId/pipeline-config/:step` — remove step override
### POST `/projects/features/:featureId/publish` — publish feature content (bumps version, triggers AI pipeline Step 1, fires async changelog diff)
### GET `/projects/features/:featureId/changelog` — fetch publish history (query key: `['feature-changelog', featureId]`)
### GET `/ai/providers` — load available providers (query key: `['ai-providers']`)
### POST `/feature-analysis/feature/:featureId/extract-sub-features` — AI-extract sub-features from SSR content
### GET `/feature-analysis/ssr/:ssrId/sync-warnings` — list OUT_OF_SYNC extracted features (query key: `['ssr-sync-warnings', ssrId]`)
### POST `/feature-analysis/feature/:featureId/sync/update` — re-sync from parent SSR → IN_SYNC
### POST `/feature-analysis/feature/:featureId/sync/keep` — mark DIVERGED, preserve content
### DELETE `/feature-analysis/feature/:featureId/sync/remove` — delete extracted feature

---

## UX States
- Loading: project/feature lists show loading state
- Empty: no features message in project detail
- Success: mutations invalidate relevant queries; forms reset and close
- Error: destructive toasts on mutation failures

---

## Routing
- `/projects` → ProjectsPage
- `/projects/:projectId` → ProjectDetailPage
- Guard: authenticated (ProtectedRoute)

---

## Edge Cases
- Feature codes auto-generated by backend: `FEA-001` for FEATURE type, `SSR-001` for SSR type
- SSR features show an "Extract Sub-Features" Sparkles button that is absent on FEATURE-type rows
- `FeatureContentEditor` shows SSR/FEATURE document templates with a "copy conversion prompt" button
- Publishing a PUBLISHED feature with unchanged content still bumps version and creates changelog entry
- `FeatureChangelogPanel` lazy-loads (only fetches when opened via "View version history" link)
- `SSRSyncWarningDialog` skips features already resolved (DIVERGED); defaults all new warnings to "update" action
- Sync hook `useSSRSyncWarnings` sets `staleTime: 0` to always re-fetch after Step 1 re-runs

---

## Dependencies
- API: `api.projects`, `api.features`, `api.ai.getProviders`, `api.featureAnalysis`
- Store: `useAuthStore` (`user`, `logout`), `useAppStore` (provider/model for SSR extraction)
- Hooks: `useSSRSyncWarnings`, `useFeatureSyncStatus`, `useSyncFeatureUpdate`, `useDivergeFeature`, `useRemoveFeature` (from `hooks/use-feature-sync.ts`)
