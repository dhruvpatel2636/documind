import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../types";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

const settingsSchema = z.object({
  chatbotName: z.string().min(1).max(100).optional(),
  systemPrompt: z.string().max(2000).optional(),
  tone: z.enum(["professional", "friendly", "concise", "detailed"]).optional(),
});

export async function getSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const settings = await prisma.chatbotSettings.findUnique({
      where: { userId: req.userId! },
    });
    res.json({
      settings: settings ?? {
        chatbotName: "AI Assistant",
        systemPrompt: null,
        tone: "professional",
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function upsertSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = settingsSchema.parse(req.body);
    const settings = await prisma.chatbotSettings.upsert({
      where: { userId: req.userId! },
      update: data,
      create: { userId: req.userId!, ...data },
    });
    res.json({ settings });
  } catch (error) {
    next(error);
  }
}
