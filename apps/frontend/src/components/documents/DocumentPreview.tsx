"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Globe,
  ExternalLink,
  Hash,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { ChunksResponse, Document, DocumentChunk } from "@/types";
import { apiGet } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DocumentPreviewProps {
  document: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHUNKS_PER_PAGE = 20;

export function DocumentPreview({
  document,
  open,
  onOpenChange,
}: DocumentPreviewProps) {
  const isReady = document.status === "READY";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {document.type === "URL" ? (
              <Globe className="h-5 w-5 text-primary shrink-0" />
            ) : (
              <FileText className="h-5 w-5 text-primary shrink-0" />
            )}
            <DialogTitle className="truncate">{document.name}</DialogTitle>
          </div>
          <DialogDescription>
            {document.type} ·{" "}
            {document._count?.chunks != null
              ? `${document._count.chunks} chunks`
              : "—"}
            {document.pageCount ? ` · ${document.pageCount} pages` : ""}
          </DialogDescription>
        </DialogHeader>

        {!isReady ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border bg-muted/30 py-16 text-center text-sm text-muted-foreground">
            {document.status === "PROCESSING"
              ? "Document is still being processed. Preview will be available once it's ready."
              : "Document processing failed. Nothing to preview."}
          </div>
        ) : (
          <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
            <TabsList className="self-start">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="chunks">
                Chunks
                {document._count?.chunks != null && (
                  <span className="ml-1.5 rounded bg-muted-foreground/15 px-1.5 py-0.5 text-xs">
                    {document._count.chunks}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="preview"
              className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden"
              forceMount
            >
              <PreviewPane document={document} />
            </TabsContent>

            <TabsContent
              value="chunks"
              className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden"
              forceMount
            >
              <ChunksPane documentId={document.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Preview pane ─────────────────────────────────────────────────── */

function PreviewPane({ document }: { document: Document }) {
  if (document.type === "PDF" && document.fileUrl) {
    const fileUrl = document.fileUrl;
    return (
      <div className="flex h-full min-h-[500px] flex-col gap-2">
        <div className="flex shrink-0 items-center justify-end">
          <Button asChild variant="outline" size="sm" className="h-8 gap-2">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              Open in new tab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
        <object
          data={`${fileUrl}#toolbar=1`}
          type="application/pdf"
          className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30"
          aria-label={document.name}
        >
          {/* Shown when the browser can't render the PDF inline. */}
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Inline preview unavailable</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Your browser couldn&apos;t display this PDF inline. Open it in a
                new tab, or check the extracted text in the Chunks tab.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                Open PDF
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </object>
      </div>
    );
  }

  if (document.type === "URL" && document.sourceUrl) {
    return (
      <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-4 rounded-lg border bg-muted/30 p-6 text-center">
        <Globe className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Source URL</p>
          <p className="break-all text-xs text-muted-foreground max-w-md">
            {document.sourceUrl}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a
            href={document.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gap-2"
          >
            Open original
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <p className="mt-4 max-w-sm text-xs text-muted-foreground">
          Open the original page or browse the extracted text in the
          <span className="font-medium"> Chunks </span>
          tab.
        </p>
      </div>
    );
  }

  // TEXT — no fileUrl to embed; we reconstruct from chunks.
  return (
    <TextDocumentPreview documentId={document.id} />
  );
}

function TextDocumentPreview({ documentId }: { documentId: string }) {
  // `content === null` means "still loading". `""` would mean empty doc.
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<ChunksResponse>(`/documents/${documentId}/chunks?page=1&limit=100`)
      .then((res) => {
        if (cancelled) return;
        // Join chunks back into a readable document. Chunks have overlap so
        // this is an approximation, but good enough for inspection.
        setContent(res.chunks.map((c) => c.content).join("\n\n"));
      })
      .catch(() => {
        if (cancelled) return;
        setContent("");
        toast({
          title: "Error",
          description: "Failed to load document text",
          variant: "destructive",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const loading = content === null;
  if (loading) {
    return (
      <div className="space-y-2 rounded-lg border p-6">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-[500px] rounded-lg border bg-muted/20">
      <div className="whitespace-pre-wrap p-6 font-mono text-sm leading-relaxed">
        {content ?? "(no content)"}
      </div>
    </ScrollArea>
  );
}

/* ─── Chunks pane ──────────────────────────────────────────────────── */

function ChunksPane({ documentId }: { documentId: string }) {
  const [page, setPage] = useState(1);
  // We tag `data` with the page it was fetched for so we can derive `loading`
  // = "request in flight for the current page" without setState in the effect.
  const [data, setData] = useState<{
    page: number;
    response: ChunksResponse;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<ChunksResponse>(
      `/documents/${documentId}/chunks?page=${page}&limit=${CHUNKS_PER_PAGE}`,
    )
      .then((response) => {
        if (!cancelled) setData({ page, response });
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Error",
            description: "Failed to load chunks",
            variant: "destructive",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, page]);

  const loading = data === null || data.page !== page;
  const response = data?.response;

  if (!response && loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!response || response.chunks.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No chunks found
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ScrollArea className="min-h-0 flex-1 rounded-lg border bg-muted/10">
        <div className="space-y-3 p-3">
          {response.chunks.map((chunk) => (
            <ChunkCard key={chunk.id} chunk={chunk} />
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs text-muted-foreground">
          Showing {(page - 1) * CHUNKS_PER_PAGE + 1}–
          {(page - 1) * CHUNKS_PER_PAGE + response.chunks.length} of{" "}
          {response.pagination.total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="h-8 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} / {response.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!response.pagination.hasMore || loading}
            className="h-8 gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

function ChunkCard({ chunk }: { chunk: DocumentChunk }) {
  return (
    <div className="rounded-lg border bg-card p-3 transition-colors hover:bg-card/80">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono font-medium text-foreground/80",
          )}
        >
          <Hash className="h-3 w-3" />
          {chunk.chunkIndex}
        </span>
        {chunk.pageNumber != null && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
            Page {chunk.pageNumber}
          </span>
        )}
        {chunk.tokenCount != null && (
          <span className="text-muted-foreground">
            ~{chunk.tokenCount} tokens
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {chunk.content}
      </p>
    </div>
  );
}
