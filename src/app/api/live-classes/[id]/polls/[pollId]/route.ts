import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { loadAccessibleClass, notifyRefresh } from "@/lib/live/classes";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("vote"), optionIndex: z.number().int().min(0) }),
  z.object({ action: z.literal("close") }),
  z.object({ action: z.literal("reopen") }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string; pollId: string }> }) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { id, pollId } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(guard.session, id);
  if (!liveClass) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const poll = await prisma.liveClassPoll.findFirst({ where: { id: pollId, liveClassId: id } });
  if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (parsed.data.action === "vote") {
    const options = JSON.parse(poll.optionsJson) as string[];
    if (!poll.isOpen) return NextResponse.json({ error: "This poll is closed." }, { status: 400 });
    if (parsed.data.optionIndex >= options.length) return NextResponse.json({ error: "Invalid option" }, { status: 400 });
    await prisma.liveClassPollVote.upsert({
      where: { pollId_userId: { pollId, userId: guard.session.sub } },
      create: { pollId, userId: guard.session.sub, optionIndex: parsed.data.optionIndex },
      update: { optionIndex: parsed.data.optionIndex },
    });
  } else {
    if (!isHost) return NextResponse.json({ error: "Only hosts can close polls." }, { status: 403 });
    await prisma.liveClassPoll.update({ where: { id: pollId }, data: { isOpen: parsed.data.action === "reopen" } });
  }
  await notifyRefresh(liveClass, "polls");
  return NextResponse.json({ ok: true });
}
