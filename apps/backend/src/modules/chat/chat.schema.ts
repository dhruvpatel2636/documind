import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  chatId: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
