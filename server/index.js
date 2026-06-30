import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { WebSocketServer } from './websocket.js';
import { ChatServer } from './chatServer.js';
import { GameServer } from './gameServer.js';
import { logger } from './logger.js';

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
  '.webmanifest': 'application/manifest+json',
};

function isUsableLanIp(address) {
  if (!address || address.startsWith('127.')) return false;
  // 169.254.x.x = link-local (APIPA), no sirve para LAN
  if (address.startsWith('169.254.')) return false;
  // Adaptadores virtuales típicos de Hyper-V / WSL
  if (address.startsWith('172.20.') || address.startsWith('172.17.')) return false;
  return true;
}

function getNetworkIPs() {
  const ips = [];
  for (const [name, interfaces] of Object.entries(os.networkInterfaces())) {
    const lower = name.toLowerCase();
    if (lower.includes('vethernet') || lower.includes('wsl') || lower.includes('hyper-v')) {
      continue;
    }
    for (const net of interfaces) {
      if (net.family === 'IPv4' && !net.internal && isUsableLanIp(net.address)) {
        ips.push({ address: net.address, interface: name });
      }
    }
  }
  return ips;
}

function getShareUrls(ips) {
  const entries = ips.map(({ address }) => `http://${address}:${PORT}`);
  const wifi = ips.find(({ interface: n }) => /wi-?fi|wlan/i.test(n));
  const ethernet = ips.find(({ interface: n }) => /ethernet/i.test(n) && !/vethernet/i.test(n));
  const preferred = wifi ?? ethernet ?? ips[0];
  return {
    networkUrls: entries,
    recommendedUrl: preferred ? `http://${preferred.address}:${PORT}` : null,
  };
}

function serveApiInfo(_req, res) {
  const ips = getNetworkIPs();
  const { networkUrls, recommendedUrl } = getShareUrls(ips);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    networkUrls,
    recommendedUrl,
  }));
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];

  if (urlPath === '/api/info') {
    serveApiInfo(req, res);
    return;
  }

  if (urlPath === '/api/health') {
    const ips = getNetworkIPs();
    const { recommendedUrl } = getShareUrls(ips);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      uptime: Math.floor(process.uptime()),
      online: chat.onlineUsers,
      wsClients: wss.clients.size,
      recommendedUrl,
    }));
    return;
  }

  if (urlPath === '/partials/status') {
    const n = chat.onlineUsers.length;
    const online = n ? chat.onlineUsers.join(', ') : 'nadie';
    const html = `<span class="status-ok">● En línea: ${n} (${online})</span>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(html);
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
      logger.warn('HTTP', '404', { path: urlPath });
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (ext === '.html' || ext === '.js' || ext === '.css') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }
    res.writeHead(200, headers);
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

server.on('error', (err) => {
  logger.error('HTTP', 'Error del servidor', { error: err.message });
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getNetworkIPs();
  const { networkUrls, recommendedUrl } = getShareUrls(ips);
  console.log('\n  RPSLS + Chat corriendo:\n');
  console.log(`  Local:       http://localhost:${PORT}`);
  if (recommendedUrl) {
    console.log(`  Compartir:   ${recommendedUrl}  ← usa esta en otra PC`);
  }
  for (const url of networkUrls) {
    if (url !== recommendedUrl) console.log(`  Red:         ${url}`);
  }
  console.log('\n  Ambas PCs deben estar en la misma red Wi-Fi.\n');
});