import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../types";
import {
  retrieveRelevantChunks,
  generateRAGResponseStream,
} from "../services/ragService";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import logger from "../lib/logger";

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  chatId: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
});

export async function chat(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.userId!;
    const { message, chatId, documentIds } = chatSchema.parse(req.body);

    // Get or create chat
    let currentChatId = chatId;
    if (!currentChatId) {
      const newChat = await prisma.chat.create({
        data: {
          userId,
          title: message.substring(0, 60) + (message.length > 60 ? "..." : ""),
        },
      });
      currentChatId = newChat.id;
    } else {
      // Verify ownership
      const existingChat = await prisma.chat.findFirst({
        where: { id: currentChatId, userId },
      });
      if (!existingChat) throw new AppError(404, "Chat not found");
    }

    // Save user message
    await prisma.message.create({
      data: { chatId: currentChatId, role: "user", content: message },
    });

    // Get chat history for context
    const history = await prisma.message.findMany({
      where: { chatId: currentChatId },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { role: true, content: true },
    });

    // Get user settings
    const settings = await prisma.chatbotSettings.findUnique({
      where: { userId },
    });

    // Retrieve relevant chunks
    const chunks = await retrieveRelevantChunks(message, userId, documentIds);
    logger.info(`Retrieved ${chunks.length} chunks for query`, { userId });

    // Set up SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Send chatId and sources first
    const sources = chunks.map((c) => ({
      documentId: c.documentId,
      documentName: c.document.name,
      chunkId: c.id,
      pageNumber: c.pageNumber,
      content:
        c.content.substring(0, 200) + (c.content.length > 200 ? "..." : ""),
      similarity: Math.round(c.similarity * 100) / 100,
    }));

    res.write(
      `data: ${JSON.stringify({ type: "meta", chatId: currentChatId, sources })}\n\n`,
    );

    // Stream AI response
    let fullContent = "";
    const chatHistory = history
      .slice(0, -1)
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const stream = generateRAGResponseStream(message, chunks, chatHistory, {
      chatbotName: settings?.chatbotName,
      systemPrompt: settings?.systemPrompt ?? undefined,
      tone: settings?.tone,
    });

    for await (const delta of stream) {
      fullContent += delta;
      res.write(
        `data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`,
      );
    }
    // Save assistant message
    await prisma.message.create({
      data: {
        chatId: currentChatId,
        role: "assistant",
        content: fullContent,
        sources: sources as object,
      },
    });

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    logger.error("Chat error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (!res.headersSent) {
      next(error);
    } else {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Stream error occurred" })}\n\n`,
      );
      res.end();
    }
  }
}

export async function getChat(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const chat = await prisma.chat.findFirst({
      where: { id, userId: req.userId! },
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
    if (!chat) throw new AppError(404, "Chat not found");
    res.json({ chat });
  } catch (error) {
    next(error);
  }
}

export async function listChats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    res.json({ chats });
  } catch (error) {
    next(error);
  }
}

export async function deleteChat(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const chat = await prisma.chat.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!chat) throw new AppError(404, "Chat not found");
    await prisma.chat.delete({ where: { id } });
    res.json({ message: "Chat deleted" });
  } catch (error) {
    next(error);
  }
}
