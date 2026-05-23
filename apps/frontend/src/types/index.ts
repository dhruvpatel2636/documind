export interface Document {
  id: string;
  name: string;
  fileUrl: string | null;
  sourceUrl: string | null;
  type: "PDF" | "TEXT" | "URL";
  status: "PROCESSING" | "READY" | "FAILED";
  pageCount: number | null;
  createdAt: string;
  _count?: { chunks: number };
}

export interface ChatSource {
  documentId: string;
  documentName: string;
  chunkId: string;
  pageNumber: number | null;
  content: string;
  similarity: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  createdAt: string;
  isStreaming?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
  messages?: Message[];
}

export interface ChatbotSettings {
  chatbotName: string;
  systemPrompt: string | null;
  tone: "professional" | "friendly" | "concise" | "detailed";
}
