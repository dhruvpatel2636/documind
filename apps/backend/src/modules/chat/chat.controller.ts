import { Request, Response, NextFunction } from "express";
import { logger } from "../../infrastructure/logger";
import {
  retrieveRelevantChunks,
  chunksToSources,
  generateRAGResponseStream,
} from "../rag";
import { chatRequestSchema } from "./chat.schema";
import {
  getOrCreateChat,
  saveUserMessage,
  saveAssistantMessage,
  getChatHistory,
  getUserSettings,
  getChatById,
  listUserChats,
  deleteUserChat,
} from "./chat.service";

/**
 * Streaming RAG chat endpoint (SSE).
 * Note: this handler manages its own error reporting once headers are sent.
 */
export async function chat(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.userId!;
  const { message, chatId, documentIds } = chatRequestSchema.parse(req.body);

  try {
    const currentChatId = await getOrCreateChat(userId, chatId, message);

    await saveUserMessage(currentChatId, message);

    const [history, settings, chunks] = await Promise.all([
      getChatHistory(currentChatId),
      getUserSettings(userId),
      retrieveRelevantChunks(message, userId, documentIds),
    ]);

    logger.info(`Retrieved ${chunks.length} chunks for query`, { userId });

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const sources = chunksToSources(chunks);
    res.write(
      `data: ${JSON.stringify({ type: "meta", chatId: currentChatId, sources })}\n\n`,
    );

    const chatHistory = history.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let fullContent = "";
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

    await saveAssistantMessage(currentChatId, fullContent, sources);

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    logger.error("Chat error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (!res.headersSent) {
      next(error);
      return;
    }
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message:
          error instanceof Error ? error.message : "Stream error occurred",
      })}\n\n`,
    );
    res.end();
  }
}

export async function getChat(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const chat = await getChatById(id, req.userId!);
  res.json({ chat });
}

export async function listChats(req: Request, res: Response): Promise<void> {
  const chats = await listUserChats(req.userId!);
  res.json({ chats });
}

export async function deleteChat(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  await deleteUserChat(id, req.userId!);
  res.json({ message: "Chat deleted" });
}
