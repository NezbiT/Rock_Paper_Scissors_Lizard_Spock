/* RPSLS — cliente ligero (WebSocket). HTMX maneja el resto de la UI. */
(() => {
  const MSG = {
    JOIN: 'join', JOINED: 'joined', MESSAGE: 'message', HISTORY: 'history',
    USERS: 'users', ERROR: 'error', GAME_CPU: 'game_cpu', GAME_PVP_QUEUE: 'game_pvp_queue',
    GAME_PVP_CANCEL: 'game_pvp_cancel', GAME_MATCHED: 'game_matched', GAME_CHOICE: 'game_choice',
    GAME_ROUND: 'game_round', GAME_SCORES: 'game_scores',
  };

  const CHOICES = [
    { id: 'rock', label: 'Piedra', emoji: '🪨' },
    { id: 'paper', label: 'Papel', emoji: '📄' },
    { id: 'scissors', label: 'Tijeras', emoji: '✂️' },
    { id: 'lizard', label: 'Lagarto', emoji: '🦎' },
    { id: 'spock', label: 'Spock', emoji: '🖖' },
  ];

  let ws = null, username = null, canChoose = false, joined = false, bound = false;

  const $ = (s) => document.querySelector(s);
  const send = (type, payload = {}) => {
    if (ws?.readyState === 1) ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
  };

  function setStatus(text, variant = 'default') {
    const el = $('#game-status');
    if (el) { el.textContent = text; el.dataset.variant = variant; }
  }

  function setLoginError(msg) {
    const el = $('#login-error');
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('screen--active'));
    document.getElementById(id)?.classList.add('screen--active');
  }

  function label(id) {
    const c = CHOICES.find((x) => x.id === id);
    return c ? `${c.emoji} ${c.label}` : id;
  }

  function setChoices(on) {
    canChoose = on;
    document.querySelectorAll('.choice-btn').forEach((b) => {
      b.disabled = !on;
      b.classList.toggle('choice-btn--off', !on);
    });
  }

  function renderScores(s) {
    if ($('#score-wins')) $('#score-wins').textContent = s.wins;
    if ($('#score-losses')) $('#score-losses').textContent = s.losses;
    if ($('#score-draws')) $('#score-draws').textContent = s.draws;
  }

  function renderUsers(users) {
    const list = $('#users-list');
    const count = $('#users-count');
    if (!list) return;
    if (count) count.textContent = users.length;
    list.innerHTML = users.map((n) =>
      `<li class="${n === username ? 'is-me' : ''}"><span class="dot"></span>${n}${n === username ? ' (tú)' : ''}</li>`
    ).join('');
  }

  function appendChat(m) {
    $('#chat-empty')?.remove();
    const box = $('#chat-messages');
    if (!box) return;
    const own = m.username === username;
    const div = document.createElement('div');
    div.className = `chat-bubble${own ? ' chat-bubble--own' : ''}`;
    div.innerHTML = `<strong>${m.username}</strong> ${m.text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function handleMsg(data) {
    const { type, payload } = data;
    switch (type) {
      case MSG.HISTORY:
        payload.messages?.forEach(appendChat);
        break;
      case MSG.MESSAGE:
        appendChat(payload);
        break;
      case MSG.USERS:
        renderUsers(payload.users);
        break;
      case MSG.ERROR:
        setStatus(payload.message, 'error');
        break;
      case MSG.GAME_SCORES:
        renderScores(payload.scores);
        break;
      case MSG.GAME_MATCHED:
        setStatus(`¡Oponente: ${payload.opponent}!`, 'pvp');
        break;
      case MSG.GAME_ROUND: {
        setStatus(payload.message, payload.status || 'default');
        if (payload.status === 'finished') {
          $('#arena-result').hidden = false;
          $('#player-choice').textContent = label(payload.playerChoice);
          $('#opponent-choice').textContent = label(payload.opponentChoice);
          const rr = $('#round-result');
          if (rr) { rr.textContent = payload.message; rr.dataset.result = payload.result || 'draw'; }
        }
        setChoices(payload.status === 'waiting_choice');
        break;
      }
      default: break;
    }
  }

  function connect(name) {
    return new Promise((resolve, reject) => {
      let done = false;
      const fail = (m) => { if (!done) { done = true; ws?.close(); reject(new Error(m)); } };
      const ok = () => { if (!done) { done = true; joined = true; resolve(); } };
      const timer = setTimeout(() => fail('Tiempo de espera agotado'), 10000);

      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${location.host}/ws`);

      ws.onopen = () => send(MSG.JOIN, { username: name });
      ws.onmessage = (e) => {
        let data;
        try { data = JSON.parse(e.data); } catch { return; }
        if (!joined && (data.type === MSG.JOINED || data.type === MSG.HISTORY || data.type === MSG.USERS)) {
          clearTimeout(timer); ok();
        }
        if (!joined && data.type === MSG.ERROR) { clearTimeout(timer); fail(data.payload?.message); return; }
        handleMsg(data);
      };
      ws.onerror = () => { clearTimeout(timer); fail('WebSocket bloqueado — revisa firewall'); };
      ws.onclose = () => { if (!joined && !done) { clearTimeout(timer); fail('Conexión cerrada'); } };
    });
  }

  function buildChoices() {
    const grid = $('#choices-grid');
    if (!grid) return;
    grid.innerHTML = CHOICES.map((c) =>
      `<button type="button" class="choice-btn choice-btn--off" data-choice="${c.id}" disabled>
        <span class="choice-btn__e">${c.emoji}</span><span>${c.label}</span>
      </button>`
    ).join('');
    grid.onclick = (e) => {
      const btn = e.target.closest('[data-choice]');
      if (!btn || !canChoose) return;
      setChoices(false);
      send(MSG.GAME_CHOICE, { choice: btn.dataset.choice });
      setStatus('Jugada enviada…', 'waiting');
    };
  }

  function bindGame() {
    if (bound) return;
    bound = true;
    $('#btn-cpu')?.addEventListener('click', () => {
      send(MSG.GAME_CPU);
      setStatus('Modo vs CPU — elige jugada', 'cpu');
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      $('#btn-cpu')?.classList.add('active');
    });
    $('#btn-pvp')?.addEventListener('click', () => {
      send(MSG.GAME_PVP_QUEUE);
      setStatus('Buscando oponente…', 'pvp');
      setChoices(false);
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      $('#btn-pvp')?.classList.add('active');
    });
    $('#btn-cancel-pvp')?.addEventListener('click', () => {
      send(MSG.GAME_PVP_CANCEL);
      setStatus('Búsqueda cancelada', 'default');
      setChoices(false);
    });
    $('#chat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('#chat-input');
      const t = inp?.value.trim();
      if (t) { send(MSG.MESSAGE, { text: t }); inp.value = ''; }
    });
    $('#leave-btn')?.addEventListener('click', () => {
      joined = false;
      ws?.close(); ws = null;
      sessionStorage.removeItem('rpsls_user');
      showScreen('login-screen');
    });
  }

  async function enterGame(name) {
    username = name;
    if ($('#current-user')) $('#current-user').textContent = name;
    if (!bound) { buildChoices(); bindGame(); }
    await connect(name);
    setStatus('Conectado — elige modo de juego', 'default');
    setChoices(false);
    showScreen('game-screen');
  }

  // PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Login
  $('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#name-input')?.value.trim();
    const btn = $('#login-btn');
    if (!name) return;
    setLoginError('');
    btn.disabled = true;
    btn.textContent = 'Conectando…';
    try {
      sessionStorage.setItem('rpsls_user', name);
      await enterGame(name);
    } catch (err) {
      joined = false;
      ws?.close(); ws = null;
      sessionStorage.removeItem('rpsls_user');
      setLoginError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar a la sala';
    }
  });

  const saved = sessionStorage.getItem('rpsls_user');
  if (saved && $('#name-input')) $('#name-input').value = saved;

  // Share URL
  fetch('/api/info').then((r) => r.json()).then((info) => {
    const el = $('#share-url');
    if (el) el.textContent = info.recommendedUrl || info.localUrl || location.origin;
  }).catch(() => {});

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = document.getElementById(btn.dataset.copy)?.textContent;
      if (t) navigator.clipboard.writeText(t);
    });
  });
})();