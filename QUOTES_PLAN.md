# Plan: contextual quote cards

Goal: show the 22 supplied quotes as cards in different places on different pages, chosen by what the user is doing there, never as random filler.

## 1. Content sets (single source: `lib/quotes.ts`)

| Set | Count | Mood / when it fits |
|---|---|---|
| `DASHBOARD_QUOTES` | 8 | General daily motivation |
| `DIFFICULT_PROBLEM_QUOTES` | 7 | The user is facing, or reviewing, hard problems |
| `STREAK_QUOTES` | 7 | Consistency, habit, streaks |

Quotes are typed `as const`; adding one is a one-line change.

## 2. Selection rule

`dailyQuote(list, date, offset)` picks `list[(YYYYMMDD + offset) % list.length]`.

- **Deterministic**: same output on server and client, so no hydration mismatch and no `Math.random()` (required by `cacheComponents`).
- **Rotates daily**: a new quote each calendar day.
- **Offsets de-duplicate**: two cards from the same set on one page use different offsets (e.g. Stats uses offset 2, Plan uses 1, sidebar uses 0).
- Uses the tracker's `today`, which updates at midnight, so quotes change without a reload.

## 3. One component: `components/common/quote-card.tsx`

`<QuoteCard label quote className />`: semantic `<aside aria-label>` + `<blockquote>`, token-based colours (works in dark and light), `rise` entrance animation that respects reduced motion. Props only; no per-page copies.

## 4. Placement matrix

| Page / spot | Set | Offset | Label | Condition |
|---|---|---|---|---|
| Dashboard, under Today's plan | Dashboard | 0 | Daily motivation | always |
| Dashboard, inside Today's plan | Difficult | 3 | A tough one today | a **Hard** problem is scheduled today and the day isn't finished |
| Daily Plan, under the calendar | Streak | 1 | Keep showing up | always |
| All Problems, under filters | Difficult | 0 | For the hard problems | Difficulty filter = **Hard** |
| Revision, above the tabs | Difficult | 2 | Learn from every attempt | always (it's the "revisit what was hard" page) |
| Statistics, top | Streak | 2 | Build your streak | always |
| Sidebar card (desktop + drawer) | Streak | 0 | with live streak count | always |
| Hero | rotating motivation line | – | – | unchanged |
| Topics, Settings | none | – | – | intentionally quote-free: task pages |

Rules of thumb: at most one card per page region, never above the primary task (plan, filters), none on pure settings/utility pages.

## 5. Implementation phases

1. **Content**: add the three typed lists + `dailyQuote` to `lib/quotes.ts`. ✅
2. **Component**: build `QuoteCard`. ✅
3. **Placement**: add cards per the matrix above. ✅ (the Hard-today card is the only conditional one on the dashboard)
4. **Tests**: counts per set, determinism, membership, day-to-day rotation, offset de-duplication (`lib/__tests__/lib.test.ts`). ✅
5. **Verification**: every route loads with the intended card and no other; no hydration warnings; light/dark legible; mobile has no horizontal overflow.

## 6. Future options (not built)

- Show a *streak-at-risk* quote on the dashboard when the user has a streak but nothing solved today.
- Per-user "hide quotes" toggle in Settings.
