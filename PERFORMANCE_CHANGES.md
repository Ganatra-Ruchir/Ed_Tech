# Performance & cleanup overhaul

Why the app felt laggy, what changed, and what you need to do when deploying.

## Deploying this change

1. `npm install` — `motion` was removed and `geist` added.
2. `npx prisma migrate deploy` — applies `20261013120000_kpi_latest_and_perf_indexes`. It
   creates the `KPILatest` table, copies the current value of every KPI into it from your
   existing data, and swaps a few indexes. Nothing is deleted. On Vercel the `vercel-build`
   script already runs this.
3. Deploy as usual.

## Measured results

The original and new code were run side by side against the same Postgres database. The test
data was about 200 students, 2,400 submissions and 1,200 test responses, plus roughly two months
of KPI history at 20 reviews a day. Each figure is the median of 5 requests.

| Page / action                 | Before   | After  |
|-------------------------------|----------|--------|
| Admin → Students              | 4,825 ms | 65 ms  |
| Faculty → Students            | 3,170 ms | 84 ms  |
| Admin → Analytics             | 2,736 ms | 200 ms |
| Faculty → Cohort              | 2,530 ms | 191 ms |
| Faculty → Batches             | 136 ms   | 52 ms  |
| Approve a submission          | ~1,500 ms| ~160 ms|
| KPI history rows per approval | 528      | ~7     |

The test database had almost no network latency. On a hosted database every sequential query
costs a real round trip, so removing them helps more there than these numbers show.

## The causes and the fixes

### 1. KPI reads got slower every day (the main cause)

`KPI` is an append-only log, and every review recomputed every student in the batch. That was
about 700 queries per click with 100 students, adding over 500 rows each time. Pages then loaded
the **entire** log and de-duplicated it in JavaScript to find the current values. So the more the
app was used, the slower it got.

- New `KPILatest` table with exactly one row per KPI series. `getLatestKpis()` reads only that
  table, so its cost no longer depends on how much history exists.
- `src/lib/kpi.ts` now recomputes a whole batch with a fixed handful of queries and writes in one
  transaction. History rows are only added when a value actually changes.
  `days_since_last_activity` isn't logged as history, because it changes on every recompute and
  is never charted.

### 2. Every portal layout waited on 7–8 queries before showing anything

The notification bell's queries ran in the layout, so the sidebar, header and page waited for
them.

- New shared `PortalShell` component. The layouts now only await the user's avatar (plus the
  review-count badge for faculty). The bell streams in behind `<Suspense>` from
  `src/lib/portal-notifications.ts`.
- About 250 lines of duplicated layout code across student, faculty and admin are gone.
- Message notifications went from two sequential queries to one.

### 3. Clicks felt frozen

The portals had no `loading.tsx`, so a sidebar click did nothing visible until the server
finished.

- `student/`, `faculty/` and `admin/` each have `loading.tsx` with an instant skeleton.
- Each also has `error.tsx`, so one broken page no longer wipes out the sidebar and header.

### 4. Heavy client-side animation

- Table rows animated in one by one at 28 ms per row. A 200-row table took more than 5 seconds
  to fully appear, and it replayed after every save.
- Every `Button` was an animated component.
- Every navigation remounted the whole page to replay an entrance animation.
- The sidebar and topbar used the animation library too.
- The `motion` dependency is removed entirely. The little motion that remains is one-shot CSS.
- Effects that looped forever were removed, most of them nearly invisible:
  - a looping box-shadow on the logo
  - "building" bars at 4% opacity
  - a 226 KB background image at 8% opacity
  - a fixed watermark at 1.8% opacity
  - a grid pattern behind the whole portal
- `backdrop-blur` was removed from the sticky header and the sticky form bars. It re-blurs on
  every scroll frame.
- `scroll-behavior: smooth` was removed. It animated the scroll on every route change.
- The login page carousel now rotates every 6 s instead of 2 s, only on wide screens, and the
  sign-in card no longer re-blurs on every frame of the crossfade.

### 5. Charts blocked the page from becoming interactive

Recharts is the largest client dependency, and it was part of each dashboard's main JavaScript.

- `src/components/charts/LazyCharts.tsx` loads every chart after the page is usable, with a
  placeholder of the same height so nothing jumps.
- The test-analytics bar chart was split into `ScoreDistributionChart.tsx`, so the rest of that
  panel still renders on the server.

### 6. Sequential query waterfalls

Pages fetched the user's batch ids first, then ran the real queries. These now use relation
filters in a single parallel round:

- student dashboard, tests and materials
- faculty dashboard, students, batches, review, reports, cohort and at-risk
- `getCohortOverview` and `getBatchOverview`

### 7. Database and infrastructure

- Composite indexes matching the filters every portal page uses: `Submission (studentId, status)`,
  `(batchId, status, createdAt)` and `(status, createdAt)`, plus
  `Test (batchId, publishedAt, dueAt)`.
- The Postgres connection pool is configured explicitly (`DATABASE_POOL_MAX`, default 10) and
  reused across hot reloads.
- `getSession()` is cached per request, so the layout and page share one JWT verification.
- Fonts are self-hosted through the `geist` package. Builds no longer need to reach Google Fonts
  (the original build failed without it).

## Repo cleanup

- Removed two user-uploaded screenshots that were committed in `data/messages/`, and added
  `data/messages` and `data/materials` to `.gitignore`.
- Removed the unused Next.js starter SVGs from `public/`.
- Package renamed from `webbb` to `silver-oak-learning-hub`.
- The README now describes the real Postgres setup and has a "Performance notes" section with
  the conventions above.
- Shared nav config (`nav-config.ts`) replaces two duplicated icon maps.
- An unused "light" sidebar variant was removed.

## Verification

- `tsc --noEmit`: clean.
- `eslint`: clean.
- `npm test`: 8/8 passing.
- `next build`: succeeds.
- Logged in as student, faculty and admin: all 35 portal pages return 200 with no server errors.
- The approve flow was exercised through the API, and the notification bell was confirmed to
  stream in.
