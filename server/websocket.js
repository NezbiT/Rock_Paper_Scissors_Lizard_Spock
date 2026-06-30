import crypto from 'crypto';
import { EventEmitter } from 'events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export const ReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

/** WebSocket server sin dependencias — de github.com/NezbiT/Chat-node */
export class WebSocket extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.readyState = ReadyState.OPEN;
    this.isAlive = true;
    this._buffer = Buffer.alloc(0);
    this._closed = false;

    socket.on('data', (chunk) => this.#onData(chunk));
    socket.on('close', () => this.#close(ReadyState.CLOSED));
    socket.on('error', () => this.terminate());
  }

  send(data) {
    if (this.readyState !== ReadyState.OPEN) return;
    const payload = Buffer.from(data, 'utf8');
    this.socket.write(this.#encodeFrame(payload, 0x1));
  }

  ping() {
    if (this.readyState !== ReadyState.OPEN) return;
    this.socket.write(this.#encodeFrame(Buffer.alloc(0), 0x9));
  }

  pong() {
    if (this.readyState !== ReadyState.OPEN) return;
    this.socket.write(this.#encodeFrame(Buffer.alloc(0), 0xA));
  }

  close(code = 1000, reason = '') {
    if (this.readyState === ReadyState.CLOSED || this.readyState === ReadyState.CLOSING) return;
    this.readyState = ReadyState.CLOSING;
    const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
    payload.writeUInt16BE(code, 0);
    if (reason) payload.write(reason, 2);
    this.socket.write(this.#encodeFrame(payload, 0x8));
    this.#close(ReadyState.CLOSED);
  }

  terminate() {
    if (this._closed) return;
    this.socket.destroy();
    this.#close(ReadyState.CLOSED);
  }

  #onData(chunk) {
    this._buffer = Buffer.concat([this._buffer, chunk]);

    while (this._buffer.length >= 2) {
      const parsed = this.#decodeFrame(this._buffer);
      if (!parsed) break;
      this._buffer = this._buffer.subarray(parsed.consumed);

      if (parsed.opcode === 0x1) {
        this.emit('message', parsed.payload.toString('utf8'));
      } else if (parsed.opcode === 0x9) {
        this.pong();
      } else if (parsed.opcode === 0xA) {
        this.isAlive = true;
        this.emit('pong');
      } else if (parsed.opcode === 0x8) {
        this.close();
      }
    }
  }

  #encodeFrame(payload, opcode) {
    const len = payload.length;
    let header;

    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }

    header[0] = 0x80 | opcode;
    return Buffer.concat([header, payload]);
  }

  #decodeFrame(buffer) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    const masked = (b1 & 0x80) !== 0;
    let offset = 2;
    let length = b1 & 0x7f;

    if (length === 126) {
      if (buffer.length < 4) return null;
      length = buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (buffer.length < 10) return null;
      length = Number(buffer.readBigUInt64BE(2));
      offset = 10;
    }

    const maskLen = masked ? 4 : 0;
    if (buffer.length < offset + maskLen + length) return null;

    let payload = buffer.subarray(offset + maskLen, offset + maskLen + length);

    if (masked) {
      const mask = buffer.subarray(offset, offset + 4);
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= mask[i % 4];
      }
    }

    return { opcode: b0 & 0x0f, payload, consumed: offset + maskLen + length };
  }

  #close(state) {
    if (this._closed) return;
    this._closed = true;
    this.readyState = state;
    this.emit('close');
  }
}

export class WebSocketServer extends EventEmitter {
  constructor({ server, path = '/ws' }) {
    super();
    this.path = path;
    this.clients = new Set();

    server.on('upgrade', (req, socket, head) => {
      if (req.url?.split('?')[0] !== this.path) {
        socket.destroy();
        return;
      }

      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.destroy();
        return;
      }

      const accept = crypto
        .createHash('sha1')
        .update(key + GUID)
        .digest('base64');

      const response = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
        '',
        '',
      ].join('\r\n');

      socket.write(response);
      if (head.length) socket.write(head);

      const ws = new WebSocket(socket);
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      this.emit('connection', ws);
    });
  }
}