import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export interface ChunkWithScore {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  similarity: number;
  document: {
    id: string;
    name: string;
    type: string;
  };
}

export interface ChatSource {
  documentId: string;
  documentName: string;
  chunkId: string;
  pageNumber: number | null;
  content: string;
  similarity: number;
}

export interface ProcessDocumentJob {
  documentId: string;
  userId: string;
  fileBuffer?: Buffer;
  fileUrl?: string;
  sourceUrl?: string;
  type: "PDF" | "TEXT" | "URL";
}
