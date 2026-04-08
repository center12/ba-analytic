# Global Frontend Shared Code

## Purpose
- Shared utilities, components, hooks, services, and stores used across two or more features.

---

## Components
- `ProtectedRoute` (`components/ProtectedRoute.tsx`) — guards private routes and redirects unauthenticated users to `/login`.
- `Toaster` (`components/ui/toaster.tsx`) — renders global toast notifications from shared toast state.

---

## Hooks
- `useToastState` (`hooks/use-toast.ts`) — local toast queue state with dismiss function for toaster rendering.
- `toast` (`hooks/use-toast.ts`) — global helper to enqueue auto-dismiss toasts.

---

## Services
- `api` (`lib/api.ts`) — typed HTTP client wrappers for auth, users, projects, features, test-cases, chat, ai, and dev-tasks.

---

## Stores
- `useAppStore` (`store/index.ts`) — fields: `selectedProject`, `selectedFeature`, `selectedChatSession`, `activeProvider`, `activeModel`.
- `useAuthStore` (`store/auth.store.ts`) — fields: `token`, `user`, `isAuthenticated`, `login`, `logout`.

---

## Utils / Lib
- `cn` (`lib/utils.ts`) — merges Tailwind/class names via `clsx` and `tailwind-merge`.
