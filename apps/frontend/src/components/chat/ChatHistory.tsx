"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Trash2, MessagesSquare } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { apiGet, apiDelete } from "@/lib/api";
import { Chat } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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

export function ChatHistory() {
  const {
    chats,
    activeChatId,
    setChats,
    setActiveChatId,
    setMessages,
    removeChat,
  } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ chats: Chat[] }>("/chat")
      .then(({ chats }) => setChats(chats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setChats]);

  const handleSelectChat = async (chatId: string) => {
    if (chatId === activeChatId) return;
    setLoadingChatId(chatId);
    setActiveChatId(chatId);
    try {
      const { chat } = await apiGet<{ chat: Chat }>(`/chat/${chatId}`);
      setMessages(chat.messages ?? []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load chat",
        variant: "destructive",
      });
    } finally {
      setLoadingChatId(null);
    }
  };

  const handleDelete = async (chatId: string) => {
    try {
      await apiDelete(`/chat/${chatId}`);
      removeChat(chatId);
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex w-64 shrink-0 flex-col border-r bg-card">
      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Recent Chats
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-2 pb-2">
          {loading ? (
            // Skeleton loaders while fetching
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-2 py-2.5"
              >
                <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
                <Skeleton className="h-3 flex-1 rounded" />
              </div>
            ))
          ) : chats.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <MessagesSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No chats yet</p>
              <p className="text-[11px] text-muted-foreground/60">
                Start a conversation below
              </p>
            </div>
          ) : (
            chats.map((chat) => {
              const active = activeChatId === chat.id;
              const isLoading = loadingChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors",
                    active ? "bg-primary/10" : "hover:bg-accent",
                  )}
                >
                  <button
                    className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                    onClick={() => handleSelectChat(chat.id)}
                    aria-current={active ? "page" : undefined}
                  >
                    <MessageSquare
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "truncate text-xs",
                        active
                          ? "font-medium text-primary"
                          : "text-muted-foreground",
                        isLoading && "opacity-60",
                      )}
                    >
                      {chat.title}
                    </span>
                  </button>

                  {/* Delete with AlertDialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong className="text-foreground">
                            &ldquo;{chat.title}&rdquo;
                          </strong>{" "}
                          and all its messages will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(chat.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
