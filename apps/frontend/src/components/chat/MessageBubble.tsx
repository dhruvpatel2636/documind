"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp, FileText, Bot, User } from "lucide-react";
import { Message, ChatSource } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";
  const sources = message.sources as ChatSource[] | undefined;

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar — 44px for accessibility touch target */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
          isUser
            ? "bg-primary text-primary-foreground ring-primary/20"
            : "bg-muted text-muted-foreground ring-border",
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn("flex max-w-[78%] flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className={cn(
                "prose prose-sm max-w-none dark:prose-invert",
                message.isStreaming && "streaming-cursor",
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || " "}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources — only on AI messages */}
        {!isUser && sources && sources.length > 0 && (
          <div className="w-full space-y-1.5">
            {/* Toggle button — 44px touch target */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
              onClick={() => setShowSources((v) => !v)}
              aria-expanded={showSources}
              aria-label={`${showSources ? "Hide" : "Show"} ${sources.length} source${sources.length > 1 ? "s" : ""}`}
            >
              <FileText className="h-3.5 w-3.5" />
              {sources.length} source{sources.length > 1 ? "s" : ""}
              {showSources ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {showSources && (
              <div className="space-y-2">
                {sources.map((source, i) => (
                  <div key={i} className="rounded-xl border bg-card p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">{source.documentName}</span>
                      {source.pageNumber && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          Page {source.pageNumber}
                        </span>
                      )}
                      <span className="ml-auto rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        {Math.round(source.similarity * 100)}% match
                      </span>
                    </div>
                    <p className="mt-2 text-muted-foreground line-clamp-2 leading-relaxed">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
