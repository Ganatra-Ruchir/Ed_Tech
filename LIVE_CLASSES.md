# Live classes

Online classes with video, built into the portal. Faculty schedule a class for a batch,
students join from the portal, and attendance is tracked automatically.

The video itself runs on [LiveKit](https://livekit.io), an open-source video platform. Your app
issues secure join tokens and stores everything else (schedule, attendance, polls, Q&A,
recordings) in your own database.

## Setup (about 5 minutes)

1. Create a free account at https://cloud.livekit.io and create a project.
2. In the project's **Settings → Keys**, create an API key. Copy the URL (starts with `wss://`),
   the API key and the secret.
3. Add them to `.env` locally and to your Vercel project's environment variables:
   ```
   LIVEKIT_URL="wss://your-project.livekit.cloud"
   LIVEKIT_API_KEY="..."
   LIVEKIT_API_SECRET="..."
   ```
4. Run `npx prisma migrate deploy` (Vercel does this on deploy).
5. Recommended: in LiveKit **Settings → Webhooks**, add `https://<your-domain>/api/livekit/webhook`.
   This makes attendance times exact even when a browser crashes, and marks recordings ready.

You can schedule classes before step 3; the pages show a notice until the keys are added.

### Recording (optional)

Recordings are saved to any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, MinIO).
Set the `LIVEKIT_RECORDING_S3_*` variables from `.env.example`, plus
`LIVEKIT_RECORDING_PUBLIC_BASE_URL` so students can play them. The webhook from step 5 is required
for recordings to show up as ready. Without these variables the record button explains that
recording isn't set up.

### Cost

LiveKit Cloud's free tier is enough for testing and small classes. For a full department, check
current pricing at livekit.io, or self-host LiveKit (it's open source) on your own server.

## What's included

**For everyone in class:** HD video and audio, gallery and speaker views, pin any video,
screen sharing with audio, chat, raise hand, emoji reactions, background blur, a shared
whiteboard (with download as image), live captions (Chrome and Edge), choosing camera and
microphone, polls and Q&A with upvotes and anonymous questions.

**For hosts (the faculty member, course coordinators, admins and the batch's other faculty):**

- Start and end the class for everyone.
- Waiting room with admit, deny and admit all.
- Lock the class.
- Mute one person or everyone, ask someone to unmute, stop someone's video, or remove them.
- Spotlight a video for everyone.
- Lower all hands.
- Control whether students can unmute, start video, share screen or chat.
- Turn live captions on.
- Breakout rooms, assigned automatically or by hand. Hosts can visit any room, message every room
  and close them all.
- Cloud recording, manual or automatic.

**Scheduling and follow-up:**

- Schedule classes per batch.
- Students see live classes in their notification bell.
- Add a class to any calendar app (.ics file) and copy the join link.
- Cancel classes.
- After class there's a report with per-student attendance minutes and percentages (CSV
  download), recordings, poll results and every question asked.
- One click copies attendance into the batch's existing attendance register, with a
  configurable minimum percentage.

## Not included (yet)

Dial-in by phone, live streaming to YouTube, and AI meeting summaries. LiveKit supports the first
two through its SIP and egress-streaming features if you need them later.

## Where the code is

| Area | Location |
|---|---|
| Database models | `LiveClass*` in `prisma/schema.prisma` |
| Tokens, permissions, recording | `src/lib/live/livekit.ts` |
| Access rules, attendance sessions | `src/lib/live/classes.ts` |
| API | `src/app/api/live-classes/**`, `src/app/api/livekit/webhook` |
| Class room UI | `src/components/live/` (`LiveClassRoom` → `RoomStage` + panels) |
| Pages | `/live/[id]` and `/{student,faculty,admin}/live-classes` |
