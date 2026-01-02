import { io, Socket } from 'socket.io-client';

const WS_PATH = (import.meta as ImportMeta).env?.VITE_WS_PATH || '/ws';

type Listener = (data: unknown) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();

  private dispatch(event: string, data?: unknown) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    listeners.forEach((callback) => callback(data));
  }

  connect() {
    if (this.socket?.connected) return;

    if (this.socket && !this.socket.connected) {
      this.socket.connect();
      return;
    }

    this.socket = io(window.location.origin, {
      path: WS_PATH,
      autoConnect: true,
      reconnection: true,
    });

    this.socket.on('connect', () => this.dispatch('connect'));
    this.socket.on('disconnect', () => this.dispatch('disconnect'));
    this.socket.on('connect_error', (error) => this.dispatch('connect_error', error));
    this.socket.on('error', (error) => this.dispatch('error', error));

    this.socket.onAny((event, data) => this.dispatch(event, data));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Listener) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    listeners.delete(callback);
    if (listeners.size === 0) this.listeners.delete(event);
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const ws = new WebSocketClient();
