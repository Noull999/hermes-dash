import { create } from 'zustand';
import { wsClient } from '@/lib/ws';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;

  // Actions
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  sendMessage: (content: string) => void;
  setTyping: (typing: boolean) => void;
  setConnected: (connected: boolean) => void;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
}

let msgCounter = 0;
function nextId() {
  msgCounter++;
  return `msg_${Date.now()}_${msgCounter}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isConnected: false,
  isTyping: false,

  addMessage: (msg) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: nextId(),
      timestamp: new Date(),
    };
    set((s) => ({ messages: [...s.messages, newMsg] }));
  },

  sendMessage: (content) => {
    const { addMessage } = get();
    addMessage({ role: 'user', content });
    set({ isTyping: true });

    const sent = wsClient.send({ type: 'message', content });
    if (!sent) {
      // Fallback: add a system message if WS not connected
      addMessage({
        role: 'system',
        content: '⚠️ No conectado al servidor. Intenta de nuevo.',
      });
      set({ isTyping: false });
    }
  },

  setTyping: (typing) => set({ isTyping: typing }),

  setConnected: (connected) => set({ isConnected: connected }),

  connect: () => {
    const unsubMessage = wsClient.onMessage((data: unknown) => {
      const msg = data as Record<string, unknown>;
      const { addMessage, setTyping } = get();

      if (msg.type === 'response' || msg.type === 'message') {
        setTyping(false);
        addMessage({
          role: 'assistant',
          content: (msg.content as string) || '',
        });
      } else if (msg.type === 'typing') {
        setTyping(true);
      } else if (msg.type === 'raw' && typeof msg.content === 'string') {
        setTyping(false);
        addMessage({ role: 'assistant', content: msg.content as string });
      }
    });

    const unsubStatus = wsClient.onStatus((status) => {
      set({
        isConnected: status === 'connected',
        isTyping: status === 'reconnecting' ? false : get().isTyping,
      });
    });

    wsClient.connect();
    set({ isConnected: true });
  },

  disconnect: () => {
    wsClient.disconnect();
    set({ isConnected: false });
  },

  clearMessages: () => set({ messages: [] }),
}));
