import { MessageType } from './protocol.js';
import {
  applyResult,
  determineWinner,
  emptyScore,
  isValidChoice,
  randomChoice,
} from './rpsls.js';

const ROUND_TIMEOUT_MS = 30000;

/** Multijugador y vs CPU sobre el mismo WebSocket del chat. */
export class GameServer {
  constructor(chatServer) {
    this.chat = chatServer;
    this.scores = new Map();
    this.queue = [];
    this.matches = new Map();
    this.cpuSessions = new Map();
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case MessageType.GAME_CPU:
        this.#startCpu(ws);
        break;
      case MessageType.GAME_PVP_QUEUE:
        this.#joinQueue(ws);
        break;
      case MessageType.GAME_PVP_CANCEL:
        this.#leaveQueue(ws);
        break;
      case MessageType.GAME_CHOICE:
        this.#handleChoice(ws, data.payload);
        break;
      default:
        break;
    }
  }

  handleDisconnect(ws) {
    this.#leaveQueue(ws);
    this.#cleanupMatch(ws);
    this.cpuSessions.delete(ws);
  }

  getScore(username) {
    if (!this.scores.has(username)) {
      this.scores.set(username, emptyScore());
    }
    return this.scores.get(username);
  }

  #sendScores(ws) {
    this.chat.sendTo(ws, MessageType.GAME_SCORES, {
      scores: this.getScore(ws.username),
    });
  }

  #startCpu(ws) {
    this.#leaveQueue(ws);
    this.#cleanupMatch(ws);
    this.cpuSessions.set(ws, { waiting: true });
    this.#sendScores(ws);
    this.chat.sendTo(ws, MessageType.GAME_ROUND, {
      mode: 'cpu',
      status: 'waiting_choice',
      message: 'Elige tu jugada contra la CPU.',
    });
  }

  #joinQueue(ws) {
    if (!ws.username) return;

    this.cpuSessions.delete(ws);
    this.#cleanupMatch(ws);

    if (this.queue.includes(ws)) {
      this.chat.sendTo(ws, MessageType.GAME_ROUND, {
        mode: 'pvp',
        status: 'queued',
        message: 'Buscando oponente...',
      });
      return;
    }

    if (this.queue.length > 0) {
      const opponent = this.queue.shift();
      if (!opponent.username || opponent.readyState !== 1) {
        this.#joinQueue(ws);
        return;
      }
      this.#createMatch(opponent, ws);
      return;
    }

    this.queue.push(ws);
    this.chat.sendTo(ws, MessageType.GAME_ROUND, {
      mode: 'pvp',
      status: 'queued',
      message: 'Buscando oponente...',
    });
  }

  #leaveQueue(ws) {
    this.queue = this.queue.filter((client) => client !== ws);
  }

  #createMatch(playerA, playerB) {
    const matchId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const match = {
      id: matchId,
      players: [playerA, playerB],
      choices: new Map(),
      timeout: null,
    };

    this.matches.set(playerA, match);
    this.matches.set(playerB, match);

    for (const player of match.players) {
      this.chat.sendTo(player, MessageType.GAME_MATCHED, {
        matchId,
        opponent: match.players.find((p) => p !== player)?.username,
      });
      this.#sendScores(player);
      this.chat.sendTo(player, MessageType.GAME_ROUND, {
        mode: 'pvp',
        status: 'waiting_choice',
        opponent: match.players.find((p) => p !== player)?.username,
        message: 'Ambos deben elegir. ¡Que gane el mejor!',
      });
    }

    match.timeout = setTimeout(() => this.#resolveTimeout(match), ROUND_TIMEOUT_MS);
  }

  #handleChoice(ws, payload) {
    const choice = String(payload?.choice ?? '').toLowerCase();
    if (!isValidChoice(choice)) {
      this.chat.sendTo(ws, MessageType.ERROR, { message: 'Jugada inválida' });
      return;
    }

    if (this.cpuSessions.has(ws)) {
      this.#resolveCpu(ws, choice);
      return;
    }

    const match = this.matches.get(ws);
    if (!match) {
      this.chat.sendTo(ws, MessageType.ERROR, { message: 'No hay partida activa' });
      return;
    }

    match.choices.set(ws, choice);
    this.chat.sendTo(ws, MessageType.GAME_ROUND, {
      mode: 'pvp',
      status: 'choice_locked',
      message: 'Jugada registrada. Esperando al oponente...',
    });

    if (match.choices.size === match.players.length) {
      this.#resolvePvp(match);
    }
  }

  #resolveCpu(ws, playerChoice) {
    const cpuChoice = randomChoice();
    const result = determineWinner(playerChoice, cpuChoice);
    const score = applyResult(this.getScore(ws.username), result);

    this.chat.sendTo(ws, MessageType.GAME_ROUND, {
      mode: 'cpu',
      status: 'finished',
      playerChoice,
      opponentChoice: cpuChoice,
      result,
      message: this.#resultMessage(result),
    });
    this.chat.sendTo(ws, MessageType.GAME_SCORES, { scores: score });

    this.cpuSessions.set(ws, { waiting: true });
    this.chat.sendTo(ws, MessageType.GAME_ROUND, {
      mode: 'cpu',
      status: 'waiting_choice',
      message: 'Elige otra jugada para la siguiente ronda.',
    });
  }

  #resolvePvp(match) {
    if (match.timeout) clearTimeout(match.timeout);

    const [playerA, playerB] = match.players;
    const choiceA = match.choices.get(playerA);
    const choiceB = match.choices.get(playerB);
    const resultA = determineWinner(choiceA, choiceB);
    const resultB = resultA === 'draw' ? 'draw' : resultA === 'win' ? 'lose' : 'win';

    const scoreA = applyResult(this.getScore(playerA.username), resultA);
    const scoreB = applyResult(this.getScore(playerB.username), resultB);

    for (const [player, payload] of [
      [playerA, { playerChoice: choiceA, opponentChoice: choiceB, result: resultA, opponent: playerB.username }],
      [playerB, { playerChoice: choiceB, opponentChoice: choiceA, result: resultB, opponent: playerA.username }],
    ]) {
      if (player.readyState !== 1) continue;
      this.chat.sendTo(player, MessageType.GAME_ROUND, {
        mode: 'pvp',
        status: 'finished',
        ...payload,
        message: this.#resultMessage(payload.result),
      });
      this.chat.sendTo(player, MessageType.GAME_SCORES, {
        scores: player === playerA ? scoreA : scoreB,
      });
    }

    match.choices.clear();
    match.timeout = setTimeout(() => this.#resolveTimeout(match), ROUND_TIMEOUT_MS);

    for (const player of match.players) {
      if (player.readyState !== 1) continue;
      this.chat.sendTo(player, MessageType.GAME_ROUND, {
        mode: 'pvp',
        status: 'waiting_choice',
        opponent: match.players.find((p) => p !== player)?.username,
        message: 'Nueva ronda — elige tu jugada.',
      });
    }
  }

  #resolveTimeout(match) {
    for (const player of match.players) {
      this.#cleanupMatch(player);
      if (player.readyState === 1) {
        this.chat.sendTo(player, MessageType.GAME_ROUND, {
          mode: 'pvp',
          status: 'timeout',
          message: 'La ronda expiró. Vuelve a buscar oponente.',
        });
      }
    }
  }

  #cleanupMatch(ws) {
    const match = this.matches.get(ws);
    if (!match) return;

    if (match.timeout) clearTimeout(match.timeout);
    for (const player of match.players) {
      this.matches.delete(player);
    }
  }

  #resultMessage(result) {
    if (result === 'win') return '¡Ganaste la ronda!';
    if (result === 'lose') return 'Perdiste la ronda.';
    return 'Empate.';
  }
}