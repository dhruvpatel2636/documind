import { create } from "zustand";
import { Chat, Message, ChatSource } from "@/types";

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  messages: Message[];
  isStreaming: boolean;
  selectedDocumentIds: string[];

  setChats: (chats: Chat[]) => void;
  setActiveChatId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (delta: string) => void;
  finalizeLastMessage: (sources: ChatSource[]) => void;
  setIsStreaming: (v: boolean) => void;
  setSelectedDocumentIds: (ids: string[]) => void;
  addChat: (chat: Chat) => void;
  removeChat: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  messages: [],
  isStreaming: false,
  selectedDocumentIds: [],

  setChats: (chats) => set({ chats }),
  setActiveChatId: (id) => set({ activeChatId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateLastMessage: (delta) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.isStreaming) {
        msgs[msgs.length - 1] = { ...last, content: last.content + delta };
      }
      return { messages: msgs };
    }),
  finalizeLastMessage: (sources) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last) {
        msgs[msgs.length - 1] = { ...last, isStreaming: false, sources };
      }
      return { messages: msgs };
    }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setSelectedDocumentIds: (ids) => set({ selectedDocumentIds: ids }),
  addChat: (chat) => set((s) => ({ chats: [chat, ...s.chats] })),
  removeChat: (id) =>
    set((s) => ({ chats: s.chats.filter((c) => c.id !== id) })),
}));
