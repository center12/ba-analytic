# Feature: Project

## Purpose
- Manage projects and work inside a project workspace for overview docs, feature documents, SSR extraction, and pipeline defaults.

## User Flow
1. Open `/projects` to create, browse, or delete projects.
2. Open `/projects/:projectId` to use the workspace sidebar and center pane.
3. Select `Overview` to edit overview markdown and project pipeline config.
4. Create a `FEATURE` or `SSR`, select it from the sidebar, then edit, upload screenshots, relate features, save, or publish.
5. For SSR items, extract child features and resolve out-of-sync children after republishes.

## Screens
### ProjectsPage
- Elements: project list, create form, feedback/users/logout actions

### ProjectDetailPage
- Elements: workspace header, `ProjectWorkspaceSidebar`, overview pane, feature pane, create/delete dialogs, SSR extract dialog, SSR sync dialog

## Components
- `ProjectsPage` — project list and project CRUD entrypoint
- `ProjectDetailPage` — URL-driven workspace using `?view=overview` or `?feature=<id>`
- `ProjectOverview` — overview markdown editor and preview
- `ProjectWorkspaceSidebar` — overview plus feature navigation
- `FeatureContentEditor` — markdown editor, screenshots, related features, publish, and Step 1 extraction
- `PipelineConfigEditor`, `SSRExtractModal`, `SSRSyncWarningDialog` — project AI config and SSR child-feature workflows

## State
### Local:
- `ProjectsPage` — `name`, `description`, `showForm`
- `ProjectDetailPage` — `name`, `description`, `featureType`, `showForm`, `mobileMenuOpen`, `ssrExtractFeatureId`, `ssrSyncWarningId`, `featureToDelete`
- `FeatureContentEditor` — `content`, `featureType`, `relatedIds`, `lightboxIndex`

### Global (store):
- `activeProvider`, `activeModel` — `useAppStore`
- `user`, `logout`, `isAuthenticated` — `useAuthStore`

## API
### `/projects`, `/projects/:id`, `/projects/:projectId/features`, `/projects/features/:featureId` — project and feature CRUD
- Behavior: invalidates project/feature queries, keeps workspace selection, and navigates new features to `?feature=<id>`

### `/projects/:projectId/pipeline-config`, `/projects/features/:featureId/publish`, `/feature-analysis/*` SSR endpoints
- Behavior: saves per-step defaults, publishes feature versions, extracts SSR children, and resolves sync warnings

## Routing
- `/projects` -> project list
- `/projects/:projectId?view=overview` -> workspace overview
- `/projects/:projectId?feature=<featureId>` -> selected feature editor
- Guard: authenticated via `ProtectedRoute`

## Edge Cases
- Invalid or deleted `feature` query params fall back to overview
- SSR-only actions appear only for SSR features
- Feature-editor local draft state resets when the selected feature changes
