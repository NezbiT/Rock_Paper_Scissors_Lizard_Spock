/** Protocolo WebSocket — chat (Chat-node) + juego RPSLS. */

export const MessageType = {
  JOIN: 'join',
  JOINED: 'joined',
  MESSAGE: 'message',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  HISTORY: 'history',
  USERS: 'users',
  ERROR: 'error',
  GAME_CPU: 'game_cpu',
  GAME_PVP_QUEUE: 'game_pvp_queue',
  GAME_PVP_CANCEL: 'game_pvp_cancel',
  GAME_MATCHED: 'game_matched',
  GAME_CHOICE: 'game_choice',
  GAME_ROUND: 'game_round',
  GAME_SCORES: 'game_scores',
};

export function createMessage(type, payload = {}) {
  return JSON.stringify({ type, payload, timestamp: Date.now() });
}

export function parseMessage(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data.type || typeof data.type !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}