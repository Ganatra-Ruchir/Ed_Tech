# Student Progress & Evaluation Platform

A role-based web app that replaces spreadsheets/email for project supervision with a
single evidence-linked workflow — built for a Silver Oak University department pilot
(one semester, a few hundred students).

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript)
- **Prisma 7** ORM with the driver-adapter architecture, on **PostgreSQL** (`@prisma/adapter-pg`)
  in every environment — local dev included
- **Custom session auth** — signed JWT in an httpOnly cookie (`jose` + `bcryptjs`), not NextAuth.
  Next.js 16 renamed `middleware` to `proxy` and dropped the Edge runtime for it in favor of
  Node.js, which made a from-scratch implementation simpler and more predictable than pulling
  in a library built around the old model.
- **Recharts** for charts, always loaded lazily via `src/components/charts/LazyCharts.tsx`
- **@react-pdf/renderer** for PDF report generation (no headless browser needed)
- **Tailwind CSS v4** for styling, **lucide-react** for icons
- File storage abstraction: local disk in dev, **Vercel Blob** in production (auto-detected via env var)

## Design decisions

The UI is a sidebar-based shell (left nav with icons, active-state highlighting, a mobile
slide-over drawer) rather than a top-nav-only layout — a deliberate, familiar LMS pattern shared
by Canvas, Blackboard, and Schoology. Shared primitives (`Avatar`, `ProgressBar`, `KpiCard`,
`StatusBadge`) keep every screen visually consistent.

A few features were added after benchmarking against Canvas, Moodle, Google Classroom, Microsoft
Teams for Education, Blackboard Learn, and Schoology (see the competitive analysis this was
scoped from):

- **Class Stream / Announcements** (`Announcement` model, `/faculty/announcements`,
  `/student/stream`) — faculty post batch-wide updates; students see them in a stream on their
  dashboard and a dedicated page. Directly inspired by Canvas's and Google Classroom's
  announcements feed, which came up repeatedly as a "what we should take."
- **Upcoming widget** on the student dashboard — unattempted tests and submissions flagged
  "needs revision," sorted by due date. A lightweight version of Canvas's calendar/to-do list.
- **Visual progress bars and intervention indicators** on KPI cards and roster tables, echoing
  Blackboard's "student progress monitoring / attention indicators" feedback, so an at-risk
  signal is visible at a glance rather than only as a number.
- **Batch creation + email-based roster enrollment** (`/faculty/batches`) — faculty can create a
  new batch and add students to it by email. If the email matches an existing student account,
  they're just added to the batch; if not, a new student account is created on the spot and a
  one-time temporary password is shown to the faculty member to relay (there's no email delivery
  wired up, so this is a manual hand-off rather than an emailed invite).

Real-time chat, video meetings, native Google Drive integration, and class-code self-enrollment
(Microsoft Teams' and Google Classroom's strengths) were deliberately left out — they need
infrastructure (WebSockets, a video SDK, OAuth to a third-party drive, email delivery)
disproportionate to what a single-department pilot needs, and
the original brief already scoped out anything beyond web-first, evidence-linked review.

## Getting started (local)

You need a PostgreSQL database — a local install, Docker
(`docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16`), or a free hosted one
(Neon, Supabase, Vercel Postgres).

```bash
cp .env.example .env        # then set DATABASE_URL / DATABASE_URL_UNPOOLED and AUTH_SECRET
npm install                 # also runs `prisma generate`
npx prisma migrate deploy   # create tables and apply all migrations
npm run db:seed             # demo department, batches, students, faculty and an admin
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`.

Optional: `DATABASE_POOL_MAX` sets the connection-pool size per server instance (default 10).

### Demo accounts

All accounts use the password `password123`.

| Role | Email | Notes |
|---|---|---|
| Admin | `admin@sou.edu` | Department-wide, read-only analytics |
| Faculty / CC | `priya.sharma@sou.edu` | Course Coordinator — assigned to **both** batches, sees cross-batch cohort analytics |
| Faculty | `anil.mehta@sou.edu` | Batch A only |
| Faculty | `neha.verma@sou.edu` | Batch B only |
| Student | `student01@sou.edu` … `student10@sou.edu` | Batch A |
| Student | `student11@sou.edu` … `student20@sou.edu` | Batch B |

### Suggested demo script

1. **Student** (`student01@sou.edu`) — check the Class Stream/announcements preview and Upcoming
   widget on the dashboard, submit a new project milestone (file + notes), fill in the assigned
   "Milestone 1 Concept Check" test, see live status on the dashboard.
2. **Faculty** (`anil.mehta@sou.edu`) — post an announcement, open the Review Queue, open the
   submission just created, tag evidence, leave feedback, approve it. Grade a short-answer test
   response.
3. **Faculty/CC** (`priya.sharma@sou.edu`) — open Cohort Analytics to see both batches, the trend
   chart, and at-risk students; drill into a batch, then into a student.
4. **Admin** (`admin@sou.edu`) — open the department-wide dashboard, drill into a batch or
   student, generate a PDF report (includes the auto-populated PDC canvas section).

Every review/grade/evidence action is logged with actor + timestamp; the audit trail is visible
on each submission's faculty detail page.

## Architecture notes

- **RBAC is enforced server-side twice, deliberately.** `src/proxy.ts` (Next 16's replacement
  for `middleware.ts`) redirects based on the signed session cookie for UX, but every API route
  and page independently re-checks the session and role via `src/lib/api-guard.ts` and
  `src/lib/permissions.ts`. Next's own docs call this out explicitly: a proxy matcher change
  could silently remove coverage, so nothing relies on proxy alone.
- **KPIs are an append-only time series, never overwritten.** Every submission review or test
  scoring action calls `recomputeKpisForStudentChange()` in `src/lib/kpi.ts`, which inserts new
  `KPI` rows (never edits existing ones). "Current value" reads take the latest row per metric;
  the analytics trend chart reads the full history. This matches the entity spec
  (`computed_at` per record) and means KPIs are always derived, never manually entered.
- **At-risk flag**: no submission/test activity in 14 days, or an average test score under 50%
  (only once a student has at least one scored test response).
- **Evidence-linked review**: every `Evidence` and `Feedback` row links back to a specific
  `Submission` or `TestResponse`, and every mutating action writes an `AuditLog` row
  (actor, action, entity, timestamp).
- **CC cohort scope**: in this pilot, `isCC` grants a faculty member cross-batch analytics
  access to *all* batches in the department (matching the seeded data, where the CC is assigned
  to both batches). If a future cohort needs a CC scoped to a subset of batches, that would need
  a separate scope field rather than reusing `isCC`.
- **PDC Canvas**: the "Project Development Canvas" section of the student PDF report is
  auto-populated (not manually filled in) from milestones (submissions), self-reported
  risks/reflections (short-answer test responses), the evidence trail, and feedback history —
  see `src/lib/pdf/StudentReportDocument.tsx`.

## Live classes

Online video classes (screen sharing, whiteboard, polls, Q&A, breakout rooms, waiting room,
recording, captions and automatic attendance) are built in. They need a free LiveKit account;
see [LIVE_CLASSES.md](LIVE_CLASSES.md) for the 5-minute setup.

## Performance notes

Conventions that keep the portals fast. Please keep to them when adding pages.

- **Current KPI values come from `KPILatest`, history from `KPI`.** Always read current values
  through `getLatestKpis()`. `KPI` is the time series for trend charts and only gets a new row
  when a value changes. Never read the whole `KPI` table to find "the latest" value.
- **Recompute in bulk.** `src/lib/kpi.ts` scores a whole batch with a fixed number of queries.
  Don't call a per-student helper in a loop.
- **One round of queries per page.** Put independent queries in a single `Promise.all`, and scope
  by relation (`batch: { members: { some: { userId } } }`) instead of first fetching batch ids
  and then querying with `{ in: ids }`. Each extra sequential `await` is a full round trip to the
  database.
- **Layouts stay light.** The portal shell (`src/components/university/PortalShell.tsx`) only
  awaits what it must show immediately. Anything else (like the notification bell) streams in
  behind `<Suspense>`.
- **Every portal has a `loading.tsx`.** Navigation shows a skeleton instantly while the next
  page's data loads.
- **Charts are lazy.** Import charts from `@/components/charts/LazyCharts`, never directly from
  `recharts` in a page.
- **No animation library, and no infinite animations.** Motion is plain CSS in
  `src/app/globals.css`, limited to opacity and transform, and one-shot. Avoid `backdrop-blur`
  on sticky or fixed elements; it is re-computed on every scroll frame.

## Deploying to Vercel

### 1. Database

1. Provision a Postgres database (Vercel Postgres, [Neon](https://neon.tech), or
   [Supabase](https://supabase.com) all have free tiers).
2. Set `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, used for migrations) in the
   Vercel project's environment variables, plus a unique `AUTH_SECRET`.
3. The `vercel-build` script runs `prisma migrate deploy` on every deploy, then the seed script
   (which does nothing once any user exists).

### 2. File storage: attach Vercel Blob

`src/lib/storage.ts` already checks for `BLOB_READ_WRITE_TOKEN` and uses Vercel Blob when it's
present, falling back to local disk otherwise. In your Vercel project, add the **Blob** storage
integration — it sets `BLOB_READ_WRITE_TOKEN` automatically, and no code changes are needed.

Note: Vercel Blob objects are stored with `access: "public"` (an unguessable but not
cryptographically authenticated URL) — the app still gates who *sees* the link via RBAC, but
anyone with a leaked link could open the file directly. That's an acceptable tradeoff for a pilot;
add a signed-URL layer before handling more sensitive data.

## Out of scope (by design)

Per the pilot brief: no timed/proctored exams, no plagiarism/anti-cheating detection, no
multi-institution support, no native mobile app (the UI is responsive web-only).

## Known dev-dependency advisory

`npm audit` reports high-severity advisories in `deepmerge-ts` and `mysql2`, both transitive
dependencies of the Prisma **CLI's** own MySQL/config tooling — not used by this app (Postgres
only, no MySQL) and not part of the deployed runtime bundle. The suggested fix
(`npm audit fix --force`) downgrades `prisma` to a version without the driver-adapter
architecture this app is built on, so it's intentionally left as-is.
