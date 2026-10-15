import { prisma } from "@/lib/prisma";

/**
 * Up to five unread conversations for the notification bell, newest first.
 * Single query: the viewer's lastReadAt comes back alongside each message
 * instead of requiring a separate membership lookup first.
 */
export async function getMessageNotifications(userId: string) {
  const messages = await prisma.message.findMany({
    where: {
      senderId: { not: userId },
      conversation: { members: { some: { userId } } },
    },
    select: {
      id: true,
      conversationId: true,
      createdAt: true,
      sender: { select: { name: true } },
      conversation: {
        select: {
          id: true,
          title: true,
          isGroup: true,
          members: { where: { userId }, select: { lastReadAt: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const seenConversations = new Set<string>();
  return messages
    .filter((message) => {
      const lastReadAt = message.conversation.members[0]?.lastReadAt;
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
