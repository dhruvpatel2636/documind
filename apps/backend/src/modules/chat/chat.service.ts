import { prisma } from "../../infrastructure/database/prisma";
import { NotFoundError } from "../../shared/errors/app-error";

/**
 * Service layer for chat persistence (CRUD on chats + messages).
 * The RAG retrieval/generation lives in the rag module.
 */

export async function getOrCreateChat(
  userId: string,
  chatId: string | undefined,
  firstMessage: string,
): Promise<string> {
  if (chatId) {
    const existing = await prisma.chat.findFirst({
      where: { id: chatId, userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("Chat");
    return existing.id;
  }

  const title =
    firstMessage.substring(0, 60) + (firstMessage.length > 60 ? "..." : "");
  const created = await prisma.chat.create({
    data: { userId, title },
    select: { id: true },
  });
  return created.id;
}

export async function saveUserMessage(
  chatId: string,
  content: string,
): Promise<void> {
  await prisma.message.create({
    data: { chatId, role: "user", content },
  });
}

export async function saveAssistantMessage(
  chatId: string,
  content: string,
  sources: object,
): Promise<void> {
  await prisma.message.create({
    data: { chatId, role: "assistant", content, sources },
  });
}

export async function getChatHistory(
  chatId: string,
  limit = 10,
): Promise<Array<{ role: string; content: string }>> {
  // Fetch the most recent `limit` messages, then restore chronological order.
  // Ordering ascending with `take` would always return the *oldest* messages,
  // starving long conversations of recent context.
  const recent = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { role: true, content: true },
  });
  return recent.reverse();
}

export async function getUserSettings(userId: string) {
  return prisma.chatbotSettings.findUnique({ where: { userId } });
}

export async function getChatById(id: string, userId: string) {
  const chat = await prisma.chat.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          sources: true,
          createdAt: true,
        },
      },
    },
  });
  if (!chat) throw new NotFoundError("Chat");
  return chat;
}

export async function listUserChats(userId: string) {
  return prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

export async function deleteUserChat(
  id: string,
  userId: string,
): Promise<void> {
  const chat = await prisma.chat.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!chat) throw new NotFoundError("Chat");
  await prisma.chat.delete({ where: { id } });
}
