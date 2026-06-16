import { z } from "zod";

export const uploadUrlSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(255).optional(),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

export const documentTypeSchema = z.enum(["PDF", "TEXT", "URL"]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const chunksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ChunksQuery = z.infer<typeof chunksQuerySchema>;

export interface ProcessDocumentJob {
  documentId: string;
  userId: string;
  fileBuffer?: Buffer;
  fileUrl?: string;
  sourceUrl?: string;
  type: DocumentType;
}
