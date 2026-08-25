// ============================================================
// PLACENIX — CLIENT-SIDE WEBSOCKET ADAPTER
// Connects to the server's WebSocket gateway with auto-reconnect,
// subscription management, and event listeners.
// ============================================================

class RealtimeSocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map(); // eventType -> Set of callbacks
    this.reconnectTimer = null;
    this.isConnected = false;
  }

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('[WebSocket Client] 🟢 Connected to Placenix Real-Time Gateway');
        this.emit('connection_status', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Trigger listeners for specific eventType or general channel
          this.emit(data.eventType || data.type || 'message', data);
          this.emit('*', data);
        } catch (e) {
          console.warn('[WebSocket Client] Raw frame received:', event.data);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.warn('[WebSocket Client] 🔴 Disconnected. Scheduling auto-reconnect in 3s...');
        this.emit('connection_status', { connected: false });
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (err) => {
        console.error('[WebSocket Client] Error:', err);
      };
    } catch (e) {
      console.warn('[WebSocket Client] WebSocket initialization failed:', e.message);
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  }

  emit(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(cb => {
        try { cb(data); } catch (err) { console.error(err); }
      });
    }
  }

  subscribe(channel) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'SUBSCRIBE', channel }));
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const socketClient = new RealtimeSocketClient();
