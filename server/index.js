import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { WebSocketServer } from './websocket.js';
import { ChatServer } from './chatServer.js';
import { GameServer } from './gameServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getNetworkIPs() {
  const ips = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

function serveApiInfo(_req, res) {
  const ips = getNetworkIPs();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    networkUrls: ips.map((ip) => `http://${ip}:${PORT}`),
  }));
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];

  if (urlPath === '/api/info') {
    serveApiInfo(req, res);
    return;
  }

  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const chat = new ChatServer();
const game = new GameServer(chat);
chat.gameServer = game;

const server = http.createServer(serveStatic);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => chat.handleConnection(ws));

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  const ips = getNetworkIPs();
  console.log('\n  RPSLS + Chat corriendo:\n');
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const ip of ips) {
    console.log(`  Red:     http://${ip}:${PORT}`);
  }
  console.log('\n  Comparte la URL de red para jugar y chatear en multijugador.\n');
});