import { useLogStore } from '@/store/useLogStore';

type MessageHandler = (data: unknown) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'reconnecting') => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/chat';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(WS_URL);
      useLogStore.getState().addLog({
        level: 'info', source: 'ws',
        message: `Conectando WS...`,
        details: WS_URL.slice(0, 50),
      });
    } catch (err) {
      console.error('WS connection failed:', err);
      useLogStore.getState().addLog({
        level: 'error', source: 'ws',
        message: 'Error al crear WebSocket',
        details: String(err),
      });
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.notifyStatus('connected');
      useLogStore.getState().addLog({
        level: 'info', source: 'ws', message: 'WebSocket conectado',
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Log errors from server
        if (data.type === 'error') {
          useLogStore.getState().addLog({
            level: 'error', source: 'gateway',
            message: 'Gateway: ' + (data.content || 'error desconocido'),
          });
        }
        this.messageHandlers.forEach((h) => h(data));
      } catch {
        this.messageHandlers.forEach((h) => h({ type: 'raw', content: event.data }));
      }
    };

    this.ws.onclose = () => {
      this.notifyStatus('disconnected');
      this.ws = null;
      if (this.shouldReconnect) {
        useLogStore.getState().addLog({
          level: 'warn', source: 'ws', message: 'WS desconectado, reconectando...',
        });
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      useLogStore.getState().addLog({
        level: 'error', source: 'ws', message: 'Error en WebSocket',
      });
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('Max WS reconnect attempts reached');
      return;
    }

    this.notifyStatus('reconnecting');
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, RECONNECT_DELAY * Math.min(this.reconnectAttempts, 5));
  }

  private notifyStatus(status: 'connected' | 'disconnected' | 'reconnecting') {
    this.statusHandlers.forEach((h) => h(status));
  }
}

export const wsClient = new WebSocketClient();
