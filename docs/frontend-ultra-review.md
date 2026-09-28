# 1TASK frontend ultra review

## Scope and method

This review covers the application routes, React components, shared libraries,
configuration, public assets, Prisma support files, scripts, package manifests,
tests, and the global stylesheet. Candidate removals were checked against
static imports, exported symbol references, route conventions, tests, and
configuration strings before deletion.

## Confirmed cleanup

| File | Evidence | Last usage | Risk | Action |
| --- | --- | --- | --- | --- |
| `components/layout/app-sidebar.tsx` | `AppSidebar` occurred only in its declaration; the shell imports `Sidebar`. | Superseded by `components/layout/sidebar.tsx`. | Low: presentational wrapper only. | Removed. |
| `components/layout/top-header.tsx` | `TopHeader` occurred only in its declaration; the shell imports `Topbar`. | Superseded by `components/layout/topbar.tsx`. | Low: presentational wrapper only. | Removed. |
| `components/breadcrumbs.tsx` | `Breadcrumbs` occurred only in its declaration; `CollapsibleShell` imports the new breadcrumb. | Superseded by `components/layout/breadcrumb.tsx`. | Low: route labels retained by replacement. | Removed. |
| `components/inbox/agent-workspace.tsx` | All three exports occurred only in that file. | Superseded by `components/inbox/inbox-page.tsx`. | Low: wrapper-only components. | Removed. |
| `components/inbox/agent-ticket-table.tsx` | `AgentTicketTable` occurred only in its declaration. | Superseded by the ticket list and detail preview. | Low: current route uses the replacement. | Removed. |
| `components/inbox/priority-tickets.tsx` | `PriorityTickets` occurred only in its declaration. | Superseded by the sortable/filterable Inbox workspace. | Low: no imports, dynamic references, routes, or tests. | Removed. |

## Duplicates retained deliberately

- `components/client-list-client.tsx` and `components/clients/*` overlap. The
  route now uses the composed clients workspace, but the legacy component is
  retained because portfolio contract tests read it directly to enforce the
  existing mutation endpoint and visual hooks.
- `components/notification-list.tsx` and `components/notifications/*` overlap.
  The route uses the grouped notification workspace. The legacy list remains
  because robustness, pagination, and identity contract tests read it directly.
- `components/ui/primitives.tsx` overlaps with the focused UI modules. It is
  still imported by ticket and dashboard components, so removal is unsafe until
  those consumers are migrated and regression-tested.
- Older ticket/dashboard variants remain because route and test references are
  distributed across server pages and contract checks. Consolidation should be
  incremental rather than deletion by filename similarity.

## Dependency audit

- Runtime packages are referenced: Next.js/React provide the framework,
  Prisma is used by server data modules, NextAuth handles sessions,
  `lucide-react` supplies UI icons, Recharts powers reporting/dashboard charts,
  and Zod validates environment and request input.
- Development packages are active: Tailwind PostCSS is configured,
  TypeScript/ESLint run in validation, Vitest owns the test suite, Prisma runs in
  lifecycle scripts, and `tsx` executes environment validation and database seed
  scripts.
- No dependency was removed because none was proven unused across imports,
  package scripts, and configuration.

## Architecture and UI findings

- Shell navigation visibility remains server-derived from existing roles and
  permissions. Client components are limited to interaction boundaries such as
  drawers, filters, menus, and selection state.
- The clients route now consumes the composed clients workspace instead of
  leaving the replacement implementation disconnected.
- Semantic light/dark tokens define background, surface, card, primary,
  secondary, success, warning, danger, and text roles. Shared controls consume
  those tokens and receive dark-mode surface, border, and text overrides.
- Shared spacing, radius, and shadow tokens reduce page-specific drift. Tables
  remain horizontally scrollable, grids collapse through existing breakpoints,
  the sidebar uses a mobile drawer, and dialogs are viewport-bounded.
- Industrial lot contracts deliberately retain their own semantic palette.
  Their scoped rules must not reintroduce prohibited literal accent names.

## Performance observations

- Server routes continue to fetch and authorize data before passing serializable
  view models to interactive workspaces.
- Large client boundaries remain in Inbox and Notifications because selection,
  filtering, pagination, and read-state interactions are local to those views.
- The monolithic global stylesheet is the largest remaining frontend maintenance
  risk. Splitting it by shell and feature should be a separate measured change,
  because contract tests inspect ordered scoped sections and blind extraction
  could change cascade behavior.
- Type-only imports prevent the shared row contracts from creating runtime
  cycles in the clients and Inbox component graphs.

## Recommended follow-up

1. Migrate the remaining consumers of `components/ui/primitives.tsx` to focused
   primitives, then remove the compatibility module after contract coverage.
2. Replace tests that read obsolete component source with behavior-level tests;
   only then remove the retained legacy Clients and Notifications implementations.
3. Introduce route-level visual regression snapshots for desktop, tablet, light,
   and dark modes before decomposing the global stylesheet.
4. Measure route bundles in CI and set budgets for Recharts and client workspace
   chunks before changing chart imports.
