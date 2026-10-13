# Migration plan: A2Z Tracker → `dsa` (Next.js App Router)

**Source:** prototype app (single-page, one `TrackerApp` component, `src/` layout, view switched by state).
**Target:** this repo (`create-next-app` 16.4, `app/` at root, no `src/`, `@/*` → project root, Tailwind v4, `cacheComponents` on).

## 1. Goals
- Same features and data, but organised the Next.js way: **real routes**, layouts, server pages + client islands, route-level metadata.
- Tailwind CSS v4 only (no CSS modules / styled libs). shadcn/ui primitives kept as plain Tailwind components under `components/ui`.
- Keep all existing user progress working (same LocalStorage key + schema).

## 2. What changes (and why)

| Prototype | Target | Reason |
|---|---|---|
| One page, `view` state in LocalStorage prefs | Routes: `/`, `/plan`, `/problems`, `/topics`, `/revision`, `/settings` | URLs, back button, per-page titles, code splitting |
| `src/` folder | Root-level `components/ hooks/ lib/ data/` | Target has no `src/`; alias `@/*` points at root |
| `TrackerApp` (shell + provider + views) | `app/(tracker)/layout.tsx` wraps pages with provider + shell | Layouts persist across navigation; state is not reset |
| Sidebar/mobile nav call `setView` | `next/link` + `usePathname` active state | Native navigation + prefetch |
| Giant `OtherViews.tsx` | One folder per feature in `components/` | Maintainability |
| `useTracker.tsx` (context + hook in one file) | `providers/tracker-provider.tsx` + `hooks/use-tracker.ts` | Separation of concerns |
| `prefs.view` | removed (route is the source of truth) | Old saved data / imports still validate; field is ignored |

## 3. Target structure

```
app/
  layout.tsx              root: fonts, ThemeProvider, Toaster, title template
  globals.css             Tailwind v4 + theme tokens
  not-found.tsx, error.tsx
  (tracker)/
    layout.tsx            TrackerProvider + AppShell
    page.tsx              /          Dashboard
    plan/page.tsx         /plan
    problems/page.tsx     /problems
    topics/page.tsx       /topics
    revision/page.tsx     /revision
    settings/page.tsx     /settings
components/
  ui/                     shadcn primitives (button, checkbox, dialog, input, textarea, sonner)
  layout/                 app-shell, sidebar, mobile-nav, header, theme-toggle, page-header, nav-items
  common/                 panel, bar, progress-ring, difficulty-badge, empty-state
  dashboard/ plan/ problems/ topics/ revision/ settings/   feature components
providers/tracker-provider.tsx
hooks/use-tracker.ts
lib/                      pure logic + __tests__ (unchanged API)
data/problems.json        official sheet data (+ C++/Java solution links)
```

Rule of thumb: `page.tsx` / `layout.tsx` are Server Components; anything touching LocalStorage, the clock, or events is a `"use client"` leaf under `components/`.

## 4. Phases

1. **Prepare** – read `node_modules/next/dist/docs` (per `AGENTS.md`), install deps (`@base-ui/react`, `class-variance-authority`, `lucide-react`, `next-themes`, `sonner`, `tw-animate-css`, `clsx`, `tailwind-merge`, `shadcn`, dev: `vitest`, `vite`). Add `components.json`.
2. **Foundation** – copy `lib/`, `data/`, tests; add `vitest.config.mts`; remove `prefs.view`; port `globals.css` theme.
3. **State** – split provider/hook; remove `setView`.
4. **UI** – move `ui/` primitives, shared bits, then each feature into its folder; swap view-switching for `Link`/`useRouter`.
5. **Routes** – root layout, `(tracker)` layout, six pages with metadata, `not-found`, `error`.
6. **Verify** – `tsc`, `eslint`, `vitest`, `next build`, then manual browser pass (see §5).
7. **Cleanup** – remove create-next-app boilerplate (default page, unused `public/*.svg`), update README.

## 5. Verification checklist
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` all pass.
- [ ] `/` shows Day 01 = 13 Oct 2026, 2 problems; ticking updates stats instantly; refresh keeps progress.
- [ ] All six routes load directly (deep link) and via sidebar; active nav item correct; mobile bottom nav works.
- [ ] Filters combine (e.g. Medium + Binary Search + Pending); Clear works; header search jumps to `/problems`.
- [ ] Export → Reset → Import round-trips; invalid JSON rejected.
- [ ] No hydration warnings in the console; dark default, light toggle works.
- [ ] Data saved by the prototype (same key `dsa-tracker:v1`) still loads.

## 6. Risks & mitigations
- **`cacheComponents` prerendering**: no clock/random in Server Components; all time-dependent code is in client effects after hydration.
- **Provider remount on navigation**: provider lives in the `(tracker)` layout, so it persists across pages.
- **Repo has no commits yet**: nothing to roll back to; changes are additive. Commit the scaffold first if you want a clean baseline.
- **Peer-dependency conflict when installing vitest** (hit on Vercel): resolved by pinning `@types/node@^24`, so a plain `npm install` works; `--legacy-peer-deps` is no longer needed.
