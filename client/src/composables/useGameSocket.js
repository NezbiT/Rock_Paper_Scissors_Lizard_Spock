import { reactive } from 'vue';
import { MSG, wsUrl } from '../constants.js';

export function useGameSocket() {
  const game = reactive({
    connected: false,
    connecting: false,
    error: '',
    status: { text: '', variant: 'default' },
    scores: { wins: 0, losses: 0, draws: 0 },
    users: [],
    messages: [],
    canChoose: false,
    round: null,
    activeMode: null,
  });

  let ws = null;
  let joined = false;

  const send = (type, payload = {}) => {
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  };

  const handle = ({ type, payload }) => {
    switch (type) {
      case MSG.HISTORY:
        game.messages = payload.messages || [];
        break;
      case MSG.MESSAGE:
        game.messages.push(payload);
        break;
      case MSG.USERS:
        game.users = payload.users || [];
        break;
      case MSG.ERROR:
        game.status = { text: payload.message, variant: 'error' };
        break;
      case MSG.GAME_SCORES:
        Object.assign(game.scores, payload.scores);
        break;
      case MSG.GAME_MATCHED:
        game.status = { text: `¡Oponente: ${payload.opponent}!`, variant: 'pvp' };
        break;
      case MSG.GAME_ROUND:
        if (payload.mode) game.activeMode = payload.mode;
        game.status = { text: payload.message, variant: payload.status || 'default' };
        if (payload.status === 'finished') {
          game.round = {
            playerChoice: payload.playerChoice,
            opponentChoice: payload.opponentChoice,
            result: payload.result,
            message: payload.message,
          };
        }
        game.canChoose = payload.status === 'waiting_choice';
        break;
      default:
        break;
    }
  };

  game.connect = (username) => {
    game.connecting = true;
    game.error = '';
    joined = false;

    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        game.connecting = false;
        game.connected = false;
        game.error = msg;
        ws?.close();
        reject(new Error(msg));
      };
      const ok = () => {
        if (settled) return;
        settled = true;
        joined = true;
        game.connected = true;
        game.connecting = false;
        game.status = { text: 'Conectado — elige modo de juego', variant: 'default' };
        resolve();
      };

      const timer = setTimeout(() => fail('Tiempo de espera agotado'), 12000);
      ws = new WebSocket(wsUrl());

      ws.onopen = () => send(MSG.JOIN, { username });
      ws.onmessage = (e) => {
        let data;
        try { data = JSON.parse(e.data); } catch { return; }
        if (!joined && (data.type === MSG.JOINED || data.type === MSG.HISTORY || data.type === MSG.USERS)) {
          clearTimeout(timer);
          ok();
        }
        if (!joined && data.type === MSG.ERROR) {
          clearTimeout(timer);
          fail(data.payload?.message || 'Error al entrar');
          return;
        }
        handle(data);
      };
      ws.onerror = () => { clearTimeout(timer); fail('No se pudo conectar al backend'); };
      ws.onclose = () => {
        if (!joined && !settled) { clearTimeout(timer); fail('Conexión cerrada'); }
        else game.connected = false;
      };
    });
  };

  game.disconnect = () => {
    joined = false;
    game.connected = false;
    ws?.close();
    ws = null;
  };

  game.startCpu = () => { send(MSG.GAME_CPU); game.activeMode = 'cpu'; game.round = null; };
  game.startPvp = () => { send(MSG.GAME_PVP_QUEUE); game.activeMode = 'pvp'; game.round = null; game.canChoose = false; };
  game.cancelPvp = () => { send(MSG.GAME_PVP_CANCEL); game.activeMode = null; };
  game.pick = (choice) => {
    send(MSG.GAME_CHOICE, { choice });
    game.canChoose = false;
    game.status = { text: 'Jugada enviada…', variant: 'waiting' };
  };
  game.sendChat = (text) => send(MSG.MESSAGE, { text });

  return game;
}