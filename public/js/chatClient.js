import { MessageType } from './protocol.js';

/** Cliente de chat — de github.com/NezbiT/Chat-node */
export class ChatClient extends EventTarget {
  constructor({ url, reconnect = true, reconnectDelay = 2000 } = {}) {
    super();
    this.url = url;
    this.reconnect = reconnect;
    this.reconnectDelay = reconnectDelay;
    this.ws = null;
    this.username = null;
    this._shouldReconnect = false;
  }

  connect(username) {
    this.username = username;
    this._shouldReconnect = true;
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.#send(MessageType.JOIN, { username });
        this.#emit('connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        this.#handleServerMessage(data);
      };

      this.ws.onclose = () => {
        this.#emit('disconnected');
        if (this._shouldReconnect) {
          setTimeout(() => {
            if (this._shouldReconnect && this.username) {
              this.connect(this.username).catch(() => {});
            }
          }, this.reconnectDelay);
        }
      };

      this.ws.onerror = () => reject(new Error('No se pudo conectar'));
    });
  }

  send(type, payload = {}) {
    this.#send(type, payload);
  }

  sendChat(text) {
    this.#send(MessageType.MESSAGE, { text });
  }

  disconnect() {
    this._shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get socket() {
    return this.ws;
  }

  #handleServerMessage({ type, payload }) {
    switch (type) {
      case MessageType.HISTORY:
        this.#emit('history', payload.messages);
        break;
      case MessageType.MESSAGE:
        this.#emit('message', payload);
        break;
      case MessageType.USER_JOINED:
        this.#emit('userJoined', payload.username);
        break;
      case MessageType.USER_LEFT:
        this.#emit('userLeft', payload.username);
        break;
      case MessageType.USERS:
        this.#emit('users', payload.users);
        break;
      case MessageType.ERROR:
        this.#emit('error', payload.message);
        break;
      case MessageType.GAME_MATCHED:
        this.#emit('gameMatched', payload);
        break;
      case MessageType.GAME_ROUND:
        this.#emit('gameRound', payload);
        break;
      case MessageType.GAME_SCORES:
        this.#emit('gameScores', payload.scores);
        break;
      default:
        break;
    }
  }

  #send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }

  on(event, handler) {
    this.addEventListener(event, (e) => handler(e.detail));
    return this;
  }

  #emit(event, detail) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }
}