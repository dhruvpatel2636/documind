"use client";

import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { DocumentList } from "@/components/documents/DocumentList";
import { Document } from "@/types";
import { apiGet } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const { documents } = await apiGet<{ documents: Document[] }>(
        "/documents",
      );
      setDocuments(documents);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploaded = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Knowledge Base</h1>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden p-6">
        {/* Upload panel */}
        <div className="w-80 shrink-0">
          <h2 className="mb-3 text-sm font-semibold">Add Documents</h2>
          <DocumentUpload onUploaded={handleUploaded} />
        </div>

        <Separator orientation="vertical" />

        {/* Document list */}
        <div className="flex-1 overflow-y-auto">
          <h2 className="mb-3 text-sm font-semibold">Your Documents</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : (
            <DocumentList
              documents={documents}
              onDelete={handleDelete}
              onRefresh={fetchDocuments}
            />
          )}
        </div>
      </div>
    </div>
  );
}
