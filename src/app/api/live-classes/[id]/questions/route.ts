import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { loadAccessibleClass, notifyRefresh } from "@/lib/live/classes";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(guard.session, id);
  if (!liveClass) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const questions = await prisma.liveClassQuestion.findMany({
    where: { liveClassId: id },
    include: { author: { select: { name: true } }, votes: { select: { userId: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    questions: questions
      .map((q) => ({
        id: q.id,
        text: q.text,
        answered: q.answered,
        createdAt: q.createdAt,
        author: q.anonymous && !isHost ? "Anonymous" : q.anonymous ? `${q.author.name} (anonymous to class)` : q.author.name,
        mine: q.authorId === guard.session.sub,
        upvotes: q.votes.length,
        upvotedByMe: q.votes.some((v) => v.userId === guard.session.sub),
      }))
      .sort((a, b) => Number(a.answered) - Number(b.answered) || b.upvotes - a.upvotes),
  });
}

const schema = z.object({ text: z.string().trim().min(1).max(500), anonymous: z.boolean().default(false) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { liveClass } = await loadAccessibleClass(guard.session, id);
  if (!liveClass) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write a question first." }, { status: 400 });
  await prisma.liveClassQuestion.create({ data: { liveClassId: id, authorId: guard.session.sub, ...parsed.data } });
  await notifyRefresh(liveClass, "questions");
  return NextResponse.json({ ok: true }, { status: 201 });
}
