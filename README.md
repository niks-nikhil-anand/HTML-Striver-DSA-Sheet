# A2Z Tracker

A personal Striver A2Z DSA tracker: **self-paced practice**, with streaks, topic progress, revision lists, notes, C++/Java solution links and JSON backup. Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Lucide. Progress and preferences are stored in PostgreSQL through authenticated API routes.

```bash
npm install
npm run dev                      # http://localhost:3000
npm test                         # vitest (API tests need DATABASE_URL)
npm run lint && npm run build
```

See [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for how the prototype was moved into this structure.

## Routes

| Route | Page |
|---|---|
| `/` | Dashboard: overall progress, streaks, topics, milestones and recent activity |
| `/plan` | Redirects to `/problems` for old bookmarks |
| `/problems` | All 452 problems with combined filters, sorting, pagination |
| `/topics` | Topic-wise progress (click a topic to filter problems) |
| `/revision` | Needs revision / Mastered / Solved-unmarked lists |
| `/stats` | Statistics & analytics from real progress data |
| `/settings` | Export/import, reset |

## Structure

```
app/
  layout.tsx, globals.css, not-found.tsx, error.tsx
  (tracker)/layout.tsx          provider + shell; pages: page, plan, problems, topics, revision, settings
components/
  ui/ layout/ common/           primitives, shell (sidebar, header, nav), shared widgets
  dashboard/ problems/ topics/ revision/ settings/   feature components
providers/tracker-provider.tsx  API state + in-memory pending mutations
hooks/use-tracker.ts
lib/                            pure logic: dates, filters, stats, progress (+ __tests__)
data/problems.json              official sheet data
public/images/                  motivation posters (kebab-case names), listed in lib/posters.ts
```

`page.tsx`/`layout.tsx` are Server Components; anything using the clock or events is a `"use client"` leaf.

## Saving to a database (API + sync)

Progress, notes, revision flags, filters and UI preferences can be saved to Postgres through a JSON API; the UI stays instant and writes in the background (offline changes queue and retry). Design: [PRISMA_PLAN.md](PRISMA_PLAN.md), [API_IMPLEMENTATION_PLAN.md](API_IMPLEMENTATION_PLAN.md).

```bash
cp .env.example .env            # set DATABASE_URL (and DEV_USER_ID for local dev)
npx prisma migrate deploy       # create tables
npx prisma db seed              # load the 452 problems (idempotent)
npm run dev
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres URL used by the app |
| `DIRECT_URL` | Optional non-pooled URL for migrations/seed |
| `DEV_USER_ID` | **Local development only.** Until real sign-in exists, the API treats every request as this user. Ignored (401) on Vercel / production |

The API is required. Failed initial loads show a retry screen; there is no guest persistence. Pending writes retry in memory and do not survive closing the tab. A reload warning appears while saves are pending. Hiding or closing the problems page sends a complete keepalive preference snapshot, even when another save is in flight. Per-session sequence checks prevent older requests from overwriting it; the next browser session restores from PostgreSQL. Unsaved changes still require a working network to reach the database. Production sign-in is not implemented yet: `requireUser()` deliberately returns 401 in production until a verified session provider is added.

Theme, sidebar, heatmap range problem-card layout the current problem page and scroll position are stored in `UserPreferences.ui`. Problem search, difficulty, topic, status and sorting are saved in `UserPreferences.filters` and restored on load. Ordinary navigation preserves them, including pagination and scroll position; changing filters or sorting resets to page 1, while a smaller result set clamps to its last available page; topic cards change only the topic, global search changes only its selected fields, and Clear filters preserves sorting and layout. Run `npx prisma generate` and `npx prisma migrate deploy` before starting this version. Existing browser-only data is not read or deleted; import a previously exported JSON backup through Settings if needed.

API (`/api/v1`, JSON, `no-store`): `GET /progress`, `PUT|DELETE /progress/{problemId}`, `DELETE /progress` (`{"confirm":"RESET"}`), `PUT /plan`, `PATCH /preferences`, `GET /export`, `POST /import` (`replace|merge`), `POST /migrate/local`, plus public `GET /api/health`. Errors are `{ "error": { "code", "message", "fields?" } }`. Code lives in `app/api/**` (thin handlers) → `lib/server/services/*` → Prisma; the browser side is `lib/sync/*` (client, diff, queue, controller) behind `providers/tracker-provider.tsx`.

## Design system (sci-fi dark & light)

- All colour, shadow and glow decisions live in `app/globals.css` as semantic tokens (`--background`, `--card`, `--primary`, `--secondary`, `--success`, `--warning`, `--destructive`, `--border`, `--ring`, …) plus theme-specific `--shadow-*`, `--page-glow-*` and `--art-*` variables. Components use only token classes (`bg-card`, `text-success`, …), so there are no per-theme component copies.
- **Dark:** `#050816` near-black navy, electric blue + neon violet, thin luminous borders, restrained glow. **Light:** `#F5F7FF` cool off-white, frosted white glass, vivid blue/violet, deep-navy text. The light palette is designed separately, not inverted.
- **Theme:** class strategy; follows the OS until account preferences load, then applies the database preference. The accessible header switch saves through the preferences API.
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

- Choose any problem at your own pace; there are no daily assignments, targets, scheduled dates or overdue states. Legacy plan data is retained for backup/API compatibility. Old schedule filters are normalized to all problems.
- A streak counts days with at least one completed problem and stays alive through today until midnight.
- Import validates the schema first, drops unknown IDs and asks before replacing; reset asks for confirmation.

### Achievements

The 19 milestone definitions live in `lib/achievements.ts`. `UserAchievement` stores permanent, user-scoped awards, independent of progress resets and legacy `celebratedMilestones` preferences. Completion saves and imports calculate eligibility from unique official completed problem IDs under the account row lock; the composite primary key prevents duplicate awards.

Deploy with `npx prisma migrate deploy`, then run `npm run achievements:backfill` once for existing accounts. The backfill is idempotent and silent; loading a page never creates awards. New awards and notification consumption commit in the same transaction. This provides at-most-once notifications across retries and reloads: a lost response may suppress a toast, but the earned badge remains in the database and appears on the next snapshot. Imported achievements are calculated from validated completions, never trusted from a file.
