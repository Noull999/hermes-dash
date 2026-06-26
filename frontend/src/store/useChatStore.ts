import { create } from 'zustand';
import { wsClient } from '@/lib/ws';
import { useHermesStore } from './useHermesStore';

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
    useHermesStore.getState().setOrbState('processing', 'Procesando mensaje…');

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
    // Acumulador de chunks streaming
    let streamingBuffer = '';
    let lastMessageId: string | null = null;

    const unsubMessage = wsClient.onMessage((data: unknown) => {
      const msg = data as Record<string, unknown>;
      const { addMessage, setTyping, messages } = get();

      if (msg.type === 'chunk' && typeof msg.content === 'string') {
        // Acumular chunks del streaming
        streamingBuffer += msg.content;
        setTyping(true);
      } else if (msg.type === 'thinking_removed' && typeof msg.content === 'string') {
        // Thinking filtrado, actualizar buffer con version limpia
        streamingBuffer = msg.content;
      } else if (msg.type === 'done' && typeof msg.content === 'string') {
        setTyping(false);
        useHermesStore.getState().setOrbState('success', 'Respuesta completa');
        setTimeout(() => useHermesStore.getState().setOrbState('idle'), 2000);
        const content = msg.content || streamingBuffer;
        if (content) {
          addMessage({ role: 'assistant', content });
        }
        streamingBuffer = '';
        lastMessageId = null;
      } else if (msg.type === 'response' || msg.type === 'message') {
        setTyping(false);
        useHermesStore.getState().setOrbState('success', 'Respuesta completa');
        setTimeout(() => useHermesStore.getState().setOrbState('idle'), 2000);
        addMessage({
          role: 'assistant',
          content: (msg.content as string) || '',
        });
      } else if (msg.type === 'raw' && typeof msg.content === 'string') {
        setTyping(false);
        addMessage({ role: 'assistant', content: msg.content as string });
      } else if (msg.type === 'error' && typeof msg.content === 'string') {
        setTyping(false);
        useHermesStore.getState().setOrbState('error', 'Error del servidor');
        setTimeout(() => useHermesStore.getState().setOrbState('idle'), 3000);
        addMessage({ role: 'system', content: msg.content as string });
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
