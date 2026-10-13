# Plan: build the API and connect the frontend to it

Builds on `PRISMA_PLAN.md` (reasoning, model design) and the finished `prisma/schema.prisma`. This document is the **file-by-file implementation plan**. Nothing here is implemented yet.

## 1. Starting point

| Piece | State |
|---|---|
| `prisma/schema.prisma`, `prisma.config.ts`, generated client (`lib/generated/prisma`) | done, validated |
| Migration applied to a real database | **pending** (`npx prisma migrate dev --name init`) |
| Seed of the 452 problems | **pending** |
| Prisma client singleton, API routes, validation | **pending** |
| Authentication | **not decided** (D1/D2/D6 in `PRISMA_PLAN.md`) |
| FE state | `providers/tracker-provider.tsx` holds `Progress` and **every change goes through one `commit()`**; LocalStorage is read after hydration and written on every change |

## 2. The one blocking decision: who owns the data?

Every handler must know the user, and the user id may only come from a verified session. Real auth is a separate phase, so to avoid blocking everything:

- Build all handlers against one function, `requireUser()` (`lib/server/auth.ts`), which returns `{ id }` or throws `UNAUTHENTICATED` (401).
- **Interim implementation (development only)**: reads `DEV_USER_ID` from `.env` and upserts that `User`. It **throws in production** (`NODE_ENV === "production"` or `VERCEL_ENV` set), so it can never ship open.
- **Final implementation (Phase 2)**: swap the body of `requireUser()` for the chosen auth library's session lookup. No handler changes.

Please confirm or change: accounts + guest mode (recommended), auth library (Better Auth or Auth.js), sign-in methods (Google/GitHub/email link).

## 3. Server side

### 3.1 Dependencies
`npm install zod` (request validation). Auth library comes in Phase 2. Prisma packages are already installed (7.10.0).

### 3.2 Files

```
lib/server/db.ts                 PrismaClient singleton using @prisma/adapter-pg, cached on globalThis in dev
lib/server/errors.ts             ApiError(code, status, message, fields?) + toResponse(err)
lib/server/auth.ts               requireUser() (interim dev version, see §2)
lib/server/schemas.ts            zod: problemId, localDate, PutProgressBody, PutPlanBody, PatchPreferencesBody, ImportBody
lib/server/mappers.ts            DB rows <-> the existing `Progress` shape (toSnapshot / fromSnapshot)
lib/server/services/progress.service.ts
lib/server/services/plan.service.ts
lib/server/services/preferences.service.ts
lib/server/services/import-export.service.ts
lib/server/http.ts               json(), noContent(), parseBody(schema), withApi(handler) wrapper (try/catch, no-store header)
prisma/seed.ts                   upserts the 452 problems from data/problems.json (idempotent)
app/api/v1/**/route.ts           thin handlers (see §4)
app/api/health/route.ts          public liveness + DB ping
```

Handler shape (every route):

```
withApi(async (req) => {
  const user = await requireUser();          // 401 if none
  const body = await parseBody(req, Schema);  // 400 with field errors
  const result = await service.fn(user.id, body);
  return json(result);
})
```

### 3.3 Business rules (in services, covered by tests)

1. **`PUT /progress/:problemId`** is an idempotent upsert of whichever fields are present:
   - `completed: true` → set `completedAt = now`, `completedDate = localDate` (required with `completed`), append a `COMPLETE` event. Already completed → no-op (keeps the original date, so a retry can't shift a streak).
   - `completed: false` → clear both fields, append `UNCOMPLETE`.
   - `note: string | null` (trimmed, ≤ 5000; empty → null). `revision: "needs-revision" | "mastered" | null`.
   - If every field ends up default, **delete the row**.
   - `problemId` must exist (404). `localDate` must be a real date within ±1 day of server UTC date.
   - Optional `clientUpdatedAt`: if the stored `updatedAt` is newer, return **409** with the current row (client adopts it).
2. **`PUT /plan`**: validates the date, upserts the single `StudyPlan`. Never touches progress.
3. **`PATCH /preferences`**: merges `filters` (validated against the same enums as `lib/storage.ts`) and `celebratedMilestones`.
4. **`POST /import`**: reuses the existing `validateProgress` from `lib/storage.ts` (single source of truth for the file format), drops unknown problem ids, then in **one transaction**: `replace` clears and rewrites; `merge` keeps the newer `updatedAt` per problem. Body ≤ 5 MB.
5. **`DELETE /progress`**: requires `{ "confirm": "RESET" }`; deletes progress rows, events and preferences; keeps the account and plan.
6. **`GET /progress`** returns the snapshot in the **same shape as today's `Progress`** (`startDate`, `completed`, `notes`, `revision`, `prefs`) so the FE types and pure logic (`lib/stats.ts`, `lib/filters.ts`) do not change.

## 4. API reference (final contract)

All JSON, all `Cache-Control: no-store`, all require a session except `/health`.

| Method | Path | Request | Success | Errors |
|---|---|---|---|---|
| GET | `/api/v1/progress` | – | `200` snapshot (`Progress` shape + `updatedAt`) | 401 |
| PUT | `/api/v1/progress/{problemId}` | `{completed?, localDate?, note?, revision?, clientUpdatedAt?}` | `200` row `{problemId, completed, completedDate, note, revision, updatedAt}` | 400, 401, 404, 409 |
| DELETE | `/api/v1/progress/{problemId}` | – | `204` | 401, 404 |
| DELETE | `/api/v1/progress` | `{confirm:"RESET"}` | `204` | 400, 401 |
| PUT | `/api/v1/plan` | `{startDate}` | `200` plan | 400, 401 |
| PATCH | `/api/v1/preferences` | `{filters?, celebratedMilestones?}` | `200` prefs | 400, 401 |
| GET | `/api/v1/export` | – | `200` JSON file (same format as the Export button) | 401 |
| POST | `/api/v1/import` | `{mode:"replace"\|"merge", data}` | `200` `{imported, skipped}` | 400, 401, 413 |
| POST | `/api/v1/migrate/local` | `{data}` (a LocalStorage `Progress`) | `200` summary; merge, newest wins | 400, 401 |
| GET | `/api/health` | – (public) | `200 {ok:true}` | 503 |

Error body: `{ "error": { "code": "VALIDATION" | "UNAUTHENTICATED" | "NOT_FOUND" | "CONFLICT" | "PAYLOAD_TOO_LARGE" | "INTERNAL", "message": "...", "fields"?: { ... } } }`. Unexpected errors are logged server-side and return a generic message (no stack traces, no SQL).

Security checklist: user id only from session; `Origin` header check on non-GET; zod on every body; body-size cap; `problemId` allow-listed against the DB; per-user rate limit on mutations (Phase 6).

## 5. Frontend integration

### 5.1 The seam
`TrackerProvider` already routes every state change through `commit()`; the exported actions are `toggleComplete`, `setNote`, `setRevision`, `setFilters`/`clearFilters`, `setStartDate`, `replaceProgress`, `resetProgress`. **UI components do not change**; only the provider gains a sync layer. This keeps the optimistic UX and all existing tests valid.

### 5.2 New modules

```
lib/sync/api-client.ts      typed fetch wrappers (getSnapshot, putProgress, putPlan, patchPreferences, importData, exportData, resetAll); parses the error format into typed errors
lib/sync/queue.ts           per-key coalescing write queue: debounce (notes 500 ms, others immediate), retry with exponential backoff + jitter, flush on visibilitychange/pagehide, persists pending ops in LocalStorage so a closed tab doesn't lose them
lib/sync/diff.ts            computes the ops to send by diffing previous vs next Progress (so one commit() can emit 0..n ops)
hooks/use-sync-status.ts    "idle" | "saving" | "offline" | "error" + pending count
components/layout/sync-indicator.tsx   small header badge (Saved / Saving… / Offline · n pending)
```

### 5.3 Provider changes (`providers/tracker-provider.tsx`)

| Today | After |
|---|---|
| mount: `loadProgress(localStorage)` | mount: load LocalStorage immediately (instant UI, `ready`), then `GET /progress`; server snapshot replaces local state (server is authoritative after load). Signed-out or 401 → guest mode, exactly as today |
| `commit(next)` writes LocalStorage | also `diff(prev, next)` → `queue.enqueue(ops)`; LocalStorage stays as write-through cache |
| `toggleComplete(id)` | sends `PUT /progress/{id} {completed, localDate: today}`; celebration toasts unchanged (computed locally) |
| `setNote` / `setRevision` | `PUT /progress/{id} {note}` / `{revision}` |
| `setFilters` / `clearFilters` | `PATCH /preferences` (debounced 1 s) |
| `setStartDate` | `PUT /plan` |
| Settings → Import | `POST /import {mode:"replace"}` after the existing client-side validation + confirm dialog, then refetch snapshot |
| Settings → Export | `GET /export` when signed in; local export when guest |
| Settings → Reset | `DELETE /progress {confirm:"RESET"}` then clear local |
| 409 on a write | adopt the server row into state, toast "Updated from another device" |
| first sign-in with local data | dialog "Move my local progress to my account?" → `POST /migrate/local` |

Failure rules: network error → keep local change, queue retries, show **Offline**; 4xx other than 409 → revert that change, toast the message; 401 → switch to guest mode and prompt sign-in.

### 5.4 Environment
`NEXT_PUBLIC_SYNC=on|off` feature flag. `off` (default) = today's behaviour, so the backend can ship dark and be switched on per environment.

## 6. Work order (each step leaves the app working)

| # | Task | Verify |
|---|---|---|
| 1 | Run migration; write `prisma/seed.ts`; seed | `Problem` count = 452 |
| 2 | `db.ts`, `errors.ts`, `http.ts`, `schemas.ts`, interim `auth.ts` | unit tests for schemas/errors |
| 3 | Services + `mappers.ts` (snapshot parity with `Progress`) | service tests on a real Postgres test DB |
| 4 | Route handlers for §4, `/health` | route tests (below) + `curl` walkthrough |
| 5 | `lib/sync/*` + `use-sync-status` + provider changes behind `NEXT_PUBLIC_SYNC` | existing 26 tests still pass; new queue/diff tests |
| 6 | Settings: server import/export/reset; sync indicator in header | manual: tick, reload, data persists from DB |
| 7 | Guest → account migration dialog | local export imports losslessly |
| 8 | Phase 2 auth swap-in; remove dev auth path | 401 without session; cross-user isolation tests |
| 9 | Docs, env var table, Vercel config (`postinstall: prisma generate`, migrate deploy step) | clean-checkout build passes with plain `npm install` |

## 7. Test plan

- **Service/route tests** (vitest, real Postgres via a Neon branch or Docker; no DB mocks, so constraints are exercised): 401 without session; 400 invalid body; 404 unknown `problemId`; idempotent retry of `completed:true` keeps the original date; un-tick then re-tick; row deleted when all fields default; 409 on stale `clientUpdatedAt`; `import replace` and `merge` correctness; `reset` requires the confirm token; **user A can never read or write user B**.
- **Sync tests**: `diff()` output for every action; queue coalescing, retry/backoff (fake timers), persistence across reload, ordering per problem.
- **Manual / browser**: tick offline → reconnect flushes; two tabs converge; flag off = unchanged behaviour.
- **CI**: `npm install` (no flags), `prisma generate`, lint, type-check, tests, build.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Dev-auth shortcut leaking to production | throws when `NODE_ENV=production`/`VERCEL_ENV` is set; covered by a test |
| Streak shifts from retried writes | `completed:true` is a no-op when already completed |
| Two code paths (guest vs synced) drift | all server calls live in `lib/sync`; the pure logic in `lib/` is shared and unchanged |
| Lost writes on flaky networks | persisted queue + idempotent PUT + visible pending count |
| `cacheComponents` prerender conflicts | API routes are dynamic by nature; pages remain static shells and fetch after mount, as the progress `ready` gate already does |
| Prisma 7 adapter/config drift | follow the official v7 Next.js guide when writing `db.ts`; pin 7.10.0 (done) |

## 9. Definition of done

Tick a problem on one device, reload or open another browser signed into the same account, and the tick, notes, revision, filters and start date are all there. Offline changes sync on reconnect. Import/export/reset work against the server. Another user's data is unreachable. All tests, lint, type-check and a clean-checkout Vercel build pass.
