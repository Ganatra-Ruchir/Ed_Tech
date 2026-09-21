import { prisma } from "@/lib/prisma";

export async function getMessageNotifications(userId: string) {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  });
  if (memberships.length === 0) return [];

  const lastReadByConversation = new Map(memberships.map((membership) => [membership.conversationId, membership.lastReadAt]));
  const messages = await prisma.message.findMany({
    where: { conversationId: { in: memberships.map((membership) => membership.conversationId) }, senderId: { not: userId } },
    include: { sender: { select: { name: true } }, conversation: { select: { id: true, title: true, isGroup: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const seenConversations = new Set<string>();
  return messages
    .filter((message) => {
      const lastReadAt = lastReadByConversation.get(message.conversationId);
      if (lastReadAt && message.createdAt <= lastReadAt) return false;
      if (seenConversations.has(message.conversationId)) return false;
      seenConversations.add(message.conversationId);
      return true;
    })
    .slice(0, 5)
    .map((message) => ({
      id: `message:${message.id}`,
      title: `${message.sender.name} sent you a message`,
      detail: message.conversation.isGroup ? `${message.conversation.title ?? "Group"} · Open conversation` : "Open your conversation",
      href: `/messages?conversationId=${encodeURIComponent(message.conversation.id)}`,
    }));
}
