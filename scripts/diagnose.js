#!/usr/bin/env node
/** Diagnóstico de conexión HTTP + WebSocket + JOIN */

import http from 'http';
import crypto from 'crypto';

const HOST = process.argv[2] || '127.0.0.1';
const PORT = Number(process.argv[3] || 3000);
const USERNAME = `Diag_${Date.now().toString(36)}`;

const log = (step, ok, detail = '') => {
  const icon = ok ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${step}${detail ? ` — ${detail}` : ''}`);
};

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: HOST, port: PORT, path }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('HTTP timeout')); });
  });
}

function wsJoinTest() {
  return new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString('base64');
    const messages = [];
    const req = http.request({
      host: HOST,
      port: PORT,
      path: '/ws',
      headers: {
        Upgrade: 'websocket',
        Connection: 'Upgrade',
        'Sec-WebSocket-Key': key,
        'Sec-WebSocket-Version': '13',
      },
    });

    const timer = setTimeout(() => {
      socket?.destroy();
      reject(new Error(`WS timeout. Recibido: ${JSON.stringify(messages)}`));
    }, 8000);

    let socket;
    req.on('upgrade', (_res, sock) => {
      socket = sock;
      const join = JSON.stringify({
        type: 'join',
        payload: { username: USERNAME },
        timestamp: Date.now(),
      });
      const payload = Buffer.from(join, 'utf8');
      const frame = Buffer.alloc(2 + payload.length);
      frame[0] = 0x81;
      frame[1] = payload.length;
      payload.copy(frame, 2);
      sock.write(frame);

      sock.on('data', (buf) => {
        const len = buf[1] & 0x7f;
        const text = buf.subarray(2, 2 + len).toString();
        try {
          messages.push(JSON.parse(text));
        } catch {
          messages.push({ raw: text });
        }
        const types = messages.map((m) => m.type);
        if (types.includes('joined') || types.includes('history') || types.includes('error')) {
          clearTimeout(timer);
          sock.destroy();
          resolve(messages);
        }
      });
    });

    req.on('error', (e) => { clearTimeout(timer); reject(e); });
    req.end();
  });
}

async function main() {
  console.log(`\nDiagnóstico RPSLS → ${HOST}:${PORT}\n`);

  try {
    const info = await httpGet('/api/info');
    log('HTTP /api/info', info.status === 200, `status ${info.status}`);
    if (info.status === 200) {
      const data = JSON.parse(info.body);
      console.log('       ', JSON.stringify(data, null, 2).split('\n').join('\n        '));
    }
  } catch (e) {
    log('HTTP /api/info', false, e.message);
    process.exit(1);
  }

  try {
    const html = await httpGet('/');
    log('HTTP / (index)', html.status === 200, `status ${html.status}, ${html.body.length} bytes`);
    log('HTML tiene app.js', html.body.includes('app.js'), '');
    log('HTML tiene ws-status', html.body.includes('ws-status'), '');
  } catch (e) {
    log('HTTP /', false, e.message);
  }

  try {
    const msgs = await wsJoinTest();
    const types = msgs.map((m) => m.type);
    log('WebSocket conecta', true, `mensajes: ${types.join(', ')}`);

    const err = msgs.find((m) => m.type === 'error');
    if (err) {
      log('JOIN al servidor', false, err.payload?.message || 'error desconocido');
      console.log('\nDetalle:', JSON.stringify(msgs, null, 2));
      process.exit(1);
    }

    const joined = msgs.some((m) => m.type === 'joined' || m.type === 'history');
    log('JOIN al servidor', joined, joined ? `usuario: ${USERNAME}` : 'sin confirmación');
    console.log('\nRespuesta completa:');
    console.log(JSON.stringify(msgs, null, 2));
  } catch (e) {
    log('WebSocket + JOIN', false, e.message);
    process.exit(1);
  }

  console.log('\nDiagnóstico completado sin errores.\n');
}

main();