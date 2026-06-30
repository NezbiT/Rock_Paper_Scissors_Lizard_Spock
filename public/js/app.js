import { MessageType } from './protocol.js';
import { ChatClient } from './chatClient.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const CHOICES = [
  { id: 'rock', label: 'Piedra', emoji: '🪨' },
  { id: 'paper', label: 'Papel', emoji: '📄' },
  { id: 'scissors', label: 'Tijeras', emoji: '✂️' },
  { id: 'lizard', label: 'Lagarto', emoji: '🦎' },
  { id: 'spock', label: 'Spock', emoji: '🖖' },
];

const AVATAR_HUES = [220, 230, 240, 210, 330, 340, 120, 130, 200, 250];

let client = null;
let username = null;
let canChoose = false;
let currentMode = null;

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length];
  return `hsl(${hue}, 58%, 46%)`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showScreen(id) {
  $$('.screen').forEach((el) => el.classList.remove('screen--active'));
  $(`#${id}`)?.classList.add('screen--active');
}

function setStatus(text, variant = 'default') {
  const el = $('#game-status');
  if (!el) return;
  el.textContent = text;
  el.dataset.variant = variant;
}

function setChoicesEnabled(enabled) {
  canChoose = enabled;
  $$('.choice-btn').forEach((btn) => {
    btn.disabled = !enabled;
    btn.classList.toggle('choice-btn--disabled', !enabled);
  });
}

function renderScores(scores) {
  $('#score-wins').textContent = scores.wins;
  $('#score-losses').textContent = scores.losses;
  $('#score-draws').textContent = scores.draws;
}

function renderChoiceLabel(id) {
  const choice = CHOICES.find((c) => c.id === id);
  return choice ? `${choice.emoji} ${choice.label}` : id;
}

function showRoundResult(payload) {
  const arena = $('#arena-result');
  if (!arena) return;

  if (payload.status === 'finished') {
    arena.hidden = false;
    $('#player-choice').textContent = renderChoiceLabel(payload.playerChoice);
    $('#opponent-choice').textContent = renderChoiceLabel(payload.opponentChoice);
    const resultEl = $('#round-result');
    resultEl.textContent = payload.message;
    resultEl.dataset.result = payload.result ?? 'draw';
  } else {
    arena.hidden = payload.status !== 'finished';
  }
}

function hideEmptyChat() {
  $('#chat-empty')?.remove();
}

function appendChatMessage(msg) {
  hideEmptyChat();
  const container = $('#chat-messages');
  const isOwn = msg.username === username;
  const el = document.createElement('div');
  el.className = `chat-msg ${isOwn ? 'chat-msg--own' : ''}`;
  el.innerHTML = `
    <div class="chat-msg__avatar" style="background:${avatarColor(msg.username)}">${msg.username[0].toUpperCase()}</div>
    <div class="chat-msg__body">
      <div class="chat-msg__meta">
        <span class="chat-msg__author">${escapeHtml(msg.username)}</span>
        <span class="chat-msg__time">${formatTime(msg.timestamp)}</span>
      </div>
      <div class="chat-msg__text">${escapeHtml(msg.text)}</div>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function showChatSystem(text) {
  hideEmptyChat();
  const container = $('#chat-messages');
  const el = document.createElement('div');
  el.className = 'chat-system';
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function renderUsers(users) {
  const list = $('#users-list');
  const count = $('#users-count');
  if (!list) return;
  list.innerHTML = '';
  if (count) count.textContent = users.length;
  users.forEach((name) => {
    const li = document.createElement('li');
    if (name === username) li.classList.add('is-me');
    li.innerHTML = `
      <div class="user-avatar-sm" style="background:${avatarColor(name)}">${name[0].toUpperCase()}</div>
      <span class="user-dot"></span>
      <span>${escapeHtml(name)}${name === username ? ' (tú)' : ''}</span>
    `;
    list.appendChild(li);
  });
}

async function loadServerInfo() {
  try {
    const res = await fetch('/api/info');
    return await res.json();
  } catch {
    return { localUrl: location.origin, networkUrls: [] };
  }
}

function setupShareUrls(info) {
  const local = info.localUrl || location.origin;
  const network = info.networkUrls?.[0];
  const localEl = $('#share-url-local');
  const networkRow = $('#share-network-row');
  const networkEl = $('#share-url-network');
  if (localEl) localEl.textContent = local;
  if (network && networkRow && networkEl) {
    networkEl.textContent = network;
    networkRow.hidden = false;
  }
}

function setupCopyButtons() {
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const el = document.getElementById(btn.dataset.copy);
      if (!el) return;
      try {
        await navigator.clipboard.writeText(el.textContent);
        const original = btn.textContent;
        btn.textContent = '¡Copiado!';
        setTimeout(() => { btn.textContent = original; }, 1500);
      } catch {
        btn.textContent = 'Error';
      }
    });
  });
}

function renderChoiceButtons() {
  const grid = $('#choices-grid');
  grid.innerHTML = '';
  CHOICES.forEach((choice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn choice-btn--disabled';
    btn.disabled = true;
    btn.dataset.choice = choice.id;
    btn.innerHTML = `<span class="choice-btn__emoji">${choice.emoji}</span><span class="choice-btn__label">${choice.label}</span>`;
    btn.addEventListener('click', () => {
      if (!canChoose || !client) return;
      setChoicesEnabled(false);
      client.send(MessageType.GAME_CHOICE, { choice: choice.id });
      setStatus('Jugada enviada...', 'waiting');
    });
    grid.appendChild(btn);
  });
}

function setupGameControls() {
  $('#btn-cpu').addEventListener('click', () => {
    currentMode = 'cpu';
    $('#arena-result').hidden = true;
    client.send(MessageType.GAME_CPU);
    setStatus('Modo vs CPU — elige tu jugada', 'cpu');
    $$('.mode-btn').forEach((b) => b.classList.remove('mode-btn--active'));
    $('#btn-cpu').classList.add('mode-btn--active');
  });

  $('#btn-pvp').addEventListener('click', () => {
    currentMode = 'pvp';
    $('#arena-result').hidden = true;
    client.send(MessageType.GAME_PVP_QUEUE);
    setStatus('Buscando oponente...', 'pvp');
    setChoicesEnabled(false);
    $$('.mode-btn').forEach((b) => b.classList.remove('mode-btn--active'));
    $('#btn-pvp').classList.add('mode-btn--active');
  });

  $('#btn-cancel-pvp').addEventListener('click', () => {
    client.send(MessageType.GAME_PVP_CANCEL);
    setStatus('Búsqueda cancelada', 'default');
    setChoicesEnabled(false);
    $$('.mode-btn').forEach((b) => b.classList.remove('mode-btn--active'));
  });
}

async function initApp(name) {
  username = name;
  $('#current-user').textContent = name;

  const info = await loadServerInfo();
  setupShareUrls(info);
  setupCopyButtons();
  renderChoiceButtons();
  setupGameControls();

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  client = new ChatClient({ url: `${protocol}//${location.host}/ws` });

  client.on('history', (messages) => {
    messages.forEach((m) => appendChatMessage(m));
  });
  client.on('message', (msg) => appendChatMessage(msg));
  client.on('userJoined', (n) => {
    if (n !== username) showChatSystem(`${n} se unió`);
  });
  client.on('userLeft', (n) => showChatSystem(`${n} salió`));
  client.on('users', (users) => renderUsers(users));
  client.on('error', (msg) => {
    if (msg.includes('nombre')) {
      sessionStorage.removeItem('rpsls_username');
      showScreen('login-screen');
    } else {
      setStatus(msg, 'error');
    }
  });

  client.on('gameMatched', (payload) => {
    setStatus(`¡Oponente encontrado: ${payload.opponent}!`, 'pvp');
  });

  client.on('gameRound', (payload) => {
    if (payload.mode) currentMode = payload.mode;
    setStatus(payload.message, payload.status ?? 'default');
    showRoundResult(payload);

    if (payload.status === 'waiting_choice') {
      setChoicesEnabled(true);
    } else if (payload.status === 'queued') {
      setChoicesEnabled(false);
    } else if (payload.status === 'choice_locked') {
      setChoicesEnabled(false);
    } else if (payload.status === 'finished') {
      setChoicesEnabled(false);
    } else {
      setChoicesEnabled(false);
    }
  });

  client.on('gameScores', (scores) => renderScores(scores));

  try {
    await client.connect(name);
    setStatus('Conectado — elige un modo de juego', 'default');
  } catch {
    setStatus('Error de conexión. Reintentando...', 'error');
  }

  $('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    client.sendChat(text);
    input.value = '';
  });

  $('#leave-btn').addEventListener('click', () => {
    client.disconnect();
    sessionStorage.removeItem('rpsls_username');
    showScreen('login-screen');
  });
}

// Login
const loginForm = $('#login-form');
if (loginForm) {
  loadServerInfo().then(setupShareUrls);
  setupCopyButtons();

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#name-input').value.trim();
    if (!name) return;
    sessionStorage.setItem('rpsls_username', name);
    showScreen('game-screen');
    initApp(name);
  });

  const saved = sessionStorage.getItem('rpsls_username');
  if (saved) $('#name-input').value = saved;
}