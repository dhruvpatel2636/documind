"use client";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatHistory } from "@/components/chat/ChatHistory";
import { useChatStore } from "@/store/chatStore";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const { setActiveChatId, setMessages } = useChatStore();

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <ChatHistory />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h1 className="text-lg font-semibold">Chat</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}
