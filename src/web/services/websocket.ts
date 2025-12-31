/**
 * WebSocket Client
 * Socket.IO client for real-time communication
 */

import { io, Socket } from 'socket.io-client';

const WS_URL = '/ws';

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      autoConnect: true,
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Handle general message routing
    this.socket.onAny((event, data) => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.forEach((callback) => callback(data));
      }
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: unknown) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const ws = new WebSocketClient();
