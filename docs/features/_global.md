# Global Frontend Shared Code

## Purpose
- Shared utilities, components, hooks, stores, and API wrappers reused across frontend features.

---

## Components
- `ProtectedRoute` (`components/ProtectedRoute.tsx`) — blocks private routes unless `useAuthStore` says the user is authenticated
- `DocumentEditor` (`components/ui/DocumentEditor.tsx`) — MDXEditor wrapper with markdown toolbar, source toggle, and optional image upload
- `MarkdownPreview` (`components/ui/MarkdownPreview.tsx`) — renders markdown with GFM and storage-aware image URLs
- `Badge` (`components/ui/badge.tsx`) — styled status badge primitive
- `Button` (`components/ui/button.tsx`) — styled button primitive with variants and `asChild`
- `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator` (`components/ui/command.tsx`) — command-palette primitives
- `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogClose`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` (`components/ui/dialog.tsx`) — shared modal primitives
- `MultiSelect` (`components/ui/multi-select.tsx`) — popover-based multiselect with badges and bulk actions
- `Popover`, `PopoverTrigger`, `PopoverContent` (`components/ui/popover.tsx`) — shared popover primitives
- `Separator` (`components/ui/separator.tsx`) — horizontal/vertical divider primitive
- `Toaster` (`components/ui/toaster.tsx`) — renders queued toast notifications

---

## Hooks
- `useToastState` (`hooks/use-toast.ts`) — toast queue state consumed by `Toaster`
- `toast` (`hooks/use-toast.ts`) — global helper to enqueue auto-dismissing toasts

---

## Services
- `api` (`lib/api.ts`) — typed frontend client for auth, users, projects, features, feedback, chat, dev-task, and feature-analysis endpoints

---

## Stores
- `useAuthStore` (`store/auth.store.ts`) — fields: `token`, `user`, `isAuthenticated`, `login`, `logout`
- `useAppStore` (`store/index.ts`) — fields: `selectedProject`, `selectedFeature`, `selectedChatSession`, `activeProvider`, `activeModel`

---

## Utils / Lib
- `getStorageUrl` (`lib/api.ts`) — maps storage keys to API-backed asset URLs
- `resolveMarkdownAssetUrl` (`lib/markdown.ts`) — resolves relative markdown image sources through storage URLs
- `cn` (`lib/utils.ts`) — merges class names through `clsx` and `tailwind-merge`
