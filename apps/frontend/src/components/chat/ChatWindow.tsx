"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Filter, X, FileText, Globe } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { streamChat, apiGet } from "@/lib/api";
import { ChatSource, Document } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/*
  ChatWindow — the main chat area.

  Document filter: users can scope the RAG search to specific documents.
  The store holds selectedDocumentIds; we expose them here as dismissible chips.
  A "Filter" button opens an inline panel to pick documents.
*/
export function ChatWindow() {
  const {
    messages,
    isStreaming,
    activeChatId,
    selectedDocumentIds,
    addMessage,
    updateLastMessage,
    finalizeLastMessage,
    setIsStreaming,
    setActiveChatId,
    setSelectedDocumentIds,
  } = useChatStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch documents for the filter panel
  useEffect(() => {
    apiGet<{ documents: Document[] }>("/documents")
      .then(({ documents }) => setDocuments(documents.filter((d) => d.status === "READY")))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, []);

  const toggleDocument = (id: string) => {
    setSelectedDocumentIds(
      selectedDocumentIds.includes(id)
        ? selectedDocumentIds.filter((d) => d !== id)
        : [...selectedDocumentIds, id],
    );
  };

  const handleSend = async (message: string) => {
    if (isStreaming) return;

    addMessage({ id: crypto.randomUUID(), role: "user", content: message, createdAt: new Date().toISOString() });
    addMessage({ id: crypto.randomUUID(), role: "assistant", content: "", createdAt: new Date().toISOString(), isStreaming: true });
    setIsStreaming(true);

    let pendingSources: ChatSource[] = [];

    try {
      await streamChat(
        message,
        activeChatId ?? undefined,
        selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        (delta) => updateLastMessage(delta),
        (meta) => {
          if (!activeChatId) setActiveChatId(meta.chatId);
          pendingSources = meta.sources as ChatSource[];
        },
        () => { finalizeLastMessage(pendingSources); setIsStreaming(false); },
        (err) => { toast({ title: "Error", description: err, variant: "destructive" }); finalizeLastMessage([]); setIsStreaming(false); },
      );
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      finalizeLastMessage([]);
      setIsStreaming(false);
    }
  };

  const selectedDocs = documents.filter((d) => selectedDocumentIds.includes(d.id));

  return (
    <div className="flex h-full flex-col">
      {/* ── Message list ───────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div className="max-w-sm">
              <h2 className="text-xl font-semibold tracking-tight">Ask your documents anything</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload documents in the Knowledge Base, then ask questions. The AI answers
                only from your uploaded content.
              </p>
            </div>
            {documents.length === 0 && !docsLoading && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                No documents uploaded yet — head to Knowledge Base to add some.
              </p>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl py-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Document filter chips ──────────────────── */}
      {(selectedDocs.length > 0 || filterOpen) && (
        <div className="border-t bg-muted/30 px-4 py-2">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Searching in:</span>
              {selectedDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => toggleDocument(doc.id)}
                  className="flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                >
                  {doc.type === "URL" ? <Globe className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {doc.name.length > 24 ? doc.name.slice(0, 24) + "…" : doc.name}
                  <X className="h-3 w-3" />
                </button>
              ))}
              {selectedDocs.length > 0 && (
                <button
                  onClick={() => setSelectedDocumentIds([])}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Filter picker panel ───────────────────── */}
      {filterOpen && (
        <div className="border-t bg-card px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Select documents to search (none = search all)
            </p>
            {docsLoading ? (
              <div className="flex gap-2">
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No ready documents yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {documents.map((doc) => {
                  const selected = selectedDocumentIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => toggleDocument(doc.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      {doc.type === "URL" ? <Globe className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                      {doc.name.length > 28 ? doc.name.slice(0, 28) + "…" : doc.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Input ─────────────────────────────────── */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        onFilterToggle={() => setFilterOpen((v) => !v)}
        filterActive={filterOpen || selectedDocumentIds.length > 0}
        filterCount={selectedDocumentIds.length}
      />
    </div>
  );
}
