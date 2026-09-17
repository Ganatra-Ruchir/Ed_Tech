# Student Progress & Evaluation Platform

A role-based web app that replaces spreadsheets/email for project supervision with a
single evidence-linked workflow — built for a Silver Oak University department pilot
(one semester, a few hundred students).

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript)
- **Prisma 7** ORM with the new driver-adapter architecture
  - **SQLite** (via `@prisma/adapter-better-sqlite3`) for local dev — zero setup, no external DB needed
  - Swappable to **PostgreSQL** for production (see [Deploying to Vercel](#deploying-to-vercel))
- **Custom session auth** — signed JWT in an httpOnly cookie (`jose` + `bcryptjs`), not NextAuth.
  Next.js 16 renamed `middleware` to `proxy` and dropped the Edge runtime for it in favor of
  Node.js, which made a from-scratch implementation simpler and more predictable than pulling
  in a library built around the old model.
- **Recharts** for the analytics trend chart
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

```bash
npm install
npx prisma migrate deploy   # create prisma/dev.db and apply migrations
npx prisma generate         # generate the Prisma client into src/generated/prisma
npm run db:seed             # seed 1 department, 2 batches, 20 students, 3 faculty, 1 admin, sample data
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`.

Copy `.env.example` to `.env` if you want to customize `AUTH_SECRET` (a working default is
already provided for local dev).

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

## Deploying to Vercel

Two things need to change before this pilot runs on Vercel — Vercel's serverless functions have
a read-only, ephemeral filesystem, so the local SQLite file and local-disk uploads/reports won't
persist there.

### 1. Database: switch to PostgreSQL

The schema (`prisma/schema.prisma`) already avoids SQLite-only workarounds beyond what's needed,
so the swap is small:

1. Provision a Postgres database (Vercel Postgres, [Neon](https://neon.tech), or
   [Supabase](https://supabase.com) all have free tiers).
2. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```
3. Install the Postgres driver adapter: `npm install @prisma/adapter-pg pg`
4. In `src/lib/prisma.ts`, swap the adapter:
   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
   ```
5. Set `DATABASE_URL` in Vercel's project environment variables to your Postgres connection string.
6. Run `npx prisma migrate deploy` against that database (e.g. from CI or locally with the prod
   `DATABASE_URL`), then `npm run db:seed` if you want the same demo data there.

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
dependencies of the Prisma **CLI's** own MySQL/config tooling — not used by this app (SQLite/Postgres
only, no MySQL) and not part of the deployed runtime bundle. The suggested fix
(`npm audit fix --force`) downgrades `prisma` to a version without the driver-adapter
architecture this app is built on, so it's intentionally left as-is.
