"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Link, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiUpload, apiPost } from "@/lib/api";
import { Document } from "@/types";
import { toast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  onUploaded: (doc: Document) => void;
}

export function DocumentUpload({ onUploaded }: DocumentUploadProps) {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [url, setUrl] = useState("");
  const [urlName, setUrlName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    setPendingFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxSize: 50 * 1024 * 1024,
    disabled: uploading,
  });

  const handleUploadFiles = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    try {
      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const { document } = await apiUpload<{ document: Document }>(
          "/documents/upload",
          formData,
        );
        onUploaded(document);
        toast({
          title: "Uploaded",
          description: `${file.name} is being processed`,
        });
      }
      setPendingFiles([]);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadUrl = async () => {
    if (!url) return;
    setUploading(true);
    try {
      const { document } = await apiPost<{ document: Document }>(
        "/documents/upload-url",
        {
          url,
          name: urlName || undefined,
        },
      );
      onUploaded(document);
      toast({
        title: "URL submitted",
        description: "Content is being scraped and processed",
      });
      setUrl("");
      setUrlName("");
    } catch (err) {
      toast({
        title: "Failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "file" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("file")}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Upload File
        </Button>
        <Button
          variant={mode === "url" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("url")}
          className="gap-2"
        >
          <Link className="h-4 w-4" />
          Add URL
        </Button>
      </div>

      {mode === "file" ? (
        <div className="space-y-3">
          <div
            {...getRootProps()}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50",
              uploading && "pointer-events-none opacity-50",
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              {isDragActive
                ? "Drop files here"
                : "Drag & drop or click to upload"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, TXT up to 50MB
            </p>
          </div>

          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              {pendingFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <button
                    onClick={() =>
                      setPendingFiles((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                onClick={handleUploadFiles}
                disabled={uploading}
                className="w-full gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload {pendingFiles.length} file
                {pendingFiles.length > 1 ? "s" : ""}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={uploading}
          />
          <Input
            placeholder="Document name (optional)"
            value={urlName}
            onChange={(e) => setUrlName(e.target.value)}
            disabled={uploading}
          />
          <Button
            onClick={handleUploadUrl}
            disabled={uploading || !url}
            className="w-full gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link className="h-4 w-4" />
            )}
            Add URL
          </Button>
        </div>
      )}
    </div>
  );
}
