import { MessageType, createMessage } from './protocol.js';

const MAX_HISTORY = 100;

const GAME_TYPES = new Set([
  MessageType.GAME_CPU,
  MessageType.GAME_PVP_QUEUE,
  MessageType.GAME_PVP_CANCEL,
  MessageType.GAME_CHOICE,
]);

/** Chat reutilizable — basado en github.com/NezbiT/Chat-node */
export class ChatServer {
  constructor(options = {}) {
    this.maxHistory = options.maxHistory ?? MAX_HISTORY;
    this.gameServer = options.gameServer ?? null;
    this.clients = new Map();
    this.history = [];
  }

  get onlineUsers() {
    return [...this.clients.values()].map((c) => c.username);
  }

  handleConnection(ws) {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      const msg = typeof raw === 'string' ? raw : raw.toString();
      this.#handleRawMessage(ws, msg);
    });

    ws.on('close', () => this.#handleDisconnect(ws));
    ws.on('error', () => this.#handleDisconnect(ws));
  }

  #handleRawMessage(ws, raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      this.#send(ws, MessageType.ERROR, { message: 'JSON inválido' });
      return;
    }

    if (data.type === MessageType.JOIN) {
      this.#handleJoin(ws, data.payload);
      return;
    }

    if (!ws.username) {
      this.#send(ws, MessageType.ERROR, { message: 'Debes unirte primero con tu nombre' });
      return;
    }

    if (data.type === MessageType.MESSAGE) {
      this.#handleChatMessage(ws, data.payload);
      return;
    }

    if (GAME_TYPES.has(data.type) && this.gameServer) {
      this.gameServer.handleMessage(ws, data);
    }
  }

  #handleJoin(ws, payload) {
    const username = String(payload?.username ?? '').trim();

    if (!username || username.length > 24) {
      this.#send(ws, MessageType.ERROR, { message: 'Nombre inválido (1-24 caracteres)' });
      return;
    }

    if (this.onlineUsers.includes(username)) {
      this.#send(ws, MessageType.ERROR, { message: 'Ese nombre ya está en uso' });
      return;
    }

    ws.username = username;
    this.clients.set(ws, { username, joinedAt: Date.now() });

    this.#send(ws, MessageType.HISTORY, { messages: this.history });
    this.#send(ws, MessageType.USERS, { users: this.onlineUsers });
    this.broadcast(MessageType.USER_JOINED, { username }, ws);
  }

  #handleChatMessage(ws, payload) {
    const text = String(payload?.text ?? '').trim();
    if (!text || text.length > 2000) return;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      username: ws.username,
      text,
      timestamp: Date.now(),
    };

    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.broadcast(MessageType.MESSAGE, entry);
  }

  #handleDisconnect(ws) {
    this.gameServer?.handleDisconnect(ws);

    if (!ws.username) return;

    const { username } = ws;
    this.clients.delete(ws);
    this.broadcast(MessageType.USER_LEFT, { username });
    this.broadcast(MessageType.USERS, { users: this.onlineUsers });
  }

  broadcast(type, payload, excludeWs = null) {
    const message = createMessage(type, payload);
    for (const client of this.clients.keys()) {
      if (client !== excludeWs && client.readyState === 1) {
        client.send(message);
      }
    }
  }

  sendTo(ws, type, payload) {
    this.#send(ws, type, payload);
  }

  #send(ws, type, payload) {
    if (ws.readyState === 1) {
      ws.send(createMessage(type, payload));
    }
  }
}