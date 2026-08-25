// ============================================================
// PLACENIX — WEBSOCKET REAL-TIME BIDIRECTIONAL GATEWAY
// Demonstrates:
// 1. RFC 6455 WebSocket Handshake & Frame Encoding/Decoding
// 2. Pub/Sub Channel Architecture (drives, slots, notifications)
// 3. Heartbeat Liveness Probes & Connection Lifecycle Management
// 4. Low-Latency Real-Time Event Dispatching
// ============================================================

import crypto from 'crypto';

const WS_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class WebSocketGateway {
  constructor() {
    this.clients = new Set();
    this.channels = new Map(); // channelName -> Set of clients
    this.eventHistory = [];
  }

  /**
   * Handles HTTP Upgrade request to establish RFC 6455 WebSocket handshake
   */
  handleUpgrade(req, socket, head) {
    const secKey = req.headers['sec-websocket-key'];
    if (!secKey) {
      socket.destroy();
      return;
    }

    // Compute Sec-WebSocket-Accept key
    const acceptKey = crypto
      .createHash('sha1')
      .update(secKey + WS_MAGIC_STRING)
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      ''
    ];

    socket.write(headers.join('\r\n') + '\r\n');

    const client = {
      id: 'ws_client_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      socket,
      ip: req.socket.remoteAddress,
      connectedAt: new Date().toISOString(),
      channels: new Set(['general', 'drives'])
    };

    this.clients.add(client);
    this.subscribeClientToChannel(client, 'general');
    this.subscribeClientToChannel(client, 'drives');

    // Send initial welcome & system state frame
    this.sendToClient(client, {
      type: 'SYSTEM_WELCOME',
      clientId: client.id,
      message: 'Connected to Placenix Real-Time Gateway (WebSocket)',
      timestamp: new Date().toISOString(),
      subscribedChannels: Array.from(client.channels)
    });

    socket.on('data', (buffer) => {
      this.handleIncomingFrame(client, buffer);
    });

    socket.on('close', () => {
      this.removeClient(client);
    });

    socket.on('error', (err) => {
      console.error(`[WebSocket] Client ${client.id} error:`, err.message);
      this.removeClient(client);
    });

    console.log(`[WebSocket] 🟢 Client connected: ${client.id} (Total: ${this.clients.size})`);
  }

  /**
   * Decodes incoming WebSocket binary frame (handles unmasking per RFC 6455)
   */
  handleIncomingFrame(client, buffer) {
    if (buffer.length < 2) return;

    const firstByte = buffer[0];
    const secondByte = buffer[1];
    const opcode = firstByte & 0x0f;
    const isMasked = (secondByte & 0x80) === 0x80;

    // Opcode 8 = Connection Close Frame
    if (opcode === 8) {
      this.removeClient(client);
      return;
    }

    // Opcode 9 = Ping Frame (Respond with Pong)
    if (opcode === 9) {
      this.sendPongFrame(client.socket);
      return;
    }

    // Text Frame (Opcode 1)
    if (opcode === 1) {
      let payloadLength = secondByte & 0x7f;
      let maskOffset = 2;

      if (payloadLength === 126) {
        payloadLength = buffer.readUInt16BE(2);
        maskOffset = 4;
      } else if (payloadLength === 127) {
        payloadLength = Number(buffer.readBigUInt64BE(2));
        maskOffset = 10;
      }

      if (isMasked) {
        const maskingKey = buffer.slice(maskOffset, maskOffset + 4);
        const maskedData = buffer.slice(maskOffset + 4, maskOffset + 4 + payloadLength);
        const unmaskedData = Buffer.alloc(payloadLength);

        for (let i = 0; i < payloadLength; i++) {
          unmaskedData[i] = maskedData[i] ^ maskingKey[i % 4];
        }

        const messageText = unmaskedData.toString('utf8');
        this.processClientMessage(client, messageText);
      }
    }
  }

  processClientMessage(client, text) {
    try {
      const data = JSON.parse(text);
      if (data.action === 'SUBSCRIBE' && data.channel) {
        this.subscribeClientToChannel(client, data.channel);
        this.sendToClient(client, { type: 'SUBSCRIBED', channel: data.channel, timestamp: new Date().toISOString() });
      } else if (data.action === 'PING') {
        this.sendToClient(client, { type: 'PONG', timestamp: new Date().toISOString() });
      } else if (data.action === 'BROADCAST' && data.payload) {
        this.broadcast(data.channel || 'general', data.payload.type || 'USER_EVENT', data.payload);
      }
    } catch (e) {
      console.warn('[WebSocket] Non-JSON payload received:', text);
    }
  }

  subscribeClientToChannel(client, channelName) {
    client.channels.add(channelName);
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
    }
    this.channels.get(channelName).add(client);
  }

  removeClient(client) {
    this.clients.delete(client);
    for (const channel of client.channels) {
      if (this.channels.has(channel)) {
        this.channels.get(channel).delete(client);
      }
    }
    try { client.socket.destroy(); } catch (e) {}
  }

  /**
   * Encodes and sends a JSON payload to a specific client socket
   */
  sendToClient(client, payload) {
    try {
      const message = JSON.stringify(payload);
      const frame = this.createWebSocketFrame(message);
      client.socket.write(frame);
    } catch (err) {
      this.removeClient(client);
    }
  }

  /**
   * Broadcasts an event to all clients or all clients in a specific channel
   */
  broadcast(channel, eventType, data = {}) {
    const event = {
      channel,
      eventType,
      data,
      timestamp: new Date().toISOString()
    };

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 50) this.eventHistory.pop();

    const targetClients = channel === 'all' 
      ? Array.from(this.clients)
      : Array.from(this.channels.get(channel) || []);

    const frame = this.createWebSocketFrame(JSON.stringify(event));

    targetClients.forEach(client => {
      try {
        client.socket.write(frame);
      } catch (err) {
        this.removeClient(client);
      }
    });

    return { deliveredCount: targetClients.length, event };
  }

  createWebSocketFrame(data) {
    const payload = Buffer.from(data, 'utf8');
    const length = payload.length;

    let header;
    if (length <= 125) {
      header = Buffer.alloc(2);
      header[0] = 0x81; // FIN + Text opcode
      header[1] = length;
    } else if (length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    return Buffer.concat([header, payload]);
  }

  sendPongFrame(socket) {
    try {
      socket.write(Buffer.from([0x8a, 0x00])); // Pong frame
    } catch (e) {}
  }

  getTelemetry() {
    return {
      connectedClientsCount: this.clients.size,
      activeChannels: Array.from(this.channels.keys()).map(name => ({
        channel: name,
        subscribers: this.channels.get(name)?.size || 0
      })),
      recentEvents: this.eventHistory.slice(0, 5)
    };
  }
}

export const WsGateway = new WebSocketGateway();
