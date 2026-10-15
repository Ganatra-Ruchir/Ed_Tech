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
  const polls = await prisma.liveClassPoll.findMany({
    where: { liveClassId: id },
    include: { votes: { select: { userId: true, optionIndex: true, user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    polls: polls.map((p) => {
      const options = JSON.parse(p.optionsJson) as string[];
      const counts = options.map((_, i) => p.votes.filter((v) => v.optionIndex === i).length);
      const mine = p.votes.find((v) => v.userId === guard.session.sub)?.optionIndex ?? null;
      // Students see results once they've voted or the poll is closed.
      const showResults = isHost || mine !== null || !p.isOpen;
      return {
        id: p.id,
        question: p.question,
        options,
        anonymous: p.anonymous,
        isOpen: p.isOpen,
        totalVotes: p.votes.length,
        counts: showResults ? counts : null,
        myVote: mine,
        voters: isHost && !p.anonymous ? p.votes.map((v) => ({ name: v.user.name, optionIndex: v.optionIndex })) : [],
      };
    }),
  });
}

const createSchema = z.object({
  question: z.string().trim().min(1).max(300),
  options: z.array(z.string().trim().min(1).max(120)).min(2).max(8),
  anonymous: z.boolean().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(guard.session, id);
  if (!liveClass || !isHost) return NextResponse.json({ error: "Only hosts can create polls." }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A poll needs a question and 2–8 options." }, { status: 400 });
  const poll = await prisma.liveClassPoll.create({
    data: { liveClassId: id, question: parsed.data.question, optionsJson: JSON.stringify(parsed.data.options), anonymous: parsed.data.anonymous },
  });
  await notifyRefresh(liveClass, "polls");
  return NextResponse.json({ poll: { id: poll.id } }, { status: 201 });
}
