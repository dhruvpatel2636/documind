import { z } from "zod";

export const settingsSchema = z.object({
  chatbotName: z.string().min(1).max(100).optional(),
  systemPrompt: z.string().max(2000).optional(),
  tone: z.enum(["professional", "friendly", "concise", "detailed"]).optional(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS = {
  chatbotName: "AI Assistant",
  systemPrompt: null,
  tone: "professional",
} as const;
