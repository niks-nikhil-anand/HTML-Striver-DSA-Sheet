# A2Z Tracker

A personal Striver A2Z DSA tracker: **two problems a day starting 13 Oct 2026** (226 days, ending 26 May 2027), with streaks, topic progress, revision lists, notes, C++/Java solution links and JSON backup. Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Lucide. No backend; progress lives in the browser's LocalStorage.

```bash
npm install
npm run dev                      # http://localhost:3000
npm test                         # vitest (21 tests)
npm run lint && npm run build
```

See [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for how the prototype was moved into this structure.

## Routes

| Route | Page |
|---|---|
| `/` | Dashboard: hero, stats, today's two problems, timeline, topics, upcoming/recent |
| `/plan` | Day-by-day calendar and selected-day problems |
| `/problems` | All 452 problems with combined filters, sorting, pagination |
| `/topics` | Topic-wise progress (click a topic to filter problems) |
| `/revision` | Needs revision / Mastered / Solved-unmarked lists |
| `/stats` | Statistics & analytics from real progress data |
| `/settings` | Start date, export/import, reset |

## Structure

```
app/
  layout.tsx, globals.css, not-found.tsx, error.tsx
  (tracker)/layout.tsx          provider + shell; pages: page, plan, problems, topics, revision, settings
components/
  ui/ layout/ common/           primitives, shell (sidebar, header, nav), shared widgets
  dashboard/ plan/ problems/ topics/ revision/ settings/   feature components
providers/tracker-provider.tsx  state + LocalStorage (read after hydration)
hooks/use-tracker.ts
lib/                            pure logic: dates, schedule, filters, stats, storage (+ __tests__)
data/problems.json              official sheet data
public/images/                  motivation posters (kebab-case names), listed in lib/posters.ts
```

`page.tsx`/`layout.tsx` are Server Components; anything using LocalStorage, the clock or events is a `"use client"` leaf.

## Design system (sci-fi dark & light)

- All colour, shadow and glow decisions live in `app/globals.css` as semantic tokens (`--background`, `--card`, `--primary`, `--secondary`, `--success`, `--warning`, `--destructive`, `--border`, `--ring`, …) plus theme-specific `--shadow-*`, `--page-glow-*` and `--art-*` variables. Components use only token classes (`bg-card`, `text-success`, …), so there are no per-theme component copies.
- **Dark:** `#050816` near-black navy, electric blue + neon violet, thin luminous borders, restrained glow. **Light:** `#F5F7FF` cool off-white, frosted white glass, vivid blue/violet, deep-navy text. The light palette is designed separately, not inverted.
- **Theme:** `next-themes` (class strategy). First visit follows the OS; the choice persists in LocalStorage (`a2z-theme`); its pre-hydration script prevents a theme flash. Toggle is a keyboard-accessible `role="switch"` in the header.
- **Hero artwork** (`components/dashboard/hero-art.tsx`) is inline SVG driven by `--art-*` variables: deep-space city in dark, airy dawn in light. No images, video or WebGL.
- Motion is CSS only (short rises, progress transitions, one completion pulse) and disabled under `prefers-reduced-motion`.
- **Motivation posters:** `public/images/*.png` are shown in a small carousel on the dashboard (`components/dashboard/poster-card.tsx`) via `next/image`, so they are resized/served as WebP instead of the 2 MB originals. Add a new poster by dropping a file in `public/images/` and adding an entry (with alt text) to `lib/posters.ts`.
- Navigation: collapsible desktop sidebar (state persisted), compact icon rail on tablet, slide-over drawer on mobile.
- Extra route `/stats` (Statistics & Analytics): difficulty breakdown, 30-day activity, milestones, workflow counts. All values derive from stored progress.

## Data

`data/problems.json` was extracted from takeuforward's official Striver A2Z sheet page (Oct 2026); nothing was invented.

- **452 practice problems** in official order, deduplicated by takeuforward item id (13 appear in multiple modules and are scheduled once). The sheet's 43 theory lessons and 16 contests are not scheduled.
- **Difficulty:** the sheet doesn't publish Easy/Medium/Hard. Its `basic`/`core`/`pro` tiers are mapped to Easy/Medium/Hard (67/277/108); the original tier is kept in `tier`.
- **Practice links:** each card shows every available platform: LeetCode (289, from the official sheet, normalised to the canonical problem URL), GFG (88, from [geckguy.github.io/striver-a2z-sheet](https://geckguy.github.io/striver-a2z-sheet/); IDs and titles match 1:1 for its 402 problems; 18 problems have both) and the official takeuforward page (all 452; the only link for the 93 problems with neither). Where that site's LeetCode pick disagreed with the official sheet, the official one was kept (the site's was wrong for several, e.g. House Robber → II).
- **C++ solutions (165):** [Codensity30/Strivers-A2Z-DSA-Sheet](https://github.com/Codensity30/Strivers-A2Z-DSA-Sheet), matched by title, confident matches only.
- **Java solutions (184):** [Bharat2044/Striver-A2Z-DSA-Sheet-Solution-using-JAVA](https://github.com/Bharat2044/Striver-A2Z-DSA-Sheet-Solution-using-JAVA), matched by title, a reviewed alias list, and Pattern N ↔ the repo's Nth pattern file.
- Problem IDs are `tuf-<takeuforward id>`, so saved progress survives data refreshes.

## Behaviour notes

- Weekends are included; the schedule never moves when you tick things off. Pending problems from past days are flagged **Overdue**, never rescheduled.
- A streak counts days with at least one completed problem and stays alive through today until midnight.
- Import validates the schema first, drops unknown IDs and asks before replacing; reset asks for confirmation.
