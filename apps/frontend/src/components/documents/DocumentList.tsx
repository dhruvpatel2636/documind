"use client";

import { useState } from "react";
import { FileText, Globe, Trash2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { apiDelete } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const statusConfig = {
  READY: {
    label: "Ready",
    icon: CheckCircle,
    className: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  PROCESSING: {
    label: "Processing",
    icon: Clock,
    className: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  FAILED: {
    label: "Failed",
    icon: XCircle,
    className: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
  },
};

function DeleteConfirm({ name, onConfirm, disabled }: { name: string; onConfirm: () => void; disabled: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          disabled={disabled}
          aria-label={`Delete ${name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground">&ldquo;{name}&rdquo;</strong> and all its embedded
            chunks will be permanently removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DocumentList({ documents, onDelete, onRefresh }: DocumentListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    setDeleting(id);
    try {
      await apiDelete(`/documents/${id}`);
      onDelete(id);
      toast({ title: "Deleted", description: `"${name}" has been removed` });
    } catch {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm font-medium">No documents yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Upload a PDF or add a URL to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </span>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => {
          const status = statusConfig[doc.status];
          const StatusIcon = status.icon;

          return (
            <div
              key={doc.id}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-shadow hover:shadow-sm"
            >
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {doc.type === "URL" ? (
                  <Globe className="h-5 w-5 text-primary" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{doc.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(doc.createdAt)}</span>
                  {doc.pageCount && <span>· {doc.pageCount}p</span>}
                  {doc._count?.chunks != null && <span>· {doc._count.chunks} chunks</span>}
                </div>
              </div>

              {/* Status badge */}
              <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", status.bg, status.className)}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </div>

              {/* Delete */}
              <DeleteConfirm
                name={doc.name}
                onConfirm={() => handleDelete(doc.id, doc.name)}
                disabled={deleting === doc.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
