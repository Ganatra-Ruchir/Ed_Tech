import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { storeFile } from "@/lib/storage";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function GET(request: Request) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const search = new URL(request.url).searchParams;
  const query = search.get("q")?.trim();
  const conversationId = search.get("conversationId");

  if (query !== undefined && !conversationId) {
    const users = await prisma.user.findMany({ where: { id: { not: session.sub }, OR: [{ name: { contains: query } }, { email: { contains: query } }] }, select: { id: true, name: true, email: true, role: true, profileImageUrl: true }, orderBy: { name: "asc" }, take: 20 });
    return NextResponse.json({ users });
  }

  const conversations = await prisma.conversation.findMany({ where: { members: { some: { userId: session.sub } } }, include: { members: { include: { user: { select: { id: true, name: true, email: true, role: true, profileImageUrl: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } });
  if (!conversationId) return NextResponse.json({ conversations, currentUserId: session.sub });
  const allowed = conversations.some((conversation) => conversation.id === conversationId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const messages = await prisma.message.findMany({ where: { conversationId }, include: { sender: { select: { id: true, name: true, role: true } }, attachments: true }, orderBy: { createdAt: "asc" } });
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: session.sub } },
    data: { lastReadAt: new Date() },
  });
  return NextResponse.json({ messages });
}

const createSchema = z.object({ title: z.string().trim().max(120).optional(), userIds: z.array(z.string()).min(1).max(100), isGroup: z.boolean().default(false) });

export async function POST(request: Request) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const conversationId = String(formData.get("conversationId") ?? "");
    const body = String(formData.get("body") ?? "").trim();
    const file = formData.get("file");
    if (!conversationId || (!body && !(file instanceof File))) return NextResponse.json({ error: "Conversation and message are required" }, { status: 400 });
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId: session.sub } } });
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (file instanceof File && file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File must be 25 MB or smaller" }, { status: 400 });
    const message = await prisma.message.create({ data: { conversationId, senderId: session.sub, body: body || "Attachment" } });
    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await storeFile({ buffer, filename: file.name, contentType: file.type || "application/octet-stream", folder: "messages" });
      await prisma.messageAttachment.create({ data: { messageId: message.id, fileName: file.name, fileUrl: stored.url, storageKey: stored.storageKey, fileType: file.type || "application/octet-stream", fileSize: buffer.byteLength } });
    }
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    const hydratedMessage = await prisma.message.findUnique({
      where: { id: message.id },
      include: { sender: { select: { id: true, name: true, role: true } }, attachments: true },
    });
    return NextResponse.json({ message: hydratedMessage }, { status: 201 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose at least one user" }, { status: 400 });
  const userIds = [...new Set([session.sub, ...parsed.data.userIds])];
  const users = await prisma.user.count({ where: { id: { in: userIds } } });
  if (users !== userIds.length) return NextResponse.json({ error: "One or more users were not found" }, { status: 400 });
  const isGroup = parsed.data.isGroup || userIds.length > 2;
  if (!isGroup) {
    const expectedMemberIds = [...userIds].sort();
    const directConversations = await prisma.conversation.findMany({
      where: { isGroup: false, members: { some: { userId: session.sub } } },
      include: { members: { select: { userId: true } } },
    });
    const existing = directConversations.find((item) => {
      const memberIds = item.members.map((member) => member.userId).sort();
      return memberIds.length === expectedMemberIds.length && memberIds.every((id, index) => id === expectedMemberIds[index]);
    });
    if (existing) return NextResponse.json({ conversation: existing });
  }
  const conversation = await prisma.conversation.create({ data: { title: isGroup ? (parsed.data.title || "New group") : null, isGroup, createdById: session.sub, members: { create: userIds.map((userId) => ({ userId })) } }, include: { members: { include: { user: { select: { id: true, name: true, email: true, role: true, profileImageUrl: true } } } } } });
  return NextResponse.json({ conversation }, { status: 201 });
}
