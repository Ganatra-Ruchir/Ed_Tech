import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { loadAccessibleClass, notifyRefresh } from "@/lib/live/classes";

const schema = z.object({ action: z.enum(["upvote", "answered", "unanswered", "delete"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { id, questionId } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(guard.session, id);
  if (!liveClass) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const question = await prisma.liveClassQuestion.findFirst({ where: { id: questionId, liveClassId: id } });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const userId = guard.session.sub;

  switch (parsed.data.action) {
    case "upvote": {
      const existing = await prisma.liveClassQuestionVote.findUnique({ where: { questionId_userId: { questionId, userId } } });
      if (existing) await prisma.liveClassQuestionVote.delete({ where: { id: existing.id } });
      else await prisma.liveClassQuestionVote.create({ data: { questionId, userId } });
      break;
    }
    case "answered":
    case "unanswered":
      if (!isHost) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await prisma.liveClassQuestion.update({ where: { id: questionId }, data: { answered: parsed.data.action === "answered" } });
      break;
    case "delete":
      if (!isHost && question.authorId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await prisma.liveClassQuestion.delete({ where: { id: questionId } });
      break;
  }
  await notifyRefresh(liveClass, "questions");
  return NextResponse.json({ ok: true });
}
