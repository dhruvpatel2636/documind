"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onFilterToggle?: () => void;
  filterActive?: boolean;
  filterCount?: number;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask a question about your documents…",
  onFilterToggle,
  filterActive,
  filterCount = 0,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="border-t bg-background px-4 py-4">
      <div className="mx-auto max-w-3xl space-y-2">
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border bg-background px-3 py-2.5 shadow-sm transition-shadow",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
          )}
        >
          {/* Document filter toggle */}
          {onFilterToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0 self-end",
                filterActive ? "text-primary" : "text-muted-foreground",
              )}
              onClick={onFilterToggle}
              aria-label="Toggle document filter"
              title="Filter by document"
            >
              <Filter className="h-4 w-4" />
              {filterCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {filterCount}
                </span>
              )}
            </Button>
          )}

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="min-h-9 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <Button
            size="icon"
            className="h-8 w-8 shrink-0 self-end"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Enter to send · Shift+Enter for new line
          {filterCount > 0 && ` · Searching ${filterCount} document${filterCount > 1 ? "s" : ""}`}
        </p>
      </div>
    </div>
  );
}
